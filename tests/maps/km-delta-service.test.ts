import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateDirectKm,
  calculateDirectKmFromCoords,
} from "@/lib/maps/haversine";
import { MemoryKmComparisonStore } from "@/lib/maps/km-comparison-store";
import {
  assertCanWriteKmDelta,
  calculateKmDelta,
  computeDelta,
  extractOriginDestination,
  resolveKmStatus,
  setManualOverride,
} from "@/lib/maps/km-delta-service";
import { isKmDeltaError } from "@/lib/maps/km-delta-types";
import type { RouteResult } from "@/lib/maps/types";
import type {
  TransportOrderStop,
  WorkingTransportOrder,
} from "@/lib/transport-orders/types";

function stop(
  partial: Partial<TransportOrderStop> & {
    stopId: string;
    sequence: number;
    type: TransportOrderStop["type"];
    city: string;
  },
): TransportOrderStop {
  return {
    stopId: partial.stopId,
    orderId: partial.orderId ?? "order-1",
    sequence: partial.sequence,
    type: partial.type,
    address: {
      company: partial.address?.company ?? null,
      street: partial.address?.street ?? null,
      houseNumber: partial.address?.houseNumber ?? null,
      postalCode: partial.address?.postalCode ?? null,
      city: partial.city,
      country: partial.address?.country ?? "DE",
      rawAddressText: partial.address?.rawAddressText ?? null,
    },
    date: null,
    timeWindow: null,
    references: [],
    remarks: null,
  };
}

function makeOrder(input: {
  orderId?: string;
  paidKilometers?: number | null;
  stops?: TransportOrderStop[];
}): WorkingTransportOrder {
  const orderId = input.orderId ?? "order-1";
  const stops =
    input.stops ??
    [
      stop({ stopId: "s1", sequence: 1, type: "pickup", city: "Hamburg" }),
      stop({ stopId: "s2", sequence: 2, type: "delivery", city: "Berlin" }),
    ].map((s) => ({ ...s, orderId }));

  return {
    header: {
      orderId,
      documentId: "doc-1",
      version: 1,
      tourNumber: "T1",
      borderoNumber: null,
      businessIdentifier: "T1",
      referenceNumbers: [],
      responsibleClerk: null,
      remarks: null,
      freight: { amount: null, currency: null },
      paidKilometers: input.paidKilometers === undefined ? 300 : input.paidKilometers,
      emptyKilometers: null,
      truckLicensePlate: null,
      trailerLicensePlate: null,
      cargoWeightKg: null,
      cargoLoadingMeters: null,
      cargoVolumeM3: null,
      cargoDescription: null,
      mapsStaticUrl: null,
      stopOrderReviewStatus: "confirmed",
      reviewCompletedAt: null,
      updatedAt: new Date().toISOString(),
      updatedBy: null,
    },
    stops,
    partialLoadPositions: [],
    legs: [],
    fieldReviews: [],
    snapshot: null,
    auditEvents: [],
  };
}

function apiRoute(distanceKm: number): RouteResult {
  return {
    distanceKm,
    durationMin: 180,
    routeUrl: "https://www.google.com/maps/dir/Hamburg/Berlin",
    source: "api",
  };
}

describe("haversine", () => {
  it("returns correct distance for known city pair", () => {
    // Hamburg ≈ 53.55, 9.99 · Berlin ≈ 52.52, 13.41 ≈ 255 km
    const km = calculateDirectKm(53.55, 9.99, 52.52, 13.41);
    expect(km).toBeGreaterThan(240);
    expect(km).toBeLessThan(270);
  });

  it("returns null when coordinates not available", () => {
    expect(calculateDirectKmFromCoords(null, { lat: 1, lon: 2 })).toBeNull();
    expect(
      calculateDirectKmFromCoords({ lat: 1, lon: 2 }, null),
    ).toBeNull();
  });
});

