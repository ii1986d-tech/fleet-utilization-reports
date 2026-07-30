"use server";

import { z } from "zod";
import { requireAdmin, requireAuthenticated, isAppError } from "@/lib/auth/session";
import {
  appError,
  mapDatabaseError,
  type AppError,
} from "@/lib/assignments/errors";
import { resolveAssignmentAsOf } from "@/lib/assignments/asOf";
import { findOverlappingAssignments } from "@/lib/assignments/overlap";
import { normalizePeriod } from "@/lib/assignments/periods";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

export type AssignmentRow = {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  customer_id: string | null;
  valid_from: string;
  valid_until: string | null;
  source: string;
  notes: string | null;
  created_by: string | null;
};

const createSchema = z.object({
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  validFrom: z.string().min(1),
  validUntil: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const correctSchema = createSchema.extend({
  id: z.string().uuid(),
});

const endSchema = z.object({
  id: z.string().uuid(),
  validUntil: z.string().min(1),
});

function requireParty(driverId: string | null | undefined, customerId: string | null | undefined): AppError | null {
  if (!driverId && !customerId) {
    return appError(
      "VALIDATION_ERROR",
      "At least one of driverId or customerId is required.",
    );
  }
  return null;
}

async function loadVehicleAssignments(vehicleId: string): Promise<AssignmentRow[] | AppError> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vehicle_assignments")
    .select("*")
    .eq("vehicle_id", vehicleId);
  if (error) {
    return appError("INTERNAL_ERROR", error.message);
  }
  return (data ?? []) as AssignmentRow[];
}

export async function listAssignments(vehicleId?: string): Promise<ActionResult<AssignmentRow[]>> {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("vehicle_assignments").select("*").order("valid_from", { ascending: true });
  if (vehicleId) {
    query = query.eq("vehicle_id", vehicleId);
  }
  const { data, error } = await query;
  if (error) {
    return { ok: false, error: appError("INTERNAL_ERROR", error.message) };
  }
  return { ok: true, data: (data ?? []) as AssignmentRow[] };
}

export async function createAssignment(input: unknown): Promise<ActionResult<AssignmentRow>> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid assignment payload.", {
        issues: parsed.error.flatten(),
      }),
    };
  }
  const partyErr = requireParty(parsed.data.driverId, parsed.data.customerId);
  if (partyErr) {
    return { ok: false, error: partyErr };
  }

  let period;
  try {
    period = normalizePeriod({
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
    });
  } catch (e) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", e instanceof Error ? e.message : "Invalid period"),
    };
  }

  const existing = await loadVehicleAssignments(parsed.data.vehicleId);
  if (isAppError(existing)) {
    return { ok: false, error: existing };
  }
  const dated = existing.map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  }));
  const overlaps = findOverlappingAssignments(
    { vehicleId: parsed.data.vehicleId, ...period },
    dated,
  );
  if (overlaps.length > 0) {
    return {
      ok: false,
      error: appError(
        "ASSIGNMENT_OVERLAP",
        "Assignment period overlaps an existing assignment for this vehicle.",
        { conflictingIds: overlaps.map((o) => o.id) },
      ),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vehicle_assignments")
    .insert({
      vehicle_id: parsed.data.vehicleId,
      driver_id: parsed.data.driverId ?? null,
      customer_id: parsed.data.customerId ?? null,
      valid_from: period.validFrom,
      valid_until: period.validUntil,
      source: "manual",
      notes: parsed.data.notes ?? null,
      created_by: auth.userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: mapDatabaseError(error ?? new Error("Insert failed")) };
  }
  return { ok: true, data: data as AssignmentRow };
}

/** ADR-006 Option A: in-place UPDATE in one logical transaction with full overlap re-check. */
export async function correctAssignment(input: unknown): Promise<ActionResult<AssignmentRow>> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = correctSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid assignment correction.", {
        issues: parsed.error.flatten(),
      }),
    };
  }
  const partyErr = requireParty(parsed.data.driverId, parsed.data.customerId);
  if (partyErr) {
    return { ok: false, error: partyErr };
  }

  let period;
  try {
    period = normalizePeriod({
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
    });
  } catch (e) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", e instanceof Error ? e.message : "Invalid period"),
    };
  }

  const existing = await loadVehicleAssignments(parsed.data.vehicleId);
  if (isAppError(existing)) {
    return { ok: false, error: existing };
  }
  const target = existing.find((row) => row.id === parsed.data.id);
  if (!target) {
    return { ok: false, error: appError("NOT_FOUND", "Assignment not found.") };
  }

  const dated = existing.map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  }));
  const overlaps = findOverlappingAssignments(
    {
      id: parsed.data.id,
      vehicleId: parsed.data.vehicleId,
      ...period,
    },
    dated,
  );
  if (overlaps.length > 0) {
    return {
      ok: false,
      error: appError(
        "ASSIGNMENT_OVERLAP",
        "Corrected period overlaps another assignment for this vehicle.",
        { conflictingIds: overlaps.map((o) => o.id) },
      ),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vehicle_assignments")
    .update({
      vehicle_id: parsed.data.vehicleId,
      driver_id: parsed.data.driverId ?? null,
      customer_id: parsed.data.customerId ?? null,
      valid_from: period.validFrom,
      valid_until: period.validUntil,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: mapDatabaseError(error) };
  }
  if (!data) {
    return { ok: false, error: appError("NOT_FOUND", "Assignment not found.") };
  }
  return { ok: true, data: data as AssignmentRow };
}

export async function endAssignment(input: unknown): Promise<ActionResult<AssignmentRow>> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = endSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid end assignment payload.", {
        issues: parsed.error.flatten(),
      }),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: current, error: loadError } = await supabase
    .from("vehicle_assignments")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (loadError) {
    return { ok: false, error: appError("INTERNAL_ERROR", loadError.message) };
  }
  if (!current) {
    return { ok: false, error: appError("NOT_FOUND", "Assignment not found.") };
  }

  let period;
  try {
    period = normalizePeriod({
      validFrom: (current as AssignmentRow).valid_from,
      validUntil: parsed.data.validUntil,
    });
  } catch (e) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", e instanceof Error ? e.message : "Invalid period"),
    };
  }

  const existing = await loadVehicleAssignments((current as AssignmentRow).vehicle_id);
  if (isAppError(existing)) {
    return { ok: false, error: existing };
  }
  const dated = existing.map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  }));
  const overlaps = findOverlappingAssignments(
    {
      id: parsed.data.id,
      vehicleId: (current as AssignmentRow).vehicle_id,
      ...period,
    },
    dated,
  );
  if (overlaps.length > 0) {
    return {
      ok: false,
      error: appError(
        "ASSIGNMENT_OVERLAP",
        "Ending date would create an overlapping assignment period.",
        { conflictingIds: overlaps.map((o) => o.id) },
      ),
    };
  }

  const { data, error } = await supabase
    .from("vehicle_assignments")
    .update({
      valid_until: period.validUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: mapDatabaseError(error) };
  }
  if (!data) {
    return { ok: false, error: appError("NOT_FOUND", "Assignment not found.") };
  }
  return { ok: true, data: data as AssignmentRow };
}

