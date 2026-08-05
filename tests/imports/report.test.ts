import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { canManageMasterData } from "@/lib/auth/roles";
import { toDbValidationStatus } from "@/lib/imports/assignments/constants";
import {
  ERROR_REPORT_COLUMNS,
  buildErrorReportFilename,
  buildImportErrorReportWorkbook,
  errorReportRowValues,
  escapeExcelFormula,
  finalRowStatus,
  formatErrorList,
  shouldIncludeInErrorReport,
  type ErrorReportRow,
} from "@/lib/imports/assignments/report";

const job = { id: "11111111-2222-3333-4444-555555555555", source_filename: "sample.xlsx" };

function sampleRow(overrides: Partial<ErrorReportRow> = {}): ErrorReportRow {
  return {
    source_row_number: 2,
    validation_status: "invalid",
    persistence_status: "pending",
    validation_errors: [{ code: "VEHICLE_NOT_FOUND", message: "Vehicle missing" }],
    validation_warnings: [],
    persistence_errors: [],
    normalized_payload: {
      registrationDisplay: "ABC-1",
      driverDisplay: "Max",
      customerDisplay: "Acme",
      validFrom: "2026-07-01",
      validUntil: null,
      notes: "n",
      registrationNormalized: "ABC1",
      driverNormalized: "max",
      customerNormalized: "acme",
      notesNormalized: "n",
    },
    assignment_id: null,
    driver_id: null,
    customer_id: null,
    created_at: "2026-07-30T10:00:00.000Z",
    persisted_at: null,
    ...overrides,
  };
}

describe("PACK-004 formula injection escape", () => {
  it.each(["=", "+", "-", "@"] as const)("prefixes leading %s", (prefix) => {
    expect(escapeExcelFormula(`${prefix}CMD`)).toBe(`'${prefix}CMD`);
  });

  it("prefixes after leading whitespace", () => {
    expect(escapeExcelFormula("  =1+1")).toBe("'  =1+1");
  });

  it("leaves safe text unchanged", () => {
    expect(escapeExcelFormula("ABC-123")).toBe("ABC-123");
  });
});

describe("PACK-004 error report inclusion and columns", () => {
  it("includes invalid and failed persistence rows only", () => {
    expect(shouldIncludeInErrorReport(sampleRow())).toBe(true);
    expect(
      shouldIncludeInErrorReport(
        sampleRow({ validation_status: "valid", persistence_status: "failed" }),
      ),
    ).toBe(true);
    expect(
      shouldIncludeInErrorReport(
        sampleRow({ validation_status: "valid", persistence_status: "persisted" }),
      ),
    ).toBe(false);
    expect(
      shouldIncludeInErrorReport(
        sampleRow({ validation_status: "valid", persistence_status: "skipped" }),
      ),
    ).toBe(false);
  });

  it("uses deterministic column order", () => {
    expect([...ERROR_REPORT_COLUMNS]).toEqual([
      "Import Job ID",
      "Source filename",
      "Source row number",
      "Final row status",
      "Original vehicle value",
      "Original driver value",
      "Original customer value",
      "Original valid-from value",
      "Original valid-until value",
      "Original remark",
      "Normalized vehicle",
      "Normalized driver",
      "Normalized customer",
      "Normalized valid-from",
      "Normalized valid-until",
      "Normalized remark",
      "Validation error codes/messages",
      "Validation warning codes/messages",
      "Persistence error codes/messages",
      "Assignment ID",
      "Driver ID",
      "Customer ID",
      "Created timestamp",
      "Persisted timestamp",
    ]);
  });

  it("builds safe deterministic filename", () => {
    const name = buildErrorReportFilename(job.id, new Date("2026-07-30T12:34:56.000Z"));
    expect(name).toBe("import-errors-11111111-20260730123456.xlsx");
    expect(["=", "+", "-", "@"]).not.toContain(name.trimStart()[0]);
  });

  it("maps final row status and formats errors without raw SQL", () => {
    expect(finalRowStatus(sampleRow())).toBe("invalid");
    expect(
      finalRowStatus(
        sampleRow({ validation_status: "valid", persistence_status: "failed" }),
      ),
    ).toBe("failed");
    const text = formatErrorList([
      { code: "ASSIGNMENT_OVERLAP", message: "Overlapping assignment exists." },
    ]);
    expect(text).toContain("ASSIGNMENT_OVERLAP");
    expect(text.toLowerCase()).not.toMatch(/select |insert |exception|stack/);
  });

  it("escapes formula-like user fields in exported values", () => {
    const values = errorReportRowValues(
      job,
      sampleRow({
        normalized_payload: {
          registrationDisplay: "=HYPERLINK(1)",
          driverDisplay: "+1234",
          customerDisplay: "-1+1",
          validFrom: "@cmd",
          notes: "safe",
          registrationNormalized: "X",
          driverNormalized: "y",
          customerNormalized: "z",
          notesNormalized: "safe",
        },
        validation_errors: [{ code: "X", message: "=bad" }],
      }),
    );
    expect(values[4]).toBe("'=HYPERLINK(1)");
    expect(values[5]).toBe("'+1234");
    expect(values[6]).toBe("'-1+1");
    expect(values[7]).toBe("'@cmd");
    expect(values[16]).toBe("X: '=bad");
  });

  it("builds workbook with ImportErrors sheet and excludes successes", async () => {
    const buffer = await buildImportErrorReportWorkbook({
      job,
      rows: [
        sampleRow(),
        sampleRow({
          source_row_number: 3,
          validation_status: "valid",
          persistence_status: "failed",
          persistence_errors: [{ code: "ASSIGNMENT_OVERLAP", message: "overlap" }],
          validation_errors: [],
        }),
        sampleRow({
          source_row_number: 4,
          validation_status: "valid",
          persistence_status: "persisted",
          validation_errors: [],
        }),
      ],
    });
    const wb = new ExcelJS.Workbook();
    // exceljs Buffer typing differs across @types/node versions
    await wb.xlsx.load(Uint8Array.from(buffer) as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((s) => s.name)).toEqual(["ImportErrors"]);
    const sheet = wb.getWorksheet("ImportErrors")!;
    expect(sheet.rowCount).toBe(3);
    const headers = (sheet.getRow(1).values as unknown[]).slice(1);
    expect(headers).toEqual([...ERROR_REPORT_COLUMNS]);
  });
});

describe("PACK-004 vocabulary and authz helpers", () => {
  it("maps internal validation statuses to DB valid/invalid", () => {
    expect(toDbValidationStatus("OK")).toBe("valid");
    expect(toDbValidationStatus("WARNING")).toBe("valid");
    expect(toDbValidationStatus("NEW_MASTER")).toBe("valid");
    expect(toDbValidationStatus("ERROR")).toBe("invalid");
    expect(toDbValidationStatus("CONFLICT")).toBe("invalid");
  });

  it("admin-only import/report management; manager and viewer denied", () => {
    expect(canManageMasterData("admin")).toBe(true);
    expect(canManageMasterData("manager")).toBe(false);
    expect(canManageMasterData("viewer")).toBe(false);
  });
});
