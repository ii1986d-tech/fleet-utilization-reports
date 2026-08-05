import { canReviewTransportOrders, type AppRole } from "@/lib/auth/roles";
import {
  calculateDirectKmFromCoords,
  type LatLon,
} from "@/lib/maps/haversine";
import {
  createKmComparisonStore,
  rowToResult,
  type KmComparisonStore,
} from "@/lib/maps/km-comparison-store";
import {
  isKmDeltaError,
  kmDeltaError,
  type KmComparisonResult,
  type KmDeltaError,
  type KmDeltaSource,
  type KmDeltaStatus,
  type ManualOverride,
} from "@/lib/maps/km-delta-types";
import {
  calculateRoute,
  type CalculateRouteOptions,
} from "@/lib/maps/route-service";
import type { RouteResult } from "@/lib/maps/types";
import type {
  TransportOrderStop,
  WorkingTransportOrder,
} from "@/lib/transport-orders/types";
import type { AppError } from "@/lib/assignments/errors";

function isOrderLoadError(
  value: WorkingTransportOrder | AppError,
): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "httpStatus" in value &&
    !("header" in value)
  );
}

export type OrderLoader = {
  getOrder(orderId: string): Promise<WorkingTransportOrder | AppError>;
};

export type CalculateKmDeltaOptions = {
  store?: KmComparisonStore;
  orderLoader?: OrderLoader;
  calculateRouteImpl?: (
    origin: string,
    destination: string,
    options?: CalculateRouteOptions,
  ) => Promise<RouteResult>;
  routeOptions?: CalculateRouteOptions;
  /** Optional coords when available (PACK-006 does not supply yet). */
  originCoords?: LatLon | null;
  destinationCoords?: LatLon | null;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatStopLabel(stop: TransportOrderStop): string {
  const a = stop.address;
  const chunks = [
    a.company,
    a.street,
    a.houseNumber,
    a.postalCode,
    a.city,
    a.country,
    a.rawAddressText,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return chunks.join(", ");
}

export function extractOriginDestination(
  stops: TransportOrderStop[],
): { origin: string; destination: string } | null {
  if (!stops.length) return null;
  const ordered = stops.slice().sort((a, b) => a.sequence - b.sequence);
  const pickups = ordered.filter((s) => s.type === "pickup");
  const deliveries = ordered.filter((s) => s.type === "delivery");
  const originStop = pickups[0] ?? ordered[0];
  const destStop =
    deliveries.length > 0 ? deliveries[deliveries.length - 1] : ordered[ordered.length - 1];
  if (!originStop || !destStop) return null;
  const origin = formatStopLabel(originStop);
  const destination = formatStopLabel(destStop);
  if (!origin || !destination) return null;
  return { origin, destination };
}

export function computeDelta(
  effectivePaidKm: number | null,
  effectiveActualKm: number | null,
): { deltaKm: number | null; deltaPercent: number | null } {
  if (
    effectivePaidKm === null ||
    effectiveActualKm === null ||
    effectiveActualKm === 0
  ) {
    return { deltaKm: null, deltaPercent: null };
  }
  const deltaKm = round2(effectivePaidKm - effectiveActualKm);
  const deltaPercent = round2(
    ((effectivePaidKm - effectiveActualKm) / effectiveActualKm) * 100,
  );
  return { deltaKm, deltaPercent };
}

export function resolveKmStatus(input: {
  noStops: boolean;
  paidKmExtracted: number | null;
  effectiveActualKm: number | null;
  deltaPercent: number | null;
  mapsUnavailable: boolean;
}): KmDeltaStatus {
  if (input.noStops) return "error";
  if (input.mapsUnavailable || input.effectiveActualKm === null) return "error";
  if (input.deltaPercent !== null) {
    const abs = Math.abs(input.deltaPercent);
    if (abs >= 10) return "error";
    if (abs >= 5) return "warning";
  }
  if (input.paidKmExtracted === null || input.paidKmExtracted === 0) {
    return "warning";
  }
  return "ok";
}

function hasManualOverride(input: {
  paidKmManual: number | null;
  actualKmManual: number | null;
  manualRouteUrl: string | null;
}): boolean {
  return (
    input.paidKmManual !== null ||
    input.actualKmManual !== null ||
    (typeof input.manualRouteUrl === "string" && input.manualRouteUrl.trim() !== "")
  );
}

function resolveSource(
  routeSource: KmDeltaSource | RouteResult["source"],
  manuals: {
    paidKmManual: number | null;
    actualKmManual: number | null;
    manualRouteUrl: string | null;
  },
): KmDeltaSource {
  if (hasManualOverride(manuals)) return "manual";
  switch (routeSource) {
    case "api":
    case "cache":
    case "fallback":
    case "manual":
      return routeSource;
    default: {
      const _exhaustive: never = routeSource;
      return _exhaustive;
    }
  }
}

function buildResult(input: {
  orderId: string;
  paidKmExtracted: number | null;
  paidKmManual: number | null;
  actualKmCalculated: number | null;
  actualKmManual: number | null;
  directKm: number | null;
  routeUrlAuto: string | null;
  manualRouteUrl: string | null;
  routeSource: RouteResult["source"] | KmDeltaSource;
  errorMessage: string | null;
  noStops: boolean;
  mapsUnavailable: boolean;
}): KmComparisonResult {
  const effectivePaid = input.paidKmManual ?? input.paidKmExtracted;
  const effectiveActual = input.actualKmManual ?? input.actualKmCalculated;
  const effectiveRoute =
    input.manualRouteUrl && input.manualRouteUrl.trim() !== ""
      ? input.manualRouteUrl
      : input.routeUrlAuto;
  const { deltaKm, deltaPercent } = computeDelta(effectivePaid, effectiveActual);
  const status = resolveKmStatus({
    noStops: input.noStops,
    paidKmExtracted: input.paidKmExtracted,
    effectiveActualKm: effectiveActual,
    deltaPercent,
    mapsUnavailable: input.mapsUnavailable,
  });
  const source = resolveSource(input.routeSource, {
    paidKmManual: input.paidKmManual,
    actualKmManual: input.actualKmManual,
    manualRouteUrl: input.manualRouteUrl,
  });

  let errorMessage = input.errorMessage;
  if (input.noStops) errorMessage = "No stops found";
  else if (input.mapsUnavailable && !input.actualKmManual) {
    errorMessage = errorMessage ?? "Maps API unavailable";
  }

  return {
    orderId: input.orderId,
    paidKm: effectivePaid,
    paidKmExtracted: input.paidKmExtracted,
    paidKmManual: input.paidKmManual,
    actualKm: effectiveActual,
    actualKmCalculated: input.actualKmCalculated,
    actualKmManual: input.actualKmManual,
    directKm: input.directKm,
    deltaKm,
    deltaPercent,
    status,
    source,
    routeUrl: effectiveRoute,
    routeUrlAuto: input.routeUrlAuto,
    manualRouteUrl: input.manualRouteUrl,
    errorMessage,
  };
}

function actualFromRoute(route: RouteResult): {
  actualKmCalculated: number | null;
  mapsUnavailable: boolean;
} {
  if (route.source === "fallback") {
    return { actualKmCalculated: null, mapsUnavailable: true };
  }
  if (!Number.isFinite(route.distanceKm) || route.distanceKm <= 0) {
    return { actualKmCalculated: null, mapsUnavailable: true };
  }
  return { actualKmCalculated: round2(route.distanceKm), mapsUnavailable: false };
}

export function assertCanWriteKmDelta(role: AppRole): KmDeltaError | null {
  if (!canReviewTransportOrders(role)) {
    return kmDeltaError("FORBIDDEN", "Admin or manager role required for KM overrides.");
  }
  return null;
}

export async function calculateKmDelta(
  orderId: string,
  options: CalculateKmDeltaOptions = {},
): Promise<KmComparisonResult | KmDeltaError> {
  const store = options.store ?? createKmComparisonStore();
  const orderLoader = options.orderLoader;
  if (!orderLoader) {
    return kmDeltaError("VALIDATION_ERROR", "Order loader is required.");
  }

  const order = await orderLoader.getOrder(orderId);
  if (isOrderLoadError(order)) {
    return kmDeltaError("ORDER_NOT_FOUND", "Transport order not found.");
  }

  const existing = await store.getByOrderId(orderId);
  if (isKmDeltaError(existing)) return existing;

  const paidKmExtracted = order.header.paidKilometers;
  const paidKmManual = existing?.paidKmManual ?? null;
  const actualKmManual = existing?.actualKmManual ?? null;
  const manualRouteUrl = existing?.manualRouteUrl ?? null;

  const endpoints = extractOriginDestination(order.stops);
  if (!endpoints) {
    const result = buildResult({
      orderId,
      paidKmExtracted,
      paidKmManual,
      actualKmCalculated: null,
      actualKmManual,
      directKm: null,
      routeUrlAuto: null,
      manualRouteUrl,
      routeSource: "fallback",
      errorMessage: "No stops found",
      noStops: true,
      mapsUnavailable: true,
    });
    const saved = await store.upsert(result);
    if (isKmDeltaError(saved)) return saved;
    return rowToResult(saved);
  }

  const routeImpl = options.calculateRouteImpl ?? calculateRoute;
  const route = await routeImpl(
    endpoints.origin,
    endpoints.destination,
    options.routeOptions,
  );
  const { actualKmCalculated, mapsUnavailable } = actualFromRoute(route);
  const directKm = calculateDirectKmFromCoords(
    options.originCoords ?? null,
    options.destinationCoords ?? null,
  );

  const result = buildResult({
    orderId,
    paidKmExtracted,
    paidKmManual,
    actualKmCalculated,
    actualKmManual,
    directKm,
    routeUrlAuto: route.routeUrl,
    manualRouteUrl,
    routeSource: route.source,
    errorMessage: null,
    noStops: false,
    mapsUnavailable,
  });

  const saved = await store.upsert(result);
  if (isKmDeltaError(saved)) return saved;
  return rowToResult(saved);
}

export async function setManualOverride(
  orderId: string,
  overrides: ManualOverride,
  options: { store?: KmComparisonStore; actorRole?: AppRole } = {},
): Promise<KmComparisonResult | KmDeltaError> {
  if (options.actorRole) {
    const denied = assertCanWriteKmDelta(options.actorRole);
    if (denied) return denied;
  }

  const store = options.store ?? createKmComparisonStore();
  const existing = await store.getByOrderId(orderId);
  if (isKmDeltaError(existing)) return existing;
  if (!existing) {
    return kmDeltaError("KM_COMPARISON_NOT_FOUND", "KM comparison not found.");
  }

  const paidKmManual =
    overrides.paidKmManual !== undefined
      ? overrides.paidKmManual
      : existing.paidKmManual;
  const actualKmManual =
    overrides.actualKmManual !== undefined
      ? overrides.actualKmManual
      : existing.actualKmManual;
  const manualRouteUrl =
    overrides.manualRouteUrl !== undefined
      ? overrides.manualRouteUrl
      : existing.manualRouteUrl;

  if (
    paidKmManual !== null &&
    paidKmManual !== undefined &&
    (!Number.isFinite(paidKmManual) || paidKmManual < 0)
  ) {
    return kmDeltaError("VALIDATION_ERROR", "paidKmManual must be a non-negative number.");
  }
  if (
    actualKmManual !== null &&
    actualKmManual !== undefined &&
    (!Number.isFinite(actualKmManual) || actualKmManual < 0)
  ) {
    return kmDeltaError("VALIDATION_ERROR", "actualKmManual must be a non-negative number.");
  }

  console.warn("[maps] km_manual_override");

  const mapsUnavailable = existing.actualKm === null && actualKmManual === null;
  const result = buildResult({
    orderId,
    paidKmExtracted: existing.paidKm,
    paidKmManual: paidKmManual ?? null,
    actualKmCalculated: existing.actualKm,
    actualKmManual: actualKmManual ?? null,
    directKm: existing.directKm,
    routeUrlAuto: existing.routeUrl,
    manualRouteUrl: manualRouteUrl ?? null,
    routeSource: "manual",
    errorMessage: null,
    noStops: false,
    mapsUnavailable,
  });

  // Force source manual when any override present (buildResult already does).
  const saved = await store.upsert({
    ...result,
    source: hasManualOverride({
      paidKmManual: result.paidKmManual,
      actualKmManual: result.actualKmManual,
      manualRouteUrl: result.manualRouteUrl,
    })
      ? "manual"
      : existing.source === "manual"
        ? "fallback"
        : existing.source,
  });
  if (isKmDeltaError(saved)) return saved;
  return rowToResult(saved);
}

export async function getKmComparison(
  orderId: string,
  options: { store?: KmComparisonStore } = {},
): Promise<KmComparisonResult | null | KmDeltaError> {
  const store = options.store ?? createKmComparisonStore();
  const row = await store.getByOrderId(orderId);
  if (isKmDeltaError(row)) return row;
  if (!row) return null;
  return rowToResult(row);
}