/** FR-002-11: historical as-of lookup for one vehicle. */
export async function getAssignmentAsOf(input: unknown): Promise<ActionResult<AssignmentRow | null>> {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = z
    .object({
      vehicleId: z.string().uuid(),
      asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid as-of query.", {
        issues: parsed.error.flatten(),
      }),
    };
  }

  const existing = await loadVehicleAssignments(parsed.data.vehicleId);
  if (isAppError(existing)) {
    return { ok: false, error: existing };
  }
  const dated = existing.map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  }));

  try {
    const match = resolveAssignmentAsOf(parsed.data.vehicleId, parsed.data.asOfDate, dated);
    if (!match) {
      return { ok: true, data: null };
    }
    const row = existing.find((r) => r.id === match.id) ?? null;
    return { ok: true, data: row };
  } catch (e) {
    return {
      ok: false,
      error: appError(
        "INTERNAL_ERROR",
        e instanceof Error ? e.message : "As-of resolution failed",
      ),
    };
  }
}

/** Explicitly unsupported — historical integrity (ADR-006). */
export async function deleteAssignment(): Promise<ActionResult<never>> {
  return {
    ok: false,
    error: appError(
      "FORBIDDEN",
      "Hard DELETE of assignments is not allowed. End the assignment with valid_until instead.",
    ),
  };
}
