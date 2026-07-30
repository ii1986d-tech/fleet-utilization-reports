"use server";

import { z } from "zod";
import { requireAdmin, isAppError } from "@/lib/auth/session";
import {
  appError,
  mapDatabaseError,
  type AppError,
} from "@/lib/assignments/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IMPORT_CONFIG_VERSION, toDbValidationStatus } from "./constants";
import { parseAssignmentXlsx } from "./parse";
import { validateParsedWorkbook, type ValidatedImportRow } from "./validate";
import {
  buildErrorReportFilename,
  buildImportErrorReportWorkbook,
  type ErrorReportRow,
} from "./report";
import {
  countValidPersistenceStatuses,
  markImportJobFailed,
  recordTransportPersistenceFailure,
  resolveConfirmTerminalStatus,
} from "./confirm-persistence";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

export type ImportJobSummary = {
  id: string;
  status: string;
  source_filename: string;
  worksheet_name: string | null;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  skipped_rows: number;
  persisted_rows: number;
  failed_rows: number;
  options: { createNewMasters?: boolean };
};

export type ImportJobRowView = {
  id: string;
  source_row_number: number;
  validation_status: string;
  validation_errors: unknown;
  validation_warnings: unknown;
  persistence_status: string;
  persistence_errors?: unknown;
  normalized_payload: Record<string, unknown>;
  assignment_id: string | null;
};

function recount(rows: ValidatedImportRow[]): {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
} {
  const total_rows = rows.length;
  const invalid_rows = rows.filter(
    (r) => toDbValidationStatus(r.validationStatus) === "invalid",
  ).length;
  const valid_rows = total_rows - invalid_rows;
  return { total_rows, valid_rows, invalid_rows };
}

async function loadMasters() {
  const supabase = await createSupabaseServerClient();
  const [vehicles, drivers, customers, assignments] = await Promise.all([
    supabase.from("vehicles").select("id, registration_number, active"),
    supabase.from("drivers").select("id, full_name, active"),
    supabase.from("customers").select("id, name, active"),
    supabase.from("vehicle_assignments").select("id, vehicle_id, valid_from, valid_until, driver_id, customer_id, notes"),
  ]);
  if (vehicles.error || drivers.error || customers.error || assignments.error) {
    throw new Error("Failed to load masters for import validation.");
  }
  return {
    vehicles: vehicles.data ?? [],
    drivers: drivers.data ?? [],
    customers: customers.data ?? [],
    assignments: (assignments.data ?? []).map((a) => ({
      id: a.id as string,
      vehicleId: a.vehicle_id as string,
      validFrom: a.valid_from as string,
      validUntil: (a.valid_until as string | null) ?? null,
      driverId: (a.driver_id as string | null) ?? null,
      customerId: (a.customer_id as string | null) ?? null,
      notes: (a.notes as string | null) ?? null,
    })),
  };
}

export async function uploadAssignmentImport(input: {
  filename: string;
  bytesBase64: string;
  createNewMasters?: boolean;
}): Promise<
  ActionResult<{ job: ImportJobSummary; rows: ImportJobRowView[] }>
> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.bytesBase64, "base64");
  } catch {
    return {
      ok: false,
      error: appError("IMPORT_FILE_INVALID", "Could not decode upload."),
    };
  }

  const parsed = await parseAssignmentXlsx({
    buffer,
    filename: input.filename,
  });
  if (!parsed.ok) {
    return {
      ok: false,
      error: appError(parsed.error.code, parsed.error.message),
    };
  }

  const createNewMasters = Boolean(input.createNewMasters);
  let masters;
  try {
    masters = await loadMasters();
  } catch {
    return {
      ok: false,
      error: appError("INTERNAL_ERROR", "Failed to load masters for import validation."),
    };
  }

  const validated = validateParsedWorkbook(parsed.data, {
    vehicles: masters.vehicles,
    drivers: masters.drivers,
    customers: masters.customers,
    assignments: masters.assignments.map((a) => ({
      id: a.id,
      vehicleId: a.vehicleId,
      validFrom: a.validFrom,
      validUntil: a.validUntil,
    })),
  }, { createNewMasters });

  const counts = recount(validated);
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      file_name: parsed.data.filename,
      source_filename: parsed.data.filename,
      source_file_size: parsed.data.fileSize,
      source_sha256: parsed.data.sha256,
      worksheet_name: parsed.data.worksheetName,
      status: "validated",
      total_rows: counts.total_rows,
      valid_rows: counts.valid_rows,
      invalid_rows: counts.invalid_rows,
      skipped_rows: 0,
      persisted_rows: 0,
      failed_rows: 0,
      imported_rows: 0,
      import_config_version: IMPORT_CONFIG_VERSION,
      options: { createNewMasters },
      created_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (jobError || !job) {
    return { ok: false, error: mapDatabaseError(jobError ?? new Error("job insert")) };
  }

  const rowInserts = validated.map((r) => ({
    import_job_id: job.id,
    source_row_number: r.sourceRowNumber,
    normalized_payload: r.normalizedPayload,
    validation_status: toDbValidationStatus(r.validationStatus),
    validation_errors: r.validationErrors,
    validation_warnings: r.validationWarnings,
    duplicate_key: r.duplicateKey,
    persistence_status: "pending",
    persistence_errors: [],
    driver_id: r.driverId,
    customer_id: r.customerId,
  }));

  const { data: rows, error: rowsError } = await supabase
    .from("import_job_rows")
    .insert(rowInserts)
    .select(
      "id, source_row_number, validation_status, validation_errors, validation_warnings, persistence_status, persistence_errors, normalized_payload, assignment_id",
    );

  if (rowsError || !rows) {
    await supabase.from("import_jobs").update({ status: "failed" }).eq("id", job.id);
    return { ok: false, error: mapDatabaseError(rowsError ?? new Error("rows insert")) };
  }

  return {
    ok: true,
    data: {
      job: mapJob(job),
      rows: rows as ImportJobRowView[],
    },
  };
}

function mapJob(job: Record<string, unknown>): ImportJobSummary {
  const options = (job.options as { createNewMasters?: boolean } | null) ?? {};
  return {
    id: String(job.id),
    status: String(job.status),
    source_filename: String(job.source_filename ?? job.file_name),
    worksheet_name: (job.worksheet_name as string | null) ?? null,
    total_rows: Number(job.total_rows ?? 0),
    valid_rows: Number(job.valid_rows ?? 0),
    invalid_rows: Number(job.invalid_rows ?? 0),
    skipped_rows: Number(job.skipped_rows ?? 0),
    persisted_rows: Number(job.persisted_rows ?? 0),
    failed_rows: Number(job.failed_rows ?? 0),
    options,
  };
}

export async function getImportJob(jobId: string): Promise<
  ActionResult<{ job: ImportJobSummary; rows: ImportJobRowView[] }>
> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const supabase = await createSupabaseServerClient();
  const { data: job, error } = await supabase.from("import_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error) {
    return { ok: false, error: appError("INTERNAL_ERROR", "Failed to load import job.") };
  }
  if (!job) {
    return { ok: false, error: appError("NOT_FOUND", "Import job not found.") };
  }
  const { data: rows, error: rowsError } = await supabase
    .from("import_job_rows")
    .select(
      "id, source_row_number, validation_status, validation_errors, validation_warnings, persistence_status, persistence_errors, normalized_payload, assignment_id",
    )
    .eq("import_job_id", jobId)
    .order("source_row_number", { ascending: true });
  if (rowsError) {
    return { ok: false, error: appError("INTERNAL_ERROR", "Failed to load import rows.") };
  }
  return { ok: true, data: { job: mapJob(job), rows: (rows ?? []) as ImportJobRowView[] } };
}

const confirmSchema = z.object({
  jobId: z.string().uuid(),
  createNewMasters: z.boolean().optional(),
});

export async function confirmAssignmentImport(input: unknown): Promise<
  ActionResult<{ job: ImportJobSummary; rows: ImportJobRowView[] }>
> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid confirm payload."),
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: casRaw, error: casError } = await supabase.rpc("begin_import_job_confirm", {
    p_job_id: parsed.data.jobId,
    p_user_id: auth.userId,
  });

  if (casError) {
    const msg = (casError.message ?? "").toUpperCase();
    if (msg.includes("FORBIDDEN") || msg.includes("UNAUTHENTICATED")) {
      return { ok: false, error: appError("FORBIDDEN", "Admin role required.") };
    }
    return { ok: false, error: mapDatabaseError(casError) };
  }
  const casJob = Array.isArray(casRaw) ? casRaw[0] : casRaw;
  if (!casJob) {
    return {
      ok: false,
      error: appError(
        "IMPORT_ALREADY_CONFIRMED",
        "Import job is already confirming or completed.",
      ),
    };
  }

  const createNewMasters =
    parsed.data.createNewMasters ??
    Boolean((casJob as { options?: { createNewMasters?: boolean } }).options?.createNewMasters);

  await supabase
    .from("import_jobs")
    .update({
      options: { createNewMasters },
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.jobId);

  const { data: dbRows, error: loadRowsError } = await supabase
    .from("import_job_rows")
    .select("id, validation_status, persistence_status")
    .eq("import_job_id", parsed.data.jobId)
    .order("source_row_number", { ascending: true });

  if (loadRowsError || !dbRows) {
    await markImportJobFailed(supabase, parsed.data.jobId);
    return { ok: false, error: appError("INTERNAL_ERROR", "Failed to load import rows.") };
  }

  for (const row of dbRows) {
    if (row.validation_status !== "valid") {
      continue;
    }
    if (
      row.persistence_status === "persisted" ||
      row.persistence_status === "skipped" ||
      row.persistence_status === "failed"
    ) {
      continue;
    }

    const { data: rpcRaw, error: rpcError } = await supabase.rpc(
      "persist_assignment_import_row",
      {
        p_job_id: parsed.data.jobId,
        p_import_row_id: row.id,
        p_create_missing_driver: createNewMasters,
        p_create_missing_customer: createNewMasters,
      },
    );

    const rpcResult = Array.isArray(rpcRaw) ? rpcRaw[0] : rpcRaw;
    if (rpcError || rpcResult == null) {
      const recorded = await recordTransportPersistenceFailure(supabase, {
        jobId: parsed.data.jobId,
        rowId: row.id,
      });
      if (!recorded.ok) {
        await markImportJobFailed(supabase, parsed.data.jobId);
        return {
          ok: false,
          error: appError(
            "INTERNAL_ERROR",
            "Import confirmation could not record a row failure safely.",
          ),
        };
      }
    }
  }

  const { data: countedRows, error: countError } = await supabase
    .from("import_job_rows")
    .select("validation_status, persistence_status")
    .eq("import_job_id", parsed.data.jobId);

  if (countError || !countedRows) {
    await markImportJobFailed(supabase, parsed.data.jobId);
    return { ok: false, error: appError("INTERNAL_ERROR", "Failed to recount import rows.") };
  }

  const counts = countValidPersistenceStatuses(countedRows);
  const terminal = resolveConfirmTerminalStatus(counts);
  if (!terminal.ok) {
    await markImportJobFailed(supabase, parsed.data.jobId);
    return {
      ok: false,
      error: appError(
        "INTERNAL_ERROR",
        "Import confirmation left unresolved rows and was not finalized.",
      ),
    };
  }

  const { data: finalJob, error: finalError } = await supabase
    .from("import_jobs")
    .update({
      status: terminal.status,
      persisted_rows: counts.persisted,
      skipped_rows: counts.skipped,
      failed_rows: counts.failed,
      imported_rows: counts.persisted,
      confirmed_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.jobId)
    .select("*")
    .single();

  if (finalError || !finalJob) {
    return { ok: false, error: mapDatabaseError(finalError ?? new Error("finalize")) };
  }

  return getImportJob(parsed.data.jobId);
}

export async function downloadImportErrorReport(input: unknown): Promise<
  ActionResult<{ filename: string; bytesBase64: string }>
> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = z.object({ jobId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION_ERROR", "Invalid job id.") };
  }

  const supabase = await createSupabaseServerClient();
  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .select("id, source_filename")
    .eq("id", parsed.data.jobId)
    .maybeSingle();
  if (jobError) {
    return { ok: false, error: appError("INTERNAL_ERROR", "Failed to load import job.") };
  }
  if (!job) {
    return { ok: false, error: appError("NOT_FOUND", "Import job not found.") };
  }

  const { data: rows, error: rowsError } = await supabase
    .from("import_job_rows")
    .select(
      "source_row_number, validation_status, persistence_status, validation_errors, validation_warnings, persistence_errors, normalized_payload, assignment_id, driver_id, customer_id, created_at, persisted_at",
    )
    .eq("import_job_id", parsed.data.jobId)
    .order("source_row_number", { ascending: true });
  if (rowsError) {
    return { ok: false, error: appError("INTERNAL_ERROR", "Failed to load import rows.") };
  }

  const buffer = await buildImportErrorReportWorkbook({
    job: { id: job.id, source_filename: job.source_filename },
    rows: (rows ?? []) as ErrorReportRow[],
  });
  const filename = buildErrorReportFilename(job.id);
  return {
    ok: true,
    data: {
      filename,
      bytesBase64: buffer.toString("base64"),
    },
  };
}
