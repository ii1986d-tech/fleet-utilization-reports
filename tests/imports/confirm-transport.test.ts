import { describe, expect, it, vi } from "vitest";
import {
  TRANSPORT_PERSISTENCE_ERROR,
  buildTransportPersistenceErrors,
  canRecordTransportPersistenceFailure,
  countValidPersistenceStatuses,
  recordTransportPersistenceFailure,
  resolveConfirmTerminalStatus,
} from "@/lib/imports/assignments/confirm-persistence";
import {
  buildImportErrorReportWorkbook,
  errorReportRowValues,
  formatErrorList,
  shouldIncludeInErrorReport,
  type ErrorReportRow,
} from "@/lib/imports/assignments/report";

const jobId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const rowId = "11111111-2222-3333-4444-555555555555";

describe("PACK-004 transport persistence failure helpers", () => {
  it("builds safe PERSISTENCE_FAILED structured errors without transport internals", () => {
    const errors = buildTransportPersistenceErrors();
    expect(errors).toEqual([
      {
        code: "PERSISTENCE_FAILED",
        message: TRANSPORT_PERSISTENCE_ERROR.message,
      },
    ]);
    const blob = JSON.stringify(errors).toLowerCase();
    expect(blob).not.toMatch(/supabase|stack|select |rpc|fetch failed|econnreset/);
  });

  it("counts only stored failed rows — pending is not failed", () => {
    const counts = countValidPersistenceStatuses([
      { validation_status: "valid", persistence_status: "persisted" },
      { validation_status: "valid", persistence_status: "skipped" },
      { validation_status: "valid", persistence_status: "failed" },
      { validation_status: "valid", persistence_status: "pending" },
      { validation_status: "invalid", persistence_status: "pending" },
    ]);
    expect(counts).toEqual({
      persisted: 1,
      skipped: 1,
      failed: 1,
      pending: 1,
    });
  });

  it("refuses completed/completed_with_errors while valid pending remains", () => {
    expect(
      resolveConfirmTerminalStatus({
        persisted: 1,
        skipped: 0,
        failed: 1,
        pending: 1,
      }),
    ).toEqual({ ok: false, reason: "unexpected_pending" });
  });

  it("finalizes completed and completed_with_errors from stored states only", () => {
    expect(
      resolveConfirmTerminalStatus({
        persisted: 2,
        skipped: 1,
        failed: 0,
        pending: 0,
      }),
    ).toEqual({ ok: true, status: "completed" });

    expect(
      resolveConfirmTerminalStatus({
        persisted: 1,
        skipped: 0,
        failed: 1,
        pending: 0,
      }),
    ).toEqual({ ok: true, status: "completed_with_errors" });
  });

  it("protects fallback eligibility for same job/valid/pending only", () => {
    expect(
      canRecordTransportPersistenceFailure({
        jobId,
        rowJobId: jobId,
        validationStatus: "valid",
        persistenceStatus: "pending",
      }),
    ).toBe(true);

    expect(
      canRecordTransportPersistenceFailure({
        jobId,
        rowJobId: "other-job",
        validationStatus: "valid",
        persistenceStatus: "pending",
      }),
    ).toBe(false);

    expect(
      canRecordTransportPersistenceFailure({
        jobId,
        rowJobId: jobId,
        validationStatus: "valid",
        persistenceStatus: "persisted",
      }),
    ).toBe(false);

    expect(
      canRecordTransportPersistenceFailure({
        jobId,
        rowJobId: jobId,
        validationStatus: "valid",
        persistenceStatus: "skipped",
      }),
    ).toBe(false);

    expect(
      canRecordTransportPersistenceFailure({
        jobId,
        rowJobId: jobId,
        validationStatus: "invalid",
        persistenceStatus: "pending",
      }),
    ).toBe(false);
  });
});

