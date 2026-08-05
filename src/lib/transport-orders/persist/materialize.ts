import { randomUUID } from "node:crypto";
import type { ExtractionResult } from "@/lib/transport-orders/schema";
import type {
  FieldReview,
  PartialLoadPosition,
  TransportLeg,
  TransportOrderHeader,
  TransportOrderStop,
  WorkingTransportOrder,
} from "@/lib/transport-orders/types";

function field(
  entityType: FieldReview["identity"]["entityType"],
  entityId: string,
  fieldName: string,
  value: unknown,
  meta: { provider: string; model: string; runId: string },
): FieldReview {
  return {
    identity: { entityType, entityId, fieldName },
    extractedValue: value,
    currentValue: value,
    reviewStatus: "pending_review",
    extractionConfidence: null,
    sourcePage: null,
    sourceSnippet: null,
    provider: meta.provider,
    model: meta.model,
    extractionRunId: meta.runId,
    editedBy: null,
    editedAt: null,
    confirmedBy: null,
    confirmedAt: null,
    note: null,
  };
}

/**
 * Build working order + field reviews from a validated extraction result.
 * Does not invent position-level cargo when null.
 */
export function materializeWorkingOrder(input: {
  orderId: string;
  documentId: string;
  extractionRunId: string;
  extractionId: string;
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  result: ExtractionResult;
  actorId: string | null;
}): WorkingTransportOrder {
  const meta = {
    provider: input.provider,
    model: input.model,
    runId: input.extractionRunId,
  };
  const now = new Date().toISOString();

  const stops: TransportOrderStop[] = input.result.stops.map((s) => ({
    stopId: randomUUID(),
    orderId: input.orderId,
    sequence: s.sequence,
    type: s.type,
    address: { ...s.address },
    date: s.date,
    timeWindow: s.timeWindow,
    references: [...s.references],
    remarks: s.remarks,
  }));

  const bySequence = new Map(stops.map((s) => [s.sequence, s]));

  const partialLoadPositions: PartialLoadPosition[] = input.result.partialLoadPositions.map((p) => {
    const pickup = bySequence.get(p.pickupSequence);
    const delivery = bySequence.get(p.deliverySequence);
    if (!pickup || !delivery) {
      throw new Error("INVALID_STOP_REFERENCE: partial load sequence missing");
    }
    return {
      positionId: randomUUID(),
      orderId: input.orderId,
      positionNumber: p.positionNumber,
      pickupStopId: pickup.stopId,
      deliveryStopId: delivery.stopId,
      references: [...p.references],
      weightKg: p.weightKg,
      loadingMeters: p.loadingMeters,
      volumeM3: p.volumeM3,
    };
  });

  const legs: TransportLeg[] = input.result.transportLegs.map((l) => {
    const origin = bySequence.get(l.originSequence);
    const destination = bySequence.get(l.destinationSequence);
    if (!origin || !destination) {
      throw new Error("INVALID_STOP_REFERENCE: leg sequence missing");
    }
    return {
      legId: randomUUID(),
      orderId: input.orderId,
      sequence: l.sequence,
      originStopId: origin.stopId,
      destinationStopId: destination.stopId,
      references: [...l.references],
      distanceKm: l.distanceKm,
    };
  });

  const header: TransportOrderHeader = {
    orderId: input.orderId,
    documentId: input.documentId,
    version: 1,
    tourNumber: input.result.tourNumber,
    borderoNumber: input.result.borderoNumber,
    businessIdentifier: input.result.businessIdentifier ?? input.result.tourNumber,
    referenceNumbers: [...input.result.referenceNumbers],
    responsibleClerk: input.result.responsibleClerk,
    remarks: input.result.remarks,
    freight: { ...input.result.freight },
    paidKilometers: input.result.paidKilometers,
    emptyKilometers: input.result.emptyKilometers,
    truckLicensePlate: input.result.truckLicensePlate,
    trailerLicensePlate: input.result.trailerLicensePlate,
    cargoWeightKg: input.result.cargoWeightKg,
    cargoLoadingMeters: input.result.cargoLoadingMeters,
    cargoVolumeM3: input.result.cargoVolumeM3,
    cargoDescription: input.result.cargoDescription,
    mapsStaticUrl: null,
    stopOrderReviewStatus: "pending_review",
    reviewCompletedAt: null,
    updatedAt: now,
    updatedBy: input.actorId,
  };

  const fieldReviews: FieldReview[] = [
    field("order", input.orderId, "tourNumber", header.tourNumber, meta),
    field("order", input.orderId, "borderoNumber", header.borderoNumber, meta),
    field("order", input.orderId, "businessIdentifier", header.businessIdentifier, meta),
    field("order", input.orderId, "responsibleClerk", header.responsibleClerk, meta),
    field("order", input.orderId, "remarks", header.remarks, meta),
    field("order", input.orderId, "freightAmount", header.freight.amount, meta),
    field("order", input.orderId, "freightCurrency", header.freight.currency, meta),
    field("order", input.orderId, "paidKilometers", header.paidKilometers, meta),
    field("order", input.orderId, "emptyKilometers", header.emptyKilometers, meta),
    field("order", input.orderId, "truckLicensePlate", header.truckLicensePlate, meta),
    field("order", input.orderId, "trailerLicensePlate", header.trailerLicensePlate, meta),
    field("order", input.orderId, "cargoWeightKg", header.cargoWeightKg, meta),
    field("order", input.orderId, "cargoLoadingMeters", header.cargoLoadingMeters, meta),
    field("order", input.orderId, "cargoVolumeM3", header.cargoVolumeM3, meta),
    field("order", input.orderId, "cargoDescription", header.cargoDescription, meta),
  ];

  if (input.result.paidKilometersSource) {
    fieldReviews.push(
      field("order", input.orderId, "paidKilometersSource", input.result.paidKilometersSource, meta),
    );
  }
  if (input.result.freightSource) {
    fieldReviews.push(field("order", input.orderId, "freightSource", input.result.freightSource, meta));
  }

  for (const s of stops) {
    fieldReviews.push(
      field("stop", s.stopId, "type", s.type, meta),
      field("stop", s.stopId, "sequence", s.sequence, meta),
      field("stop", s.stopId, "company", s.address.company, meta),
      field("stop", s.stopId, "street", s.address.street, meta),
      field("stop", s.stopId, "postalCode", s.address.postalCode, meta),
      field("stop", s.stopId, "city", s.address.city, meta),
      field("stop", s.stopId, "country", s.address.country, meta),
      field("stop", s.stopId, "rawAddressText", s.address.rawAddressText, meta),
      field("stop", s.stopId, "date", s.date, meta),
      field("stop", s.stopId, "timeWindow", s.timeWindow, meta),
    );
  }

  for (const p of partialLoadPositions) {
    fieldReviews.push(
      field("partial_load_position", p.positionId, "pickupStopId", p.pickupStopId, meta),
      field("partial_load_position", p.positionId, "deliveryStopId", p.deliveryStopId, meta),
    );
  }
  for (const l of legs) {
    fieldReviews.push(
      field("transport_leg", l.legId, "originStopId", l.originStopId, meta),
      field("transport_leg", l.legId, "destinationStopId", l.destinationStopId, meta),
    );
  }

  return {
    header,
    stops,
    partialLoadPositions,
    legs,
    fieldReviews,
    snapshot: {
      extractionId: input.extractionId,
      extractionRunId: input.extractionRunId,
      documentId: input.documentId,
      orderId: input.orderId,
      provider: input.provider,
      model: input.model,
      promptVersion: input.promptVersion,
      schemaVersion: input.schemaVersion,
      normalizedPayload: structuredClone(input.result),
      createdAt: now,
    },
    auditEvents: [],
  };
}
