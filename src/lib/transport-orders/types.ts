/** PACK-006 domain types — ADR-009 binding. */

export const REVIEW_STATUSES = [
  "pending_review",
  "edited_pending_review",
  "confirmed",
  "missing_confirmed",
  "not_applicable",
  "conflict",
  "extraction_failed",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const TERMINAL_REVIEW_STATUSES = [
  "confirmed",
  "missing_confirmed",
  "not_applicable",
] as const;

export type TerminalReviewStatus = (typeof TERMINAL_REVIEW_STATUSES)[number];

export const BLOCKING_REVIEW_STATUSES = [
  "pending_review",
  "edited_pending_review",
  "conflict",
  "extraction_failed",
] as const;

export type BlockingReviewStatus = (typeof BLOCKING_REVIEW_STATUSES)[number];

export const STOP_TYPES = ["pickup", "delivery", "other"] as const;
export type StopType = (typeof STOP_TYPES)[number];

export const ENTITY_TYPES = [
  "order",
  "stop",
  "partial_load_position",
  "transport_leg",
  "stop_order",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const AUDIT_ACTIONS = [
  "upload_created",
  "upload_rejected",
  "extraction_started",
  "extraction_completed",
  "extraction_failed",
  "extraction_retry_requested",
  "field_edited",
  "field_confirmed",
  "missing_confirmed",
  "not_applicable_confirmed",
  "confirmation_revoked_by_edit",
  "conflict_recorded",
  "conflict_resolved",
  "stops_reordered",
  "stop_order_confirmed",
  "review_completed",
  "completion_gate_rejected",
  "stale_write_rejected",
  "idempotency_conflict",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type FieldIdentity = {
  entityType: EntityType;
  entityId: string;
  fieldName: string;
};

export type UnresolvedReviewTarget = FieldIdentity & {
  reviewStatus: ReviewStatus;
};

export type Money = {
  amount: number | null;
  currency: string | null;
};

export type StopAddress = {
  company: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  rawAddressText: string | null;
};

export type TransportOrderStop = {
  stopId: string;
  orderId: string;
  sequence: number;
  type: StopType;
  address: StopAddress;
  date: string | null;
  timeWindow: string | null;
  references: string[];
  remarks: string | null;
};

export type PartialLoadPosition = {
  positionId: string;
  orderId: string;
  positionNumber: number | null;
  pickupStopId: string;
  deliveryStopId: string;
  references: string[];
  weightKg: number | null;
  loadingMeters: number | null;
  volumeM3: number | null;
};

export type TransportLeg = {
  legId: string;
  orderId: string;
  sequence: number;
  originStopId: string;
  destinationStopId: string;
  references: string[];
  distanceKm: number | null;
};

export type FieldReview = {
  identity: FieldIdentity;
  extractedValue: unknown;
  currentValue: unknown;
  reviewStatus: ReviewStatus;
  extractionConfidence: number | null;
  sourcePage: number | null;
  sourceSnippet: string | null;
  provider: string | null;
  model: string | null;
  extractionRunId: string | null;
  editedBy: string | null;
  editedAt: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  note: string | null;
};

export type TransportOrderHeader = {
  orderId: string;
  documentId: string;
  version: number;
  tourNumber: string | null;
  borderoNumber: string | null;
  businessIdentifier: string | null;
  referenceNumbers: string[];
  responsibleClerk: string | null;
  remarks: string | null;
  freight: Money;
  paidKilometers: number | null;
  emptyKilometers: number | null;
  truckLicensePlate: string | null;
  trailerLicensePlate: string | null;
  cargoWeightKg: number | null;
  cargoLoadingMeters: number | null;
  cargoVolumeM3: number | null;
  cargoDescription: string | null;
  mapsStaticUrl: string | null;
  stopOrderReviewStatus: ReviewStatus;
  reviewCompletedAt: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type ExtractionSnapshot = {
  extractionId: string;
  extractionRunId: string;
  documentId: string;
  orderId: string;
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  normalizedPayload: unknown;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  orderId: string;
  action: AuditAction;
  actorId: string | null;
  actorRole: string | null;
  timestamp: string;
  versionBefore: number | null;
  versionAfter: number | null;
  entityType: EntityType | null;
  entityId: string | null;
  fieldName: string | null;
  oldValue: unknown;
  newValue: unknown;
  reasonCode: string | null;
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
  schemaVersion: string | null;
};

export type WorkingTransportOrder = {
  header: TransportOrderHeader;
  stops: TransportOrderStop[];
  partialLoadPositions: PartialLoadPosition[];
  legs: TransportLeg[];
  fieldReviews: FieldReview[];
  snapshot: ExtractionSnapshot | null;
  auditEvents: AuditEvent[];
};
