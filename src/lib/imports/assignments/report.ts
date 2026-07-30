/** Formula-injection safe Excel cell text for error reports. */
export function escapeExcelFormula(value: unknown): string {
  const text = value == null ? "" : String(value);
  const trimmedStart = text.replace(/^\s+/, "");
  const first = trimmedStart.charAt(0);
  if (first === "=" || first === "+" || first === "-" || first === "@") {
    return `'${text}`;
  }
  return text;
}

export function formatErrorList(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "";
  }
  return value
    .map((item) => {
      if (item && typeof item === "object" && "code" in item) {
        const code = escapeExcelFormula(String((item as { code: unknown }).code ?? ""));
        const message = escapeExcelFormula(
          String((item as { message?: unknown }).message ?? ""),
        );
        return message ? `${code}: ${message}` : code;
      }
      return escapeExcelFormula(String(item));
    })
    .filter(Boolean)
    .join("; ");
}

export type ErrorReportJob = {
  id: string;
  source_filename: string | null;
};

export type ErrorReportRow = {
  source_row_number: number;
  validation_status: string;
  persistence_status: string;
  validation_errors: unknown;
  validation_warnings: unknown;
  persistence_errors: unknown;
  normalized_payload: Record<string, unknown> | null;
  assignment_id: string | null;
  driver_id: string | null;
  customer_id: string | null;
  created_at: string | null;
  persisted_at: string | null;
};

export const ERROR_REPORT_COLUMNS = [
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
] as const;

export function finalRowStatus(row: ErrorReportRow): string {
  if (row.validation_status === "invalid") {
    return "invalid";
  }
  return row.persistence_status || "pending";
}

export function shouldIncludeInErrorReport(row: ErrorReportRow): boolean {
  return row.validation_status === "invalid" || row.persistence_status === "failed";
}

export function buildErrorReportFilename(jobId: string, now = new Date()): string {
  const short = jobId.replace(/[^a-fA-F0-9]/g, "").slice(0, 8) || "unknown";
  const stamp = now
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const name = `import-errors-${short}-${stamp}.xlsx`;
  return escapeExcelFormula(name);
}

export function errorReportRowValues(
  job: ErrorReportJob,
  row: ErrorReportRow,
): string[] {
  const payload = row.normalized_payload ?? {};
  return [
    job.id,
    job.source_filename ?? "",
    String(row.source_row_number),
    finalRowStatus(row),
    String(payload.registrationDisplay ?? ""),
    String(payload.driverDisplay ?? ""),
    String(payload.customerDisplay ?? ""),
    String(payload.validFrom ?? ""),
    String(payload.validUntil ?? ""),
    String(payload.notes ?? ""),
    String(payload.registrationNormalized ?? ""),
    String(payload.driverNormalized ?? ""),
    String(payload.customerNormalized ?? ""),
    String(payload.validFrom ?? ""),
    String(payload.validUntil ?? ""),
    String(payload.notesNormalized ?? payload.notes ?? ""),
    formatErrorList(row.validation_errors),
    formatErrorList(row.validation_warnings),
    formatErrorList(row.persistence_errors),
    row.assignment_id ?? "",
    row.driver_id ?? "",
    row.customer_id ?? "",
    row.created_at ?? "",
    row.persisted_at ?? "",
  ].map(escapeExcelFormula);
}

export async function buildImportErrorReportWorkbook(input: {
  job: ErrorReportJob;
  rows: ErrorReportRow[];
}): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "fleet-utilization-reports";
  const sheet = workbook.addWorksheet("ImportErrors");
  sheet.addRow([...ERROR_REPORT_COLUMNS]);
  for (const row of input.rows.filter(shouldIncludeInErrorReport)) {
    sheet.addRow(errorReportRowValues(input.job, row));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
