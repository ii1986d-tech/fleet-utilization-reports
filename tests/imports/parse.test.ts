import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseAssignmentXlsx } from "@/lib/imports/assignments/parse";
import { MAX_IMPORT_BYTES } from "@/lib/imports/assignments/constants";

async function workbookBuffer(rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Assignments");
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe("parseAssignmentXlsx", () => {
  it("accepts a valid single-sheet workbook", async () => {
    const buffer = await workbookBuffer([
      ["Kennzeichen", "Fahrer", "Gültig ab"],
      ["ABC-123", "Max Mustermann", "2026-07-01"],
    ]);
    const result = await parseAssignmentXlsx({ buffer, filename: "ok.xlsx" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.worksheetName).toBe("Assignments");
    }
  });

  it("rejects non-xlsx extension", async () => {
    const buffer = await workbookBuffer([["a"]]);
    const result = await parseAssignmentXlsx({ buffer, filename: "x.csv" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("IMPORT_FILE_INVALID");
  });

  it("rejects oversized files", async () => {
    const buffer = Buffer.alloc(MAX_IMPORT_BYTES + 1, 1);
    buffer[0] = 0x50;
    buffer[1] = 0x4b;
    buffer[2] = 0x03;
    buffer[3] = 0x04;
    const result = await parseAssignmentXlsx({ buffer, filename: "big.xlsx" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("IMPORT_FILE_TOO_LARGE");
  });

  it("rejects multiple non-empty worksheets", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("A").addRow(["Kennzeichen", "Gültig ab"]);
    wb.addWorksheet("B").addRow(["x", "y"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const result = await parseAssignmentXlsx({ buffer: buf, filename: "multi.xlsx" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("IMPORT_VALIDATION_FAILED");
  });

  it("rejects bad magic renamed file", async () => {
    const result = await parseAssignmentXlsx({
      buffer: Buffer.from("not-a-zip"),
      filename: "fake.xlsx",
    });
    expect(result.ok).toBe(false);
  });
});