describe("km delta helpers", () => {
  it("extracts origin/destination from pickup/delivery", () => {
    const ends = extractOriginDestination(makeOrder({}).stops);
    expect(ends?.origin).toContain("Hamburg");
    expect(ends?.destination).toContain("Berlin");
  });

  it("computes delta math", () => {
    expect(computeDelta(330, 300)).toEqual({ deltaKm: 30, deltaPercent: 10 });
  });

  it("resolves status thresholds", () => {
    expect(
      resolveKmStatus({
        noStops: false,
        paidKmExtracted: 300,
        effectiveActualKm: 300,
        deltaPercent: 3,
        mapsUnavailable: false,
      }),
    ).toBe("ok");
    expect(
      resolveKmStatus({
        noStops: false,
        paidKmExtracted: 300,
        effectiveActualKm: 300,
        deltaPercent: 7,
        mapsUnavailable: false,
      }),
    ).toBe("warning");
    expect(
      resolveKmStatus({
        noStops: false,
        paidKmExtracted: 330,
        effectiveActualKm: 300,
        deltaPercent: 10,
        mapsUnavailable: false,
      }),
    ).toBe("error");
  });
});

describe("km delta service", () => {
  let store: MemoryKmComparisonStore;

  afterEach(() => {
    store.clear();
    vi.restoreAllMocks();
  });

  function setup() {
    store = new MemoryKmComparisonStore();
    return store;
  }

  it("calculates delta for valid paid_km and actual_km", async () => {
    setup();
    const result = await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: 330 }) },
      calculateRouteImpl: async () => apiRoute(300),
    });
    expect(isKmDeltaError(result)).toBe(false);
    if (isKmDeltaError(result)) return;
    expect(result.deltaKm).toBe(30);
    expect(result.deltaPercent).toBe(10);
    expect(result.status).toBe("error");
    expect(result.source).toBe("api");
  });

  it("sets warning when paid_km is null", async () => {
    setup();
    const result = await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: null }) },
      calculateRouteImpl: async () => apiRoute(300),
    });
    expect(isKmDeltaError(result)).toBe(false);
    if (isKmDeltaError(result)) return;
    expect(result.status).toBe("warning");
    expect(result.deltaKm).toBeNull();
  });

  it("sets error when actual_km is null (API disabled / fallback)", async () => {
    setup();
    const result = await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({}) },
      calculateRouteImpl: async () => ({
        distanceKm: 0,
        durationMin: 0,
        routeUrl: "https://www.google.com/maps/dir/Hamburg/Berlin",
        source: "fallback",
      }),
    });
    expect(isKmDeltaError(result)).toBe(false);
    if (isKmDeltaError(result)) return;
    expect(result.actualKm).toBeNull();
    expect(result.status).toBe("error");
    expect(result.errorMessage).toBe("Maps API unavailable");
    expect(result.source).toBe("fallback");
  });

  it("ok when delta_percent < 5%", async () => {
    setup();
    const result = await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: 303 }) },
      calculateRouteImpl: async () => apiRoute(300),
    });
    if (isKmDeltaError(result)) throw result;
    expect(result.status).toBe("ok");
  });

  it("warning when 5% <= delta_percent < 10%", async () => {
    setup();
    const result = await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: 318 }) },
      calculateRouteImpl: async () => apiRoute(300),
    });
    if (isKmDeltaError(result)) throw result;
    expect(result.deltaPercent).toBe(6);
    expect(result.status).toBe("warning");
  });

  it("error when no stops found", async () => {
    setup();
    const result = await calculateKmDelta("order-1", {
      store,
      orderLoader: {
        getOrder: async () => makeOrder({ stops: [] }),
      },
      calculateRouteImpl: async () => apiRoute(300),
    });
    if (isKmDeltaError(result)) throw result;
    expect(result.status).toBe("error");
    expect(result.errorMessage).toBe("No stops found");
  });

  it("returns ORDER_NOT_FOUND when order missing", async () => {
    setup();
    const result = await calculateKmDelta("missing", {
      store,
      orderLoader: {
        getOrder: async () => ({
          code: "NOT_FOUND",
          message: "missing",
          httpStatus: 404,
        }),
      },
      calculateRouteImpl: async () => apiRoute(300),
    });
    expect(isKmDeltaError(result)).toBe(true);
    if (!isKmDeltaError(result)) return;
    expect(result.code).toBe("ORDER_NOT_FOUND");
  });

  it("UPSERT keeps one comparison per order", async () => {
    setup();
    const opts = {
      store,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: 310 }) },
      calculateRouteImpl: async () => apiRoute(300),
    };
    const first = await calculateKmDelta("order-1", opts);
    const second = await calculateKmDelta("order-1", {
      ...opts,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: 320 }) },
    });
    if (isKmDeltaError(first) || isKmDeltaError(second)) throw first;
    const row = await store.getByOrderId("order-1");
    expect(row && !isKmDeltaError(row) ? row.paidKm : null).toBe(320);
    expect(second.paidKmExtracted).toBe(320);
  });

  it("manual paid_km overrides extracted", async () => {
    setup();
    await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: 300 }) },
      calculateRouteImpl: async () => apiRoute(300),
    });
    const updated = await setManualOverride(
      "order-1",
      { paidKmManual: 350 },
      { store, actorRole: "manager" },
    );
    if (isKmDeltaError(updated)) throw updated;
    expect(updated.paidKm).toBe(350);
    expect(updated.paidKmExtracted).toBe(300);
    expect(updated.paidKmManual).toBe(350);
    expect(updated.source).toBe("manual");
  });

  it("manual actual_km overrides calculated", async () => {
    setup();
    await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: 300 }) },
      calculateRouteImpl: async () => apiRoute(280),
    });
    const updated = await setManualOverride(
      "order-1",
      { actualKmManual: 295 },
      { store, actorRole: "admin" },
    );
    if (isKmDeltaError(updated)) throw updated;
    expect(updated.actualKm).toBe(295);
    expect(updated.actualKmCalculated).toBe(280);
    expect(updated.source).toBe("manual");
  });

  it("manual_route_url overrides auto route url", async () => {
    setup();
    await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({}) },
      calculateRouteImpl: async () => apiRoute(300),
    });
    const manual =
      "https://www.google.com/maps/dir/?api=1&origin=Hamburg&destination=Berlin";
    const updated = await setManualOverride(
      "order-1",
      { manualRouteUrl: manual },
      { store, actorRole: "manager" },
    );
    if (isKmDeltaError(updated)) throw updated;
    expect(updated.routeUrl).toBe(manual);
    expect(updated.manualRouteUrl).toBe(manual);
    expect(updated.routeUrlAuto).toContain("google.com/maps");
    expect(updated.source).toBe("manual");
  });

  it("viewer cannot set manual override (403)", () => {
    const denied = assertCanWriteKmDelta("viewer");
    expect(denied?.code).toBe("FORBIDDEN");
    expect(denied?.httpStatus).toBe(403);
  });

  it("admin/manager can set manual override", async () => {
    setup();
    await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({}) },
      calculateRouteImpl: async () => apiRoute(300),
    });
    for (const role of ["admin", "manager"] as const) {
      expect(assertCanWriteKmDelta(role)).toBeNull();
      const updated = await setManualOverride(
        "order-1",
        { paidKmManual: 301 },
        { store, actorRole: role },
      );
      expect(isKmDeltaError(updated)).toBe(false);
    }
  });

  it("setManualOverride returns KM_COMPARISON_NOT_FOUND", async () => {
    setup();
    const result = await setManualOverride(
      "missing",
      { paidKmManual: 1 },
      { store, actorRole: "admin" },
    );
    expect(isKmDeltaError(result)).toBe(true);
    if (!isKmDeltaError(result)) return;
    expect(result.code).toBe("KM_COMPARISON_NOT_FOUND");
  });

  it("preserves manuals across recalculation", async () => {
    setup();
    await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: 300 }) },
      calculateRouteImpl: async () => apiRoute(300),
    });
    await setManualOverride(
      "order-1",
      { paidKmManual: 340 },
      { store, actorRole: "admin" },
    );
    const recalculated = await calculateKmDelta("order-1", {
      store,
      orderLoader: { getOrder: async () => makeOrder({ paidKilometers: 300 }) },
      calculateRouteImpl: async () => apiRoute(310),
    });
    if (isKmDeltaError(recalculated)) throw recalculated;
    expect(recalculated.paidKmManual).toBe(340);
    expect(recalculated.paidKm).toBe(340);
    expect(recalculated.actualKmCalculated).toBe(310);
    expect(recalculated.source).toBe("manual");
  });
});