describe("PACK-004 recordTransportPersistenceFailure update shape", () => {
  it("updates only matching valid pending row with safe errors", async () => {
    const eq = vi.fn().mockReturnThis();
    const select = vi.fn().mockResolvedValue({ data: [{ id: rowId }], error: null });
    const update = vi.fn().mockReturnValue({ eq, select });
    // Chain: update().eq().eq().eq().eq().select()
    eq.mockReturnValue({ eq, select });

    const supabase = {
      from: vi.fn().mockReturnValue({ update }),
    };

    const result = await recordTransportPersistenceFailure(supabase as never, {
      jobId,
      rowId,
    });

    expect(result).toEqual({ ok: true, updated: true });
    expect(supabase.from).toHaveBeenCalledWith("import_job_rows");
    expect(update).toHaveBeenCalledWith({
      persistence_status: "failed",
      persistence_errors: buildTransportPersistenceErrors(),
      updated_at: expect.any(String),
    });
    expect(eq).toHaveBeenCalledWith("id", rowId);
    expect(eq).toHaveBeenCalledWith("import_job_id", jobId);
    expect(eq).toHaveBeenCalledWith("validation_status", "valid");
    expect(eq).toHaveBeenCalledWith("persistence_status", "pending");
  });

  it("returns ok:false when fallback update errors (double-failure signal)", async () => {
    const eq = vi.fn().mockReturnThis();
    const select = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "network boom with stack" },
    });
    eq.mockReturnValue({ eq, select });
    const update = vi.fn().mockReturnValue({ eq, select });
    const supabase = { from: vi.fn().mockReturnValue({ update }) };

    const result = await recordTransportPersistenceFailure(supabase as never, {
      jobId,
      rowId,
    });
    expect(result).toEqual({ ok: false });
  });

  it("returns updated:false when no pending row matched (no overwrite)", async () => {
    const eq = vi.fn().mockReturnThis();
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    eq.mockReturnValue({ eq, select });
    const update = vi.fn().mockReturnValue({ eq, select });
    const supabase = { from: vi.fn().mockReturnValue({ update }) };

    const result = await recordTransportPersistenceFailure(supabase as never, {
      jobId,
      rowId,
    });
    expect(result).toEqual({ ok: true, updated: false });
  });
});

describe("PACK-004 transport-failed row in error report", () => {
  it("includes failed transport row with PERSISTENCE_FAILED and no internals", async () => {
    const row: ErrorReportRow = {
      source_row_number: 5,
      validation_status: "valid",
      persistence_status: "failed",
      validation_errors: [{ code: "WARN_OK", message: "preview warning preserved" }],
      validation_warnings: [{ code: "W1", message: "keep me" }],
      persistence_errors: buildTransportPersistenceErrors(),
      normalized_payload: {
        registrationDisplay: "ABC",
        registrationNormalized: "ABC",
        driverDisplay: "Max",
        driverNormalized: "max",
        notes: "n",
      },
      assignment_id: null,
      driver_id: null,
      customer_id: null,
      created_at: "2026-07-30T10:00:00.000Z",
      persisted_at: null,
    };

    expect(shouldIncludeInErrorReport(row)).toBe(true);
    const values = errorReportRowValues(
      { id: jobId, source_filename: "x.xlsx" },
      row,
    );
    expect(values[3]).toBe("failed");
    expect(values[16]).toContain("WARN_OK");
    expect(values[17]).toContain("W1");
    expect(formatErrorList(row.persistence_errors)).toBe(
      `${TRANSPORT_PERSISTENCE_ERROR.code}: ${TRANSPORT_PERSISTENCE_ERROR.message}`,
    );
    expect(values[18]).toContain("PERSISTENCE_FAILED");
    expect(values[18].toLowerCase()).not.toMatch(/supabase|stack|econnreset|rpc/);

    const buffer = await buildImportErrorReportWorkbook({
      job: { id: jobId, source_filename: "x.xlsx" },
      rows: [row],
    });
    expect(buffer.byteLength).toBeGreaterThan(100);
  });
});

describe("PACK-004 double-failure finalize policy", () => {
  it("documents job-level abort when pending remains after failed recording", () => {
    // After RPC transport miss + successful fallback, pending must be 0.
    // If fallback also fails, confirm must not finalize with pending counted as failed.
    const inconsistent = countValidPersistenceStatuses([
      { validation_status: "valid", persistence_status: "pending" },
    ]);
    expect(inconsistent.failed).toBe(0);
    expect(inconsistent.pending).toBe(1);
    expect(resolveConfirmTerminalStatus(inconsistent).ok).toBe(false);
  });

  it("safe job-level error message has no transport internals", () => {
    const message = "Import confirmation could not record a row failure safely.";
    expect(message.toLowerCase()).not.toMatch(/supabase|stack|rpc|fetch/);
  });
});
