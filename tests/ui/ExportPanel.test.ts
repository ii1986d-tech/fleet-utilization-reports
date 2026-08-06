import { describe, expect, it } from "vitest";
import { buildExportRequestBody } from "@/components/export/ExportPanel";

describe("ExportPanel request builder", () => {
  it("defaults original PDF to unchecked (false)", () => {
    const body = buildExportRequestBody({
      format: "excel",
      dateFrom: "",
      dateTo: "",
      status: "all",
      dispatcherId: "",
      includeKmComparison: true,
      includeStops: true,
      includeOriginalPdf: false,
    });
    expect(body.includeOriginalPdf).toBe(false);
    expect(body.includeKmComparison).toBe(true);
    expect(body.includeStops).toBe(true);
    expect(body.format).toBe("excel");
    expect(body.dateFrom).toBeUndefined();
    expect(body.dispatcherId).toBeUndefined();
  });

  it("passes filters through for PDF export", () => {
    const body = buildExportRequestBody({
      format: "pdf",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      status: "completed",
      dispatcherId: "Dispatcher A",
      includeKmComparison: false,
      includeStops: true,
      includeOriginalPdf: true,
    });
    expect(body).toEqual({
      format: "pdf",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      status: "completed",
      dispatcherId: "Dispatcher A",
      includeKmComparison: false,
      includeStops: true,
      includeOriginalPdf: true,
    });
  });
});
