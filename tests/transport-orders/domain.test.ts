import { describe, expect, it } from "vitest";
import { appError } from "@/lib/assignments/errors";
import {
  canReviewTransportOrders,
  canUploadTransportOrders,
  canReadTransportOrders,
} from "@/lib/auth/roles";
import {
  EXTRACTION_SCHEMA_VERSION,
  parseExtractionResult,
  safeParseExtractionResult,
} from "@/lib/transport-orders/schema";
import {
  isBlockingReviewStatus,
  isTerminalReviewStatus,
  reviewStatusLabelDe,
  statusAfterEdit,
  usesConfirmedVisual,
} from "@/lib/transport-orders/review/states";

describe("PACK-006 review states", () => {
  it("classifies terminal and blocking states", () => {
    expect(isTerminalReviewStatus("confirmed")).toBe(true);
    expect(isTerminalReviewStatus("missing_confirmed")).toBe(true);
    expect(isTerminalReviewStatus("not_applicable")).toBe(true);
    expect(isBlockingReviewStatus("pending_review")).toBe(true);
    expect(isBlockingReviewStatus("conflict")).toBe(true);
    expect(isBlockingReviewStatus("extraction_failed")).toBe(true);
    expect(isBlockingReviewStatus("confirmed")).toBe(false);
  });

  it("edit revokes confirmed-family to edited_pending_review", () => {
    expect(statusAfterEdit("confirmed")).toBe("edited_pending_review");
    expect(statusAfterEdit("missing_confirmed")).toBe("edited_pending_review");
    expect(statusAfterEdit("not_applicable")).toBe("edited_pending_review");
  });

  it("labels and confirmed visual are independent of color as SoT", () => {
    expect(reviewStatusLabelDe("confirmed")).toContain("Bestätigt");
    expect(reviewStatusLabelDe("not_applicable")).toBe("Nicht zutreffend");
    expect(usesConfirmedVisual("confirmed")).toBe(true);
    expect(usesConfirmedVisual("not_applicable")).toBe(true);
    expect(usesConfirmedVisual("pending_review")).toBe(false);
  });
});

describe("PACK-006 auth helpers", () => {
  it("admin and manager may upload/review; viewer read-only", () => {
    expect(canReviewTransportOrders("admin")).toBe(true);
    expect(canReviewTransportOrders("manager")).toBe(true);
    expect(canReviewTransportOrders("viewer")).toBe(false);
    expect(canUploadTransportOrders("manager")).toBe(true);
    expect(canReadTransportOrders("viewer")).toBe(true);
  });
});

describe("PACK-006 error codes", () => {
  it("maps required codes to HTTP statuses", () => {
    expect(appError("ORDER_VERSION_CONFLICT", "x").httpStatus).toBe(409);
    expect(appError("ORDER_REVIEW_INCOMPLETE", "x").httpStatus).toBe(409);
    expect(appError("IDEMPOTENCY_KEY_REUSE_MISMATCH", "x").httpStatus).toBe(409);
    expect(appError("INVALID_PDF", "x").httpStatus).toBe(400);
    expect(appError("INVALID_STOP_REFERENCE", "x").httpStatus).toBe(400);
    expect(appError("EXTRACTION_FAILED", "x").httpStatus).toBe(422);
  });
});

describe("PACK-006 extraction schema", () => {
  const valid = {
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    tourNumber: "T-1",
    borderoNumber: null,
    businessIdentifier: "T-1",
    referenceNumbers: [],
    responsibleClerk: null,
    remarks: null,
    freight: { amount: 100, currency: "EUR" },
    paidKilometers: null,
    emptyKilometers: null,
    truckLicensePlate: null,
    trailerLicensePlate: null,
    cargoWeightKg: null,
    cargoLoadingMeters: null,
    cargoVolumeM3: null,
    cargoDescription: null,
    stops: [
      {
        sequence: 1,
        type: "pickup" as const,
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
        sequence: 2,
        type: "delivery" as const,
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
    ],
    partialLoadPositions: [],
    transportLegs: [],
  };

  it("accepts valid extraction payload", () => {
    expect(parseExtractionResult(valid).tourNumber).toBe("T-1");
  });

  it("rejects malformed provider JSON", () => {
    const bad = safeParseExtractionResult({ ...valid, schemaVersion: "wrong" });
    expect(bad.success).toBe(false);
  });

  it("rejects negative cargo values", () => {
    const bad = safeParseExtractionResult({ ...valid, cargoWeightKg: -1 });
    expect(bad.success).toBe(false);
  });
});
