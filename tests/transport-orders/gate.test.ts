import { describe, expect, it } from "vitest";
import { evaluateCompletionGate, isWeiterEnabledInUi } from "@/lib/transport-orders/review/gate";
import type {
  FieldReview,
  TransportOrderHeader,
  TransportOrderStop,
} from "@/lib/transport-orders/types";

function header(over: Partial<TransportOrderHeader> = {}): TransportOrderHeader {
  return {
    orderId: "11111111-1111-1111-1111-111111111111",
    documentId: "22222222-2222-2222-2222-222222222222",
    version: 1,
    tourNumber: "T-1",
    borderoNumber: null,
    businessIdentifier: "T-1",
    referenceNumbers: [],
    responsibleClerk: null,
    remarks: null,
    freight: { amount: 10, currency: "EUR" },
    paidKilometers: null,
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
    updatedBy: "user",
    ...over,
  };
}

function stops(): TransportOrderStop[] {
  return [
    {
      stopId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      orderId: "11111111-1111-1111-1111-111111111111",
      sequence: 1,
      type: "pickup",
      address: {
        company: "A",
        street: null,
        houseNumber: null,
        postalCode: null,
        city: "CityA",
        country: "DE",
        rawAddressText: null,
      },
      date: null,
      timeWindow: null,
      references: [],
      remarks: null,
    },
    {
      stopId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      orderId: "11111111-1111-1111-1111-111111111111",
      sequence: 2,
      type: "delivery",
      address: {
        company: "B",
        street: null,
        houseNumber: null,
        postalCode: null,
        city: "CityB",
        country: "DE",
        rawAddressText: null,
      },
      date: null,
      timeWindow: null,
      references: [],
      remarks: null,
    },
  ];
}

function confirmedFields(orderStops: TransportOrderStop[]): FieldReview[] {
  const fields: FieldReview[] = [
    {
      identity: {
        entityType: "order",
        entityId: "11111111-1111-1111-1111-111111111111",
        fieldName: "businessIdentifier",
      },
      extractedValue: "T-1",
      currentValue: "T-1",
      reviewStatus: "confirmed",
      extractionConfidence: 0.9,
      sourcePage: 1,
      sourceSnippet: null,
      provider: "mock",
      model: "mock-model",
      extractionRunId: null,
      editedBy: null,
      editedAt: null,
      confirmedBy: "u",
      confirmedAt: new Date().toISOString(),
      note: null,
    },
  ];
  for (const s of orderStops) {
    for (const fieldName of ["type", "city"] as const) {
      fields.push({
        identity: { entityType: "stop", entityId: s.stopId, fieldName },
        extractedValue: fieldName === "type" ? s.type : s.address.city,
        currentValue: fieldName === "type" ? s.type : s.address.city,
        reviewStatus: "confirmed",
        extractionConfidence: 0.9,
        sourcePage: 1,
        sourceSnippet: null,
        provider: "mock",
        model: "mock-model",
        extractionRunId: null,
        editedBy: null,
        editedAt: null,
        confirmedBy: "u",
        confirmedAt: new Date().toISOString(),
        note: null,
      });
    }
  }
  return fields;
}

describe("PACK-006 completion gate", () => {
  it("passes when catalog + structural minimum + version match", () => {
    const s = stops();
    const result = evaluateCompletionGate({
      header: header(),
      stops: s,
      partialLoadPositions: [],
      legs: [],
      fieldReviews: confirmedFields(s),
      expectedVersion: 1,
    });
    expect(result.ok).toBe(true);
    expect(
      isWeiterEnabledInUi({
        header: header(),
        stops: s,
        partialLoadPositions: [],
        legs: [],
        fieldReviews: confirmedFields(s),
        expectedVersion: 1,
      }),
    ).toBe(true);
  });

  it("rejects stale expected_version with ORDER_VERSION_CONFLICT", () => {
    const s = stops();
    const result = evaluateCompletionGate({
      header: header({ version: 2 }),
      stops: s,
      partialLoadPositions: [],
      legs: [],
      fieldReviews: confirmedFields(s),
      expectedVersion: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ORDER_VERSION_CONFLICT");
  });

  it("rejects unresolved fields with ORDER_REVIEW_INCOMPLETE", () => {
    const s = stops();
    const fields = confirmedFields(s);
    fields[0] = { ...fields[0], reviewStatus: "pending_review" };
    const result = evaluateCompletionGate({
      header: header(),
      stops: s,
      partialLoadPositions: [],
      legs: [],
      fieldReviews: fields,
      expectedVersion: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ORDER_REVIEW_INCOMPLETE");
      expect(result.unresolved.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid leg stop references", () => {
    const s = stops();
    const result = evaluateCompletionGate({
      header: header(),
      stops: s,
      partialLoadPositions: [],
      legs: [
        {
          legId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          orderId: "11111111-1111-1111-1111-111111111111",
          sequence: 1,
          originStopId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          destinationStopId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          references: [],
          distanceKm: null,
        },
      ],
      fieldReviews: confirmedFields(s),
      expectedVersion: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ORDER_REVIEW_INCOMPLETE");
  });
});
