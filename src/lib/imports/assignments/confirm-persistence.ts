/** Safe structured error written when persist RPC fails at transport/client level. */
export const TRANSPORT_PERSISTENCE_ERROR = {
  code: "PERSISTENCE_FAILED",
  message: "Assignment could not be persisted due to a temporary processing failure.",
} as const;

export function buildTransportPersistenceErrors(): Array<{
  code: string;
  message: string;
}> {
  return [
    {
      code: TRANSPORT_PERSISTENCE_ERROR.code,
      message: TRANSPORT_PERSISTENCE_ERROR.message,
    },
  ];
}

export type PersistenceStatusCount = {
  persisted: number;
  skipped: number;
  failed: number;
  pending: number;
};

export type RowStatusSlice = {
  validation_status: string;
  persistence_status: string;
};

/** Counters for valid rows only — never treat pending as failed. */
export function countValidPersistenceStatuses(
  rows: RowStatusSlice[],
): PersistenceStatusCount {
  const valid = rows.filter((r) => r.validation_status === "valid");
  return {
    persisted: valid.filter((r) => r.persistence_status === "persisted").length,
    skipped: valid.filter((r) => r.persistence_status === "skipped").length,
    failed: valid.filter((r) => r.persistence_status === "failed").length,
    pending: valid.filter((r) => r.persistence_status === "pending").length,
  };
}

export type ConfirmTerminalDecision =
  | { ok: true; status: "completed" | "completed_with_errors" }
  | { ok: false; reason: "unexpected_pending" };

/**
 * Finalize only when no valid pending rows remain.
 * completed_with_errors requires ≥1 stored valid failed row.
 */
export function resolveConfirmTerminalStatus(
  counts: PersistenceStatusCount,
): ConfirmTerminalDecision {
  if (counts.pending > 0) {
    return { ok: false, reason: "unexpected_pending" };
  }
  if (counts.failed > 0) {
    return { ok: true, status: "completed_with_errors" };
  }
  return { ok: true, status: "completed" };
}

/** Narrow eligibility for transport-failure fallback update (mirrors SQL filters). */
export function canRecordTransportPersistenceFailure(input: {
  jobId: string;
  rowJobId: string;
  validationStatus: string;
  persistenceStatus: string;
}): boolean {
  return (
    input.rowJobId === input.jobId &&
    input.validationStatus === "valid" &&
    input.persistenceStatus === "pending"
  );
}

/** Minimal Supabase surface used by transport-failure recording. */
export type ImportConfirmDb = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => unknown;
    };
  };
};

type EqChain = {
  eq: (column: string, value: string) => EqChain;
  select: (columns: string) => Promise<{ data: Array<{ id: string }> | null; error: unknown }>;
};

/**
 * Narrowly mark one valid pending row failed after a transport-level RPC miss.
 * Does not touch validation_*, normalized_payload, or non-pending rows.
 */
export async function recordTransportPersistenceFailure(
  supabase: ImportConfirmDb,
  input: { jobId: string; rowId: string },
): Promise<{ ok: true; updated: boolean } | { ok: false }> {
  const now = new Date().toISOString();
  const chain = supabase
    .from("import_job_rows")
    .update({
      persistence_status: "failed",
      persistence_errors: buildTransportPersistenceErrors(),
      updated_at: now,
    }) as unknown as EqChain;

  const { data, error } = await chain
    .eq("id", input.rowId)
    .eq("import_job_id", input.jobId)
    .eq("validation_status", "valid")
    .eq("persistence_status", "pending")
    .select("id");

  if (error) {
    return { ok: false };
  }
  return { ok: true, updated: (data?.length ?? 0) > 0 };
}

export async function markImportJobFailed(
  supabase: ImportConfirmDb,
  jobId: string,
): Promise<void> {
  const updater = supabase.from("import_jobs").update({
    status: "failed",
    updated_at: new Date().toISOString(),
  }) as unknown as { eq: (column: string, value: string) => Promise<unknown> };
  await updater.eq("id", jobId);
}
