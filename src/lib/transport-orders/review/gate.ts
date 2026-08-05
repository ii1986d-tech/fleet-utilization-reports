import { isBlockingReviewStatus, isTerminalReviewStatus } from "@/lib/transport-orders/review/states";
import type {
  FieldReview,
  PartialLoadPosition,
  TransportLeg,
  TransportOrderHeader,
  TransportOrderStop,
  UnresolvedReviewTarget,
} from "@/lib/transport-orders/types";

export type GateInput = {
  header: TransportOrderHeader;
  stops: TransportOrderStop[];
  partialLoadPositions: PartialLoadPosition[];
  legs: TransportLeg[];
  fieldReviews: FieldReview[];
  expectedVersion: number;
};

export type GateResult =
  | { ok: true }
  | {
      ok: false;
      code: "ORDER_VERSION_CONFLICT" | "ORDER_REVIEW_INCOMPLETE";
      unresolved: UnresolvedReviewTarget[];
      message: string;
    };

function hasStructuredOrRawLocation(stop: TransportOrderStop): boolean {
  const a = stop.address;
  const structured =
    Boolean(a.city?.trim()) ||
    Boolean(a.postalCode?.trim()) ||
    Boolean(a.street?.trim()) ||
    Boolean(a.company?.trim());
  const raw = Boolean(a.rawAddressText?.trim());
  return structured || raw;
}

function stopIds(stops: TransportOrderStop[]): Set<string> {
  return new Set(stops.map((s) => s.stopId));
}

/**
 * ADR-009 §12 — review-resolution + structural minimum + expected_version.
 * Does not trust UI; operates on persisted working-order shape.
 */
export function evaluateCompletionGate(input: GateInput): GateResult {
  if (input.expectedVersion !== input.header.version) {
    return {
      ok: false,
      code: "ORDER_VERSION_CONFLICT",
      unresolved: [],
      message: "Stale order version; reload and retry.",
    };
  }

  const unresolved: UnresolvedReviewTarget[] = [];

  for (const fr of input.fieldReviews) {
    if (isBlockingReviewStatus(fr.reviewStatus) || !isTerminalReviewStatus(fr.reviewStatus)) {
      unresolved.push({
        entityType: fr.identity.entityType,
        entityId: fr.identity.entityId,
        fieldName: fr.identity.fieldName,
        reviewStatus: fr.reviewStatus,
      });
    }
  }

  if (isBlockingReviewStatus(input.header.stopOrderReviewStatus)) {
    unresolved.push({
      entityType: "stop_order",
      entityId: input.header.orderId,
      fieldName: "sequence",
      reviewStatus: input.header.stopOrderReviewStatus,
    });
  }

  const structuralIssues: UnresolvedReviewTarget[] = [];

  if (!input.header.orderId) {
    structuralIssues.push({
      entityType: "order",
      entityId: "00000000-0000-0000-0000-000000000000",
      fieldName: "orderId",
      reviewStatus: "extraction_failed",
    });
  }

  const businessIdConfirmed = input.fieldReviews.some(
    (fr) =>
      fr.identity.entityType === "order" &&
      (fr.identity.fieldName === "businessIdentifier" ||
        fr.identity.fieldName === "tourNumber" ||
        fr.identity.fieldName === "borderoNumber") &&
      fr.reviewStatus === "confirmed" &&
      fr.currentValue != null &&
      String(fr.currentValue).trim() !== "",
  );

  if (!businessIdConfirmed) {
    structuralIssues.push({
      entityType: "order",
      entityId: input.header.orderId,
      fieldName: "businessIdentifier",
      reviewStatus: "pending_review",
    });
  }

  const pickups = input.stops.filter((s) => s.type === "pickup");
  const deliveries = input.stops.filter((s) => s.type === "delivery");
  if (pickups.length < 1) {
    structuralIssues.push({
      entityType: "order",
      entityId: input.header.orderId,
      fieldName: "pickupStops",
      reviewStatus: "pending_review",
    });
  }
  if (deliveries.length < 1) {
    structuralIssues.push({
      entityType: "order",
      entityId: input.header.orderId,
      fieldName: "deliveryStops",
      reviewStatus: "pending_review",
    });
  }

  const sequences = input.stops.map((s) => s.sequence).sort((a, b) => a - b);
  const unique = new Set(sequences);
  if (unique.size !== sequences.length) {
    structuralIssues.push({
      entityType: "stop_order",
      entityId: input.header.orderId,
      fieldName: "sequence_unique",
      reviewStatus: "conflict",
    });
  }
  for (let i = 0; i < sequences.length; i += 1) {
    if (sequences[i] !== i + 1) {
      structuralIssues.push({
        entityType: "stop_order",
        entityId: input.header.orderId,
        fieldName: "sequence_contiguous",
        reviewStatus: "conflict",
      });
      break;
    }
  }

  for (const stop of input.stops) {
    if (!stop.stopId) {
      structuralIssues.push({
        entityType: "stop",
        entityId: stop.stopId || input.header.orderId,
        fieldName: "stopId",
        reviewStatus: "extraction_failed",
      });
    }
    if (!hasStructuredOrRawLocation(stop)) {
      structuralIssues.push({
        entityType: "stop",
        entityId: stop.stopId,
        fieldName: "location",
        reviewStatus: "pending_review",
      });
    }
  }

  const ids = stopIds(input.stops);
  for (const pos of input.partialLoadPositions) {
    if (!ids.has(pos.pickupStopId) || !ids.has(pos.deliveryStopId)) {
      structuralIssues.push({
        entityType: "partial_load_position",
        entityId: pos.positionId,
        fieldName: "stop_reference",
        reviewStatus: "conflict",
      });
    }
  }
  for (const leg of input.legs) {
    if (!ids.has(leg.originStopId) || !ids.has(leg.destinationStopId)) {
      structuralIssues.push({
        entityType: "transport_leg",
        entityId: leg.legId,
        fieldName: "stop_reference",
        reviewStatus: "conflict",
      });
    }
  }

  const hasExtractionFailed = input.fieldReviews.some((fr) => fr.reviewStatus === "extraction_failed");
  const hasConflict = input.fieldReviews.some((fr) => fr.reviewStatus === "conflict");
  if (hasExtractionFailed || hasConflict || structuralIssues.length > 0 || unresolved.length > 0) {
    const merged = dedupeTargets([...unresolved, ...structuralIssues]);
    return {
      ok: false,
      code: "ORDER_REVIEW_INCOMPLETE",
      unresolved: merged,
      message: "Order review is incomplete.",
    };
  }

  return { ok: true };
}

function dedupeTargets(targets: UnresolvedReviewTarget[]): UnresolvedReviewTarget[] {
  const seen = new Set<string>();
  const out: UnresolvedReviewTarget[] = [];
  for (const t of targets) {
    const key = `${t.entityType}:${t.entityId}:${t.fieldName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Client UX helper — server gate remains authoritative. */
export function isWeiterEnabledInUi(input: GateInput): boolean {
  return evaluateCompletionGate(input).ok;
}
