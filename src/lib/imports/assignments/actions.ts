"use server";

import { z } from "zod";
import { requireAdmin, isAppError } from "@/lib/auth/session";
import {
  appError,
  mapDatabaseError,
  type AppError,
} from "@/lib/assignments/errors";
import { findOverlappingAssignments } from "@/lib/assignments/overlap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IMPORT_CONFIG_VERSION } from "./constants";
import { parseAssignmentXlsx } from "./parse";
import { validateParsedWorkbook, type ValidatedImportRow } from "./validate";
import { normalizePersonName, normalizePlate } from "./plates";

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
    (r) => r.validationStatus === "ERROR" || r.validationStatus === "CONFLICT",
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
  } catch (e) {
    return {
      ok: false,
      error: appError("INTERNAL_ERROR", e instanceof Error ? e.message : "Load failed"),
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
    validation_status: r.validationStatus,
    validation_errors: r.validationErrors,
    validation_warnings: r.validationWarnings,
    duplicate_key: r.duplicateKey,
    persistence_status: r.persistenceStatus,
    driver_id: r.driverId,
    customer_id: r.customerId,
  }));

  const { data: rows, error: rowsError } = await supabase
    .from("import_job_rows")
    .insert(rowInserts)
    .select(
      "id, source_row_number, validation_status, validation_errors, validation_warnings, persistence_status, normalized_payload, assignment_id",
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
    return { ok: false, error: appError("INTERNAL_ERROR", error.message) };
  }
  if (!job) {
    return { ok: false, error: appError("NOT_FOUND", "Import job not found.") };
  }
  const { data: rows, error: rowsError } = await supabase
    .from("import_job_rows")
    .select(
      "id, source_row_number, validation_status, validation_errors, validation_warnings, persistence_status, normalized_payload, assignment_id",
    )
    .eq("import_job_id", jobId)
    .order("source_row_number", { ascending: true });
  if (rowsError) {
    return { ok: false, error: appError("INTERNAL_ERROR", rowsError.message) };
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

  // Ignore any client-supplied rows — only jobId + options
  const supabase = await createSupabaseServerClient();

  const { data: casRaw, error: casError } = await supabase.rpc("begin_import_job_confirm", {
    p_job_id: parsed.data.jobId,
    p_user_id: auth.userId,
  });

  if (casError) {
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
    .select("*")
    .eq("import_job_id", parsed.data.jobId)
    .order("source_row_number", { ascending: true });

  if (loadRowsError || !dbRows) {
    await supabase
      .from("import_jobs")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", parsed.data.jobId);
    return { ok: false, error: appError("INTERNAL_ERROR", loadRowsError?.message ?? "rows") };
  }

  let masters;
  try {
    masters = await loadMasters();
  } catch (e) {
    await supabase
      .from("import_jobs")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", parsed.data.jobId);
    return {
      ok: false,
      error: appError("INTERNAL_ERROR", e instanceof Error ? e.message : "masters"),
    };
  }

  let persisted = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of dbRows) {
    const status = row.validation_status as string;
    if (status === "ERROR" || status === "CONFLICT") {
      await supabase
        .from("import_job_rows")
        .update({
          persistence_status: "not_attempted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      continue;
    }

    const payload = row.normalized_payload as Record<string, unknown>;
    const validFrom = String(payload.validFrom ?? "");
    const validUntil = (payload.validUntil as string | null) ?? null;
    let vehicleId = (payload.vehicleId as string | null) ?? null;
    let driverId = (row.driver_id as string | null) ?? (payload.driverId as string | null);
    let customerId =
      (row.customer_id as string | null) ?? (payload.customerId as string | null);

    const plateNorm = String(payload.registrationNormalized ?? "");
    if (!vehicleId && plateNorm) {
      const v = masters.vehicles.find(
        (x) => x.active && normalizePlate(x.registration_number) === plateNorm,
      );
      vehicleId = v?.id ?? null;
    }

    if (!vehicleId || !validFrom) {
      failed += 1;
      await markRow(supabase, row.id, "failed", null, driverId, customerId, [
        { code: "MISSING_VEHICLE", message: "Vehicle unresolved at confirm." },
      ]);
      continue;
    }

    // Create masters if needed
    if (createNewMasters && payload.needsNewDriver && !driverId) {
      const display = String(payload.driverDisplay ?? "");
      const { data: created, error } = await supabase
        .from("drivers")
        .insert({ full_name: display, active: true })
        .select("id")
        .maybeSingle();
      if (error || !created) {
        // maybe race duplicate — try lookup
        const existing = masters.drivers.find(
          (d) => d.active && normalizePersonName(d.full_name) === normalizePersonName(display),
        );
        if (existing) {
          driverId = existing.id;
        } else {
          failed += 1;
          await markRow(supabase, row.id, "failed", null, null, customerId, [
            { code: "DRIVER_CREATE_FAILED", message: error?.message ?? "create failed" },
          ]);
          continue;
        }
      } else {
        driverId = created.id;
        masters.drivers.push({ id: created.id, full_name: display, active: true });
      }
    }

    if (createNewMasters && payload.needsNewCustomer && !customerId) {
      const display = String(payload.customerDisplay ?? "");
      const { data: created, error } = await supabase
        .from("customers")
        .insert({ name: display, active: true })
        .select("id")
        .maybeSingle();
      if (error || !created) {
        const existing = masters.customers.find(
          (c) => c.active && normalizePersonName(c.name) === normalizePersonName(display),
        );
        if (existing) {
          customerId = existing.id;
        } else {
          failed += 1;
          await markRow(supabase, row.id, "failed", null, driverId, null, [
            { code: "CUSTOMER_CREATE_FAILED", message: error?.message ?? "create failed" },
          ]);
          continue;
        }
      } else {
        customerId = created.id;
        masters.customers.push({ id: created.id, name: display, active: true });
      }
    }

    if (!createNewMasters && (payload.needsNewDriver || payload.needsNewCustomer)) {
      failed += 1;
      await markRow(supabase, row.id, "failed", null, driverId, customerId, [
        { code: "MASTER_CREATE_DISABLED", message: "Unknown masters and create-masters OFF." },
      ]);
      continue;
    }

    if (!driverId && !customerId) {
      failed += 1;
      await markRow(supabase, row.id, "failed", null, null, null, [
        { code: "MISSING_PARTY", message: "Driver/customer unresolved." },
      ]);
      continue;
    }

    // Exact duplicate skip
    const exact = masters.assignments.find(
      (a) =>
        a.vehicleId === vehicleId &&
        a.validFrom === validFrom &&
        (a.validUntil ?? null) === validUntil &&
        (a.driverId ?? null) === (driverId ?? null) &&
        (a.customerId ?? null) === (customerId ?? null),
    );
    if (exact) {
      skipped += 1;
      await supabase
        .from("import_job_rows")
        .update({
          persistence_status: "skipped",
          assignment_id: exact.id,
          driver_id: driverId,
          customer_id: customerId,
          persisted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          validation_warnings: [
            ...((row.validation_warnings as unknown[]) ?? []),
            { code: "EXACT_DUPLICATE_SKIPPED", message: "Exact assignment already exists." },
          ],
        })
        .eq("id", row.id);
      continue;
    }

    const overlaps = findOverlappingAssignments(
      { vehicleId, validFrom, validUntil },
      masters.assignments.map((a) => ({
        id: a.id,
        vehicleId: a.vehicleId,
        validFrom: a.validFrom,
        validUntil: a.validUntil,
      })),
    );
    if (overlaps.length > 0) {
      failed += 1;
      await markRow(supabase, row.id, "failed", null, driverId, customerId, [
        { code: "ASSIGNMENT_OVERLAP", message: "Overlaps existing assignment." },
      ]);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("vehicle_assignments")
      .insert({
        vehicle_id: vehicleId,
        driver_id: driverId,
        customer_id: customerId,
        valid_from: validFrom,
        valid_until: validUntil,
        source: "excel_import",
        notes: (payload.notes as string | null) ?? null,
        created_by: auth.userId,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted) {
      const mapped = mapDatabaseError(insertError ?? new Error("insert"));
      failed += 1;
      await markRow(supabase, row.id, "failed", null, driverId, customerId, [
        {
          code: mapped.code,
          message: mapped.message,
        },
      ]);
      continue;
    }

    persisted += 1;
    masters.assignments.push({
      id: inserted.id,
      vehicleId,
      validFrom,
      validUntil,
      driverId,
      customerId,
      notes: (payload.notes as string | null) ?? null,
    });
    await supabase
      .from("import_job_rows")
      .update({
        persistence_status: "imported",
        assignment_id: inserted.id,
        driver_id: driverId,
        customer_id: customerId,
        persisted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  const validRows = Number((casJob as { valid_rows?: number }).valid_rows ?? 0);
  const terminal =
    failed > 0 || persisted + skipped < validRows
      ? "completed_with_errors"
      : "completed";

  const { data: finalJob, error: finalError } = await supabase
    .from("import_jobs")
    .update({
      status: terminal,
      persisted_rows: persisted,
      skipped_rows: skipped,
      failed_rows: failed,
      imported_rows: persisted,
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

  const refreshed = await getImportJob(parsed.data.jobId);
  return refreshed;
}

async function markRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
  persistence_status: string,
  assignment_id: string | null,
  driver_id: string | null,
  customer_id: string | null,
  extraErrors: Array<{ code: string; message: string }>,
) {
  await supabase
    .from("import_job_rows")
    .update({
      persistence_status,
      assignment_id,
      driver_id,
      customer_id,
      updated_at: new Date().toISOString(),
      validation_errors: extraErrors,
    })
    .eq("id", id);
}
