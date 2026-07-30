import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  buildHeaderMapping,
  type CanonicalField,
  type HeaderMapping,
} from "./constants";
import { parseDateInput } from "./dates";

const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..

export type RawImportCell = {
  value: unknown;
  text: string;
  hasFormula: boolean;
};

export type ParsedWorkbookRow = {
  sourceRowNumber: number;
  cells: Partial<Record<CanonicalField, RawImportCell>>;
};

export type ParsedWorkbook = {
  worksheetName: string;
  headers: string[];
  mapping: HeaderMapping;
  rows: ParsedWorkbookRow[];
  sha256: string;
  fileSize: number;
  filename: string;
};

export type ParseFileError = {
  code: "IMPORT_FILE_INVALID" | "IMPORT_FILE_TOO_LARGE" | "IMPORT_VALIDATION_FAILED";
  message: string;
};

function sanitizeFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "upload.xlsx";
  return base.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180);
}

function cellHasFormula(cell: ExcelJS.Cell): boolean {
  const v = cell.value as unknown;
  if (v && typeof v === "object" && "formula" in (v as object)) {
    return true;
  }
  return Boolean(cell.formula);
}

function extractCell(cell: ExcelJS.Cell): RawImportCell {
  const hasFormula = cellHasFormula(cell);
  const text = typeof cell.text === "string" ? cell.text : "";
  let value: unknown = cell.value;
  if (value && typeof value === "object" && "result" in (value as object) && !hasFormula) {
    value = (value as { result: unknown }).result;
  }
  if (value && typeof value === "object" && "formula" in (value as object)) {
    // Do not use cached result for authoritative value when formula present
    value = null;
  }
  if (value instanceof Date) {
    return { value, text, hasFormula };
  }
  if (typeof value === "number" || typeof value === "string" || value === null || value === undefined) {
    return { value: value ?? "", text, hasFormula };
  }
  return { value: text, text, hasFormula };
}

function sheetIsNonEmpty(sheet: ExcelJS.Worksheet): boolean {
  let found = false;
  sheet.eachRow({ includeEmpty: false }, () => {
    found = true;
  });
  return found;
}

export async function parseAssignmentXlsx(input: {
  buffer: Buffer;
  filename: string;
}): Promise<{ ok: true; data: ParsedWorkbook } | { ok: false; error: ParseFileError }> {
  const filename = sanitizeFilename(input.filename);
  const lower = filename.toLowerCase();

  if (!lower.endsWith(".xlsx")) {
    return {
      ok: false,
      error: {
        code: "IMPORT_FILE_INVALID",
        message: "Only .xlsx files are supported.",
      },
    };
  }
  if (lower.endsWith(".xlsm") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
    return {
      ok: false,
      error: { code: "IMPORT_FILE_INVALID", message: "Unsupported file type." },
    };
  }

  if (input.buffer.byteLength > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      error: {
        code: "IMPORT_FILE_TOO_LARGE",
        message: `File exceeds ${MAX_IMPORT_BYTES} bytes.`,
      },
    };
  }

  if (
    input.buffer.byteLength < 4 ||
    !input.buffer.subarray(0, 4).equals(XLSX_MAGIC)
  ) {
    return {
      ok: false,
      error: {
        code: "IMPORT_FILE_INVALID",
        message: "File is not a valid XLSX (OOXML) workbook.",
      },
    };
  }

  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  const workbook = new ExcelJS.Workbook();
  try {
    // ExcelJS load typings conflict with Node Buffer generics; runtime accepts Buffer.
    await workbook.xlsx.load(
      input.buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0],
    );
  } catch {
    return {
      ok: false,
      error: {
        code: "IMPORT_FILE_INVALID",
        message: "Malformed or encrypted workbook could not be opened.",
      },
    };
  }

  const nonEmpty = workbook.worksheets.filter((s) => sheetIsNonEmpty(s));
  if (nonEmpty.length === 0) {
    return {
      ok: false,
      error: {
        code: "IMPORT_VALIDATION_FAILED",
        message: "Workbook has no non-empty worksheet.",
      },
    };
  }
  if (nonEmpty.length > 1) {
    return {
      ok: false,
      error: {
        code: "IMPORT_VALIDATION_FAILED",
        message: "Workbook must contain exactly one non-empty worksheet.",
      },
    };
  }

  const sheet = nonEmpty[0]!;
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cell.text ?? "").trim();
  });

  const { mapping, errors } = buildHeaderMapping(headers);
  if (errors.length > 0) {
    return {
      ok: false,
      error: {
        code: "IMPORT_VALIDATION_FAILED",
        message: errors.join(" "),
      },
    };
  }

  const rows: ParsedWorkbookRow[] = [];
  let trailingEmpty = true;
  const collected: ParsedWorkbookRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const cells: ParsedWorkbookRow["cells"] = {};
    let any = false;
    (Object.keys(mapping) as CanonicalField[]).forEach((field) => {
      const col = mapping[field];
      if (col === undefined) return;
      const cell = extractCell(row.getCell(col + 1));
      cells[field] = cell;
      if (cell.text.trim() !== "" || (cell.value !== "" && cell.value !== null && cell.value !== undefined)) {
        any = true;
      }
    });
    if (!any) {
      return;
    }
    trailingEmpty = false;
    collected.push({ sourceRowNumber: rowNumber, cells });
  });

  // Drop trailing empties already skipped; enforce max
  if (collected.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: {
        code: "IMPORT_VALIDATION_FAILED",
        message: `Too many data rows (max ${MAX_IMPORT_ROWS}).`,
      },
    };
  }

  void trailingEmpty;
  rows.push(...collected);

  if (rows.length === 0) {
    return {
      ok: false,
      error: {
        code: "IMPORT_VALIDATION_FAILED",
        message: "No data rows found.",
      },
    };
  }

  return {
    ok: true,
    data: {
      worksheetName: sheet.name,
      headers,
      mapping,
      rows,
      sha256,
      fileSize: input.buffer.byteLength,
      filename,
    },
  };
}

export function readDateFromCell(cell: RawImportCell | undefined): {
  iso: string | null;
  error?: string;
  formulaRejected?: boolean;
} {
  if (!cell) {
    return { iso: null };
  }
  if (cell.hasFormula) {
    return { iso: null, formulaRejected: true, error: "Formula not allowed in required date field." };
  }
  return parseDateInput(cell.value !== "" && cell.value !== null ? cell.value : cell.text);
}
