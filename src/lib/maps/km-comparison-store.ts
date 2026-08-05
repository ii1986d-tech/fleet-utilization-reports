import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  kmDeltaError,
  type KmComparisonResult,
  type KmComparisonRow,
  type KmDeltaError,
  type KmDeltaSource,
  type KmDeltaStatus,
} from "@/lib/maps/km-delta-types";

export type KmComparisonStore = {
  getByOrderId(orderId: string): Promise<KmComparisonRow | null | KmDeltaError>;
  upsert(result: KmComparisonResult): Promise<KmComparisonRow | KmDeltaError>;
};

type DbRow = {
  id: string;
  order_id: string;
  paid_km: number | string | null;
  paid_km_manual: number | string | null;
  actual_km: number | string | null;
  actual_km_manual: number | string | null;
  direct_km: number | string | null;
  delta_km: number | string | null;
  delta_percent: number | string | null;
  status: string;
  source: string;
  route_url: string | null;
  manual_route_url: string | null;
  effective_route_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: DbRow): KmComparisonRow {
  return {
    id: row.id,
    orderId: row.order_id,
    paidKm: num(row.paid_km),
    paidKmManual: num(row.paid_km_manual),
    actualKm: num(row.actual_km),
    actualKmManual: num(row.actual_km_manual),
    directKm: num(row.direct_km),
    deltaKm: num(row.delta_km),
    deltaPercent: num(row.delta_percent),
    status: row.status as KmDeltaStatus,
    source: row.source as KmDeltaSource,
    routeUrl: row.route_url,
    manualRouteUrl: row.manual_route_url,
    effectiveRouteUrl: row.effective_route_url,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToResult(row: KmComparisonRow): KmComparisonResult {
  return {
    orderId: row.orderId,
    paidKm: row.paidKmManual ?? row.paidKm,
    paidKmExtracted: row.paidKm,
    paidKmManual: row.paidKmManual,
    actualKm: row.actualKmManual ?? row.actualKm,
    actualKmCalculated: row.actualKm,
    actualKmManual: row.actualKmManual,
    directKm: row.directKm,
    deltaKm: row.deltaKm,
    deltaPercent: row.deltaPercent,
    status: row.status,
    source: row.source,
    routeUrl: row.effectiveRouteUrl ?? row.manualRouteUrl ?? row.routeUrl,
    routeUrlAuto: row.routeUrl,
    manualRouteUrl: row.manualRouteUrl,
    errorMessage: row.errorMessage,
  };
}

/** In-memory store for unit tests (no network). */
export class MemoryKmComparisonStore implements KmComparisonStore {
  private byOrder = new Map<string, KmComparisonRow>();

  clear(): void {
    this.byOrder.clear();
  }

  async getByOrderId(
    orderId: string,
  ): Promise<KmComparisonRow | null | KmDeltaError> {
    return this.byOrder.get(orderId) ?? null;
  }

  async upsert(result: KmComparisonResult): Promise<KmComparisonRow | KmDeltaError> {
    const existing = this.byOrder.get(result.orderId);
    const now = new Date().toISOString();
    const row: KmComparisonRow = {
      id: existing?.id ?? crypto.randomUUID(),
      orderId: result.orderId,
      paidKm: result.paidKmExtracted,
      paidKmManual: result.paidKmManual,
      actualKm: result.actualKmCalculated,
      actualKmManual: result.actualKmManual,
      directKm: result.directKm,
      deltaKm: result.deltaKm,
      deltaPercent: result.deltaPercent,
      status: result.status,
      source: result.source,
      routeUrl: result.routeUrlAuto,
      manualRouteUrl: result.manualRouteUrl,
      effectiveRouteUrl: result.routeUrl,
      errorMessage: result.errorMessage,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.byOrder.set(result.orderId, row);
    return row;
  }
}

export class SupabaseKmComparisonStore implements KmComparisonStore {
  async getByOrderId(
    orderId: string,
  ): Promise<KmComparisonRow | null | KmDeltaError> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("transport_order_km_comparison")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) {
        console.warn("[maps] km_comparison_read_failed");
        return kmDeltaError("DATABASE_WRITE_FAILED", "Failed to read KM comparison.");
      }
      if (!data) return null;
      return mapRow(data as DbRow);
    } catch {
      console.warn("[maps] km_comparison_read_failed");
      return kmDeltaError("DATABASE_WRITE_FAILED", "Failed to read KM comparison.");
    }
  }

  async upsert(result: KmComparisonResult): Promise<KmComparisonRow | KmDeltaError> {
    try {
      const supabase = await createSupabaseServerClient();
      const payload = {
        order_id: result.orderId,
        paid_km: result.paidKmExtracted,
        paid_km_manual: result.paidKmManual,
        actual_km: result.actualKmCalculated,
        actual_km_manual: result.actualKmManual,
        direct_km: result.directKm,
        delta_km: result.deltaKm,
        delta_percent: result.deltaPercent,
        status: result.status,
        source: result.source,
        route_url: result.routeUrlAuto,
        manual_route_url: result.manualRouteUrl,
        effective_route_url: result.routeUrl,
        error_message: result.errorMessage,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("transport_order_km_comparison")
        .upsert(payload, { onConflict: "order_id" })
        .select("*")
        .single();
      if (error || !data) {
        console.warn("[maps] km_comparison_write_failed");
        return kmDeltaError("DATABASE_WRITE_FAILED", "Failed to save KM comparison.");
      }
      return mapRow(data as DbRow);
    } catch {
      console.warn("[maps] km_comparison_write_failed");
      return kmDeltaError("DATABASE_WRITE_FAILED", "Failed to save KM comparison.");
    }
  }
}

export function createKmComparisonStore(): KmComparisonStore {
  return new SupabaseKmComparisonStore();
}
