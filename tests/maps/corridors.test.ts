import { afterEach, describe, expect, it } from "vitest";
import { MemoryCorridorStore } from "@/lib/maps/corridor-store";
import {
  assertCanWriteCorridors,
  createCorridor,
  deactivateCorridor,
  listActiveCorridors,
} from "@/lib/maps/corridor-service";
import { isCorridorError } from "@/lib/maps/corridor-types";
import { MemoryKmComparisonStore } from "@/lib/maps/km-comparison-store";
import { calculateKmDelta } from "@/lib/maps/km-delta-service";
import { isKmDeltaError } from "@/lib/maps/km-delta-types";
import { buildStaticRouteUrl } from "@/lib/maps/static-link";
import type { WorkingTransportOrder } from "@/lib/transport-orders/types";

function makeOrder(): WorkingTransportOrder {
  return {
    header: {
      orderId: "order-1",
      documentId: "doc-1",
      version: 1,
      tourNumber: "T1",
      borderoNumber: null,
      businessIdentifier: "T1",
      referenceNumbers: [],
      responsibleClerk: null,
      remarks: null,
      freight: { amount: null, currency: null },
      paidKilometers: 800,
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
    stops: [
      {
        stopId: "s1",
        orderId: "order-1",
        sequence: 1,
        type: "pickup",
        address: {
          company: null,
          street: null,
          houseNumber: null,
          postalCode: null,
          city: "Hamburg",
          country: "DE",
          rawAddressText: null,
        },
        date: null,
        timeWindow: null,
        references: [],
        remarks: null,
      },
      {
        stopId: "s2",
        orderId: "order-1",
        sequence: 2,
        type: "delivery",
        address: {
          company: null,
          street: null,
          houseNumber: null,
          postalCode: null,
          city: "München",
          country: "DE",
          rawAddressText: null,
        },
        date: null,
        timeWindow: null,
        references: [],
        remarks: null,
      },
    ],
    partialLoadPositions: [],
    legs: [],
    fieldReviews: [],
    snapshot: null,
    auditEvents: [],
  };
}

describe("corridor service", () => {
  const store = new MemoryCorridorStore();

  afterEach(() => {
    store.clear();
  });

  it("lists only active corridors", async () => {
    await createCorridor(
      {
        name: "A",
        origin: "Hamburg",
        destination: "Berlin",
        active: true,
      },
      { store, actorRole: "admin" },
    );
    const inactive = await createCorridor(
      {
        name: "B",
        origin: "Köln",
        destination: "Stuttgart",
        active: true,
      },
      { store, actorRole: "admin" },
    );
    if (isCorridorError(inactive)) throw inactive;
    await deactivateCorridor(inactive.id, { store, actorRole: "admin" });
    const active = await listActiveCorridors({ store });
    if (isCorridorError(active)) throw active;
    expect(active).toHaveLength(1);
    expect(active[0]?.name).toBe("A");
  });

  it("manager/viewer cannot write corridors", () => {
    expect(assertCanWriteCorridors("manager")?.code).toBe("FORBIDDEN");
    expect(assertCanWriteCorridors("viewer")?.code).toBe("FORBIDDEN");
    expect(assertCanWriteCorridors("admin")).toBeNull();
  });

  it("builds static Maps URL with waypoints", () => {
    const url = buildStaticRouteUrl("Hamburg", "München", ["Kassel", "Nürnberg"]);
    expect(url).toContain("google.com/maps/dir/");
    expect(url).toContain("Kassel");
    expect(url).toContain("N%C3%BCrnberg");
  });
});

describe("km delta with corridor selection", () => {
  it("uses corridor origin/destination for calculation", async () => {
    const corridorStore = new MemoryCorridorStore();
    const kmStore = new MemoryKmComparisonStore();
    const corridor = await createCorridor(
      {
        name: "Hamburg → München (A7)",
        origin: "Hamburg",
        destination: "München",
        waypoints: ["Kassel", "Nürnberg"],
      },
      { store: corridorStore, actorRole: "admin" },
    );
    if (isCorridorError(corridor)) throw corridor;

    const result = await calculateKmDelta("order-1", {
      store: kmStore,
      corridorStore,
      corridorId: corridor.id,
      orderLoader: { getOrder: async () => makeOrder() },
      calculateRouteImpl: async (origin, destination) => {
        expect(origin).toBe("Hamburg");
        expect(destination).toBe("München");
        return {
          distanceKm: 780,
          durationMin: 420,
          routeUrl: "https://www.google.com/maps/dir/Hamburg/M%C3%BCnchen",
          source: "api",
        };
      },
    });
    if (isKmDeltaError(result)) throw result;
    expect(result.corridorId).toBe(corridor.id);
    expect(result.actualKm).toBe(780);
    expect(result.routeUrlAuto).toContain("Kassel");
  });
});
