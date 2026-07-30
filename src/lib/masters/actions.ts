"use server";

import { requireAdmin, requireAuthenticated, isAppError } from "@/lib/auth/session";
import { appError, type AppError } from "@/lib/assignments/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  customerInsertSchema,
  customerUpdateSchema,
  driverInsertSchema,
  driverUpdateSchema,
  vehicleInsertSchema,
  vehicleUpdateSchema,
  type CustomerRow,
  type DriverRow,
  type VehicleRow,
} from "./schemas";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

async function listTable<T>(table: "vehicles" | "drivers" | "customers"): Promise<ActionResult<T[]>> {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
  if (error) {
    return { ok: false, error: appError("INTERNAL_ERROR", error.message) };
  }
  return { ok: true, data: (data ?? []) as T[] };
}

export async function listVehicles(): Promise<ActionResult<VehicleRow[]>> {
  return listTable<VehicleRow>("vehicles");
}

export async function listDrivers(): Promise<ActionResult<DriverRow[]>> {
  return listTable<DriverRow>("drivers");
}

export async function listCustomers(): Promise<ActionResult<CustomerRow[]>> {
  return listTable<CustomerRow>("customers");
}

export async function createVehicle(input: unknown): Promise<ActionResult<VehicleRow>> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = vehicleInsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid vehicle payload.", {
        issues: parsed.error.flatten(),
      }),
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      registration_number: parsed.data.registrationNumber,
      display_name: parsed.data.displayName,
      vehicle_type: parsed.data.vehicleType ?? null,
      active: parsed.data.active,
    })
    .select("*")
    .single();
  if (error || !data) {
    return { ok: false, error: appError("INTERNAL_ERROR", error?.message ?? "Insert failed") };
  }
  return { ok: true, data: data as VehicleRow };
}

export async function updateVehicle(input: unknown): Promise<ActionResult<VehicleRow>> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = vehicleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid vehicle update.", {
        issues: parsed.error.flatten(),
      }),
    };
  }
  const { id, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.registrationNumber !== undefined) patch.registration_number = rest.registrationNumber;
  if (rest.displayName !== undefined) patch.display_name = rest.displayName;
  if (rest.vehicleType !== undefined) patch.vehicle_type = rest.vehicleType;
  if (rest.active !== undefined) patch.active = rest.active;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("vehicles").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) {
    return { ok: false, error: appError("INTERNAL_ERROR", error.message) };
  }
  if (!data) {
    return { ok: false, error: appError("NOT_FOUND", "Vehicle not found.") };
  }
  return { ok: true, data: data as VehicleRow };
}

export async function deactivateVehicle(id: string): Promise<ActionResult<VehicleRow>> {
  return updateVehicle({ id, active: false });
}

export async function createDriver(input: unknown): Promise<ActionResult<DriverRow>> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = driverInsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid driver payload.", {
        issues: parsed.error.flatten(),
      }),
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("drivers")
    .insert({
      full_name: parsed.data.fullName,
      employee_number: parsed.data.employeeNumber ?? null,
      active: parsed.data.active,
    })
    .select("*")
    .single();
  if (error || !data) {
    return { ok: false, error: appError("INTERNAL_ERROR", error?.message ?? "Insert failed") };
  }
  return { ok: true, data: data as DriverRow };
}

export async function updateDriver(input: unknown): Promise<ActionResult<DriverRow>> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = driverUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid driver update.", {
        issues: parsed.error.flatten(),
      }),
    };
  }
  const { id, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.fullName !== undefined) patch.full_name = rest.fullName;
  if (rest.employeeNumber !== undefined) patch.employee_number = rest.employeeNumber;
  if (rest.active !== undefined) patch.active = rest.active;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("drivers").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) {
    return { ok: false, error: appError("INTERNAL_ERROR", error.message) };
  }
  if (!data) {
    return { ok: false, error: appError("NOT_FOUND", "Driver not found.") };
  }
  return { ok: true, data: data as DriverRow };
}

export async function deactivateDriver(id: string): Promise<ActionResult<DriverRow>> {
  return updateDriver({ id, active: false });
}

export async function createCustomer(input: unknown): Promise<ActionResult<CustomerRow>> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = customerInsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid customer payload.", {
        issues: parsed.error.flatten(),
      }),
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: parsed.data.name,
      external_reference: parsed.data.externalReference ?? null,
      active: parsed.data.active,
    })
    .select("*")
    .single();
  if (error || !data) {
    return { ok: false, error: appError("INTERNAL_ERROR", error?.message ?? "Insert failed") };
  }
  return { ok: true, data: data as CustomerRow };
}

export async function updateCustomer(input: unknown): Promise<ActionResult<CustomerRow>> {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return { ok: false, error: auth };
  }
  const parsed = customerUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION_ERROR", "Invalid customer update.", {
        issues: parsed.error.flatten(),
      }),
    };
  }
  const { id, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.name !== undefined) patch.name = rest.name;
  if (rest.externalReference !== undefined) patch.external_reference = rest.externalReference;
  if (rest.active !== undefined) patch.active = rest.active;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("customers").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) {
    return { ok: false, error: appError("INTERNAL_ERROR", error.message) };
  }
  if (!data) {
    return { ok: false, error: appError("NOT_FOUND", "Customer not found.") };
  }
  return { ok: true, data: data as CustomerRow };
}

export async function deactivateCustomer(id: string): Promise<ActionResult<CustomerRow>> {
  return updateCustomer({ id, active: false });
}
