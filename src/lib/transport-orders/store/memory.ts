import { randomUUID } from "node:crypto";
import { appError, type AppError } from "@/lib/assignments/errors";
import { PROVIDER_MAX_ATTEMPTS, PROVIDER_TIMEOUT_MS } from "@/lib/transport-orders/constants";
import { buildStaticMapsLink } from "@/lib/transport-orders/maps/staticLink";
import { materializeWorkingOrder } from "@/lib/transport-orders/persist/materialize";
import type { PdfExtractionProvider } from "@/lib/transport-orders/providers/types";
import { evaluateCompletionGate } from "@/lib/transport-orders/review/gate";
import {
  statusAfterConfirm,
  statusAfterEdit,
  statusAfterMarkMissing,
  statusAfterMarkNotApplicable,
} from "@/lib/transport-orders/review/states";
import { parseExtractionResult, safeParseExtractionResult } from "@/lib/transport-orders/schema";
import type {
  AuditAction,
  AuditEvent,
  FieldIdentity,
  FieldReview,
  WorkingTransportOrder,
} from "@/lib/transport-orders/types";
import type { TransportOrderStore } from "@/lib/transport-orders/store/types";
import { validatePdfUpload, type ValidatedPdfUpload } from "@/lib/transport-orders/upload/validate";

type DocumentRecord = {
  documentId: string;
  sha256Hex: string;
  storageKey: string;
  sanitizedFilename: string;
  sizeBytes: number;
  uploadIdempotencyKey: string;
  orderId: string | null;
  createdBy: string;
  createdAt: string;
};

type ExtractionRun = {
  runId: string;
  documentId: string;
  orderId: string | null;
  idempotencyKey: string;
  status: "running" | "completed" | "failed";
  attempts: number;
  terminal: boolean;
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
};

function cloneOrder(order: WorkingTransportOrder): WorkingTransportOrder {
  return structuredClone(order);
}

function pushAudit(
  order: WorkingTransportOrder,
  event: Omit<AuditEvent, "id" | "timestamp" | "orderId"> & { orderId?: string },
): void {
  order.auditEvents.push({
    id: randomUUID(),
    orderId: event.orderId ?? order.header.orderId,
    action: event.action,
    actorId: event.actorId,
    actorRole: event.actorRole,
    timestamp: new Date().toISOString(),
    versionBefore: event.versionBefore,
    versionAfter: event.versionAfter,
    entityType: event.entityType,
    entityId: event.entityId,
    fieldName: event.fieldName,
    oldValue: event.oldValue,
    newValue: event.newValue,
    reasonCode: event.reasonCode,
    provider: event.provider,
    model: event.model,
    promptVersion: event.promptVersion,
    schemaVersion: event.schemaVersion,
  });
}

function findField(order: WorkingTransportOrder, identity: FieldIdentity): FieldReview | undefined {
  return order.fieldReviews.find(
    (f) =>
      f.identity.entityType === identity.entityType &&
      f.identity.entityId === identity.entityId &&
      f.identity.fieldName === identity.fieldName,
  );
}

function applyHeaderValue(order: WorkingTransportOrder, fieldName: string, value: unknown): void {
  const h = order.header;
  switch (fieldName) {
    case "tourNumber":
      h.tourNumber = value as string | null;
      break;
    case "borderoNumber":
      h.borderoNumber = value as string | null;
      break;
    case "businessIdentifier":
      h.businessIdentifier = value as string | null;
      break;
    case "responsibleClerk":
      h.responsibleClerk = value as string | null;
      break;
    case "remarks":
      h.remarks = value as string | null;
      break;
    case "freightAmount":
      h.freight.amount = value as number | null;
      break;
    case "freightCurrency":
      h.freight.currency = value as string | null;
      break;
    case "paidKilometers":
      h.paidKilometers = value as number | null;
      break;
    case "emptyKilometers":
      h.emptyKilometers = value as number | null;
      break;
    case "truckLicensePlate":
      h.truckLicensePlate = value as string | null;
      break;
    case "trailerLicensePlate":
      h.trailerLicensePlate = value as string | null;
      break;
    case "cargoWeightKg":
      h.cargoWeightKg = value as number | null;
      break;
    case "cargoLoadingMeters":
      h.cargoLoadingMeters = value as number | null;
      break;
    case "cargoVolumeM3":
      h.cargoVolumeM3 = value as number | null;
      break;
    case "cargoDescription":
      h.cargoDescription = value as string | null;
      break;
    default:
      break;
  }
}

function applyStopValue(
  order: WorkingTransportOrder,
  stopId: string,
  fieldName: string,
  value: unknown,
): void {
  const stop = order.stops.find((s) => s.stopId === stopId);
  if (!stop) return;
  switch (fieldName) {
    case "type":
      if (value === "pickup" || value === "delivery" || value === "other") stop.type = value;
      break;
    case "sequence":
      if (typeof value === "number") stop.sequence = value;
      break;
    case "company":
      stop.address.company = value as string | null;
      break;
    case "street":
      stop.address.street = value as string | null;
      break;
    case "postalCode":
      stop.address.postalCode = value as string | null;
      break;
    case "city":
      stop.address.city = value as string | null;
      break;
    case "country":
      stop.address.country = value as string | null;
      break;
    case "rawAddressText":
      stop.address.rawAddressText = value as string | null;
      break;
    case "date":
      stop.date = value as string | null;
      break;
    case "timeWindow":
      stop.timeWindow = value as string | null;
      break;
    default:
      break;
  }
}

/**
 * Test-only in-memory store. Must never be selected in production
 * (see store/factory.ts — requires TRANSPORT_ORDER_ALLOW_MEMORY_STORE=1).
 */
export class MemoryTransportOrderStore implements TransportOrderStore {
  documents = new Map<string, DocumentRecord>();
  uploadByKey = new Map<string, { documentId: string; payloadHash: string }>();
  extractionByKey = new Map<string, ExtractionRun>();
  orders = new Map<string, WorkingTransportOrder>();
  /** Test-only private blob store — never used by production runtime. */
  privateBlobs = new Map<string, Buffer>();

  async uploadPdf(input: {
    idempotencyKey: string;
    filename: string;
    mimeType: string | null | undefined;
    bytes: Buffer;
    actorId: string;
    actorRole: string;
  }): Promise<{ documentId: string; storageKey: string; reused: boolean } | AppError> {
    const validated = validatePdfUpload({
      filename: input.filename,
      mimeType: input.mimeType,
      bytes: input.bytes,
    });
    if ("code" in validated) {
      return validated;
    }

    const existing = this.uploadByKey.get(input.idempotencyKey);
    if (existing) {
      if (existing.payloadHash !== validated.sha256Hex) {
        return appError(
          "IDEMPOTENCY_KEY_REUSE_MISMATCH",
          "Idempotency key reused with different payload.",
        );
      }
      const doc = this.documents.get(existing.documentId);
      if (!doc) return appError("INTERNAL_ERROR", "Missing document for idempotent upload.");
      return { documentId: doc.documentId, storageKey: doc.storageKey, reused: true };
    }

    // Duplicate hash detection — do not silently merge into an existing business order.
    for (const doc of this.documents.values()) {
      if (doc.sha256Hex === validated.sha256Hex && doc.uploadIdempotencyKey !== input.idempotencyKey) {
        // Allowed to create a new document/order; surface as distinct document.
        break;
      }
    }

    const documentId = randomUUID();
    const record: DocumentRecord = {
      documentId,
      sha256Hex: validated.sha256Hex,
      storageKey: validated.storageKey,
      sanitizedFilename: validated.sanitizedFilename,
      sizeBytes: validated.sizeBytes,
      uploadIdempotencyKey: input.idempotencyKey,
      orderId: null,
      createdBy: input.actorId,
      createdAt: new Date().toISOString(),
    };
    this.documents.set(documentId, record);
    this.uploadByKey.set(input.idempotencyKey, {
      documentId,
      payloadHash: validated.sha256Hex,
    });
    this.privateBlobs.set(validated.storageKey, Buffer.from(validated.bytes));
    return { documentId, storageKey: validated.storageKey, reused: false };
  }

  async extract(input: {
    documentId: string;
    idempotencyKey: string;
    actorId: string;
    actorRole: string;
    provider: PdfExtractionProvider;
    forceRetry?: boolean;
  }): Promise<WorkingTransportOrder | AppError> {
    const doc = this.documents.get(input.documentId);
    if (!doc) return appError("NOT_FOUND", "Document not found.");

    const existing = this.extractionByKey.get(input.idempotencyKey);
    if (existing?.status === "completed" && existing.orderId) {
      const order = this.orders.get(existing.orderId);
      if (order) return cloneOrder(order);
    }
    if (existing?.terminal && !input.forceRetry) {
      return appError("EXTRACTION_FAILED", "Terminal extraction failure; explicit retry required.");
    }
    if (existing && existing.status === "running") {
      return appError("VALIDATION_ERROR", "Extraction already running for this key.");
    }

    const run: ExtractionRun = existing ?? {
      runId: randomUUID(),
      documentId: input.documentId,
      orderId: null,
      idempotencyKey: input.idempotencyKey,
      status: "running",
      attempts: 0,
      terminal: false,
      provider: input.provider.providerName,
      model: input.provider.modelName,
      promptVersion: input.provider.promptVersion,
      schemaVersion: "pack006.extraction.v1",
    };
    if (input.forceRetry && existing?.terminal) {
      run.terminal = false;
      run.status = "running";
      run.attempts = 0;
      run.runId = randomUUID();
    }
    this.extractionByKey.set(input.idempotencyKey, run);

    const bytes = this.privateBlobs.get(doc.storageKey);
    if (!bytes) return appError("INTERNAL_ERROR", "Private blob missing.");

    let lastFailure: AppError | null = null;
    while (run.attempts < PROVIDER_MAX_ATTEMPTS) {
      run.attempts += 1;
      const outcome = await input.provider.extractPdf({
        documentBytes: bytes,
        filename: doc.sanitizedFilename,
        timeoutMs: PROVIDER_TIMEOUT_MS,
      });
      if (outcome.ok) {
        const parsed = safeParseExtractionResult(outcome.result);
        if (!parsed.success) {
          lastFailure = appError("EXTRACTION_FAILED", "Malformed extraction schema.");
          if (run.attempts >= PROVIDER_MAX_ATTEMPTS) {
            break;
          }
          continue;
        }
        const orderId = randomUUID();
        const extractionId = randomUUID();
        const order = materializeWorkingOrder({
          orderId,
          documentId: doc.documentId,
          extractionRunId: run.runId,
          extractionId,
          provider: outcome.providerName,
          model: outcome.modelName,
          promptVersion: outcome.promptVersion,
          schemaVersion: outcome.schemaVersion,
          result: parseExtractionResult(outcome.result),
          actorId: input.actorId,
        });
        pushAudit(order, {
          action: "extraction_completed",
          actorId: input.actorId,
          actorRole: input.actorRole,
          versionBefore: null,
          versionAfter: 1,
          entityType: "order",
          entityId: orderId,
          fieldName: null,
          oldValue: null,
          newValue: null,
          reasonCode: null,
          provider: outcome.providerName,
          model: outcome.modelName,
          promptVersion: outcome.promptVersion,
          schemaVersion: outcome.schemaVersion,
        });
        order.header.mapsStaticUrl = buildStaticMapsLink(order.stops);
        this.orders.set(orderId, order);
        doc.orderId = orderId;
        run.orderId = orderId;
        run.status = "completed";
        run.terminal = false;
        this.extractionByKey.set(input.idempotencyKey, run);
        return cloneOrder(order);
      }

      lastFailure = appError("EXTRACTION_FAILED", outcome.message);
      if (outcome.errorClass === "non_retryable") break;
    }

    run.status = "failed";
    run.terminal = true;
    this.extractionByKey.set(input.idempotencyKey, run);
    return lastFailure ?? appError("EXTRACTION_FAILED", "Extraction failed.");
  }

  async listOrders(): Promise<
    Array<{ orderId: string; businessIdentifier: string | null; version: number }> | AppError
  > {
    return [...this.orders.values()].map((o) => ({
      orderId: o.header.orderId,
      businessIdentifier: o.header.businessIdentifier,
      version: o.header.version,
    }));
  }

  async getOrder(orderId: string): Promise<WorkingTransportOrder | AppError> {
    const order = this.orders.get(orderId);
    if (!order) return appError("NOT_FOUND", "Order not found.");
    return cloneOrder(order);
  }

  async listAuditEvents(orderId: string): Promise<AuditEvent[] | AppError> {
    const order = this.orders.get(orderId);
    if (!order) return appError("NOT_FOUND", "Order not found.");
    return cloneOrder(order).auditEvents;
  }

  async getSignedDocumentUrl(input: {
    documentId: string;
    expiresInSeconds?: number;
  }): Promise<{ signedUrl: string } | AppError> {
    const doc = this.documents.get(input.documentId);
    if (!doc) return appError("NOT_FOUND", "Document not found.");
    if (!this.privateBlobs.has(doc.storageKey)) {
      return appError("CONFIGURATION_ERROR", "Private blob missing in test store.");
    }
    return { signedUrl: `memory://private/${doc.storageKey}` };
  }

  async mutateReview(input: {
    orderId: string;
    expectedVersion: number;
    actorId: string;
    actorRole: string;
    patches: Array<{ identity: FieldIdentity; currentValue: unknown }>;
    confirms: FieldIdentity[];
    markMissing: FieldIdentity[];
    markNotApplicable: FieldIdentity[];
  }): Promise<WorkingTransportOrder | AppError> {
    const live = this.orders.get(input.orderId);
    if (!live) return appError("NOT_FOUND", "Order not found.");
    if (live.header.version !== input.expectedVersion) {
      pushAudit(live, {
        action: "stale_write_rejected",
        actorId: input.actorId,
        actorRole: input.actorRole,
        versionBefore: live.header.version,
        versionAfter: live.header.version,
        entityType: "order",
        entityId: live.header.orderId,
        fieldName: null,
        oldValue: input.expectedVersion,
        newValue: live.header.version,
        reasonCode: "ORDER_VERSION_CONFLICT",
        provider: null,
        model: null,
        promptVersion: null,
        schemaVersion: null,
      });
      return appError("ORDER_VERSION_CONFLICT", "Stale order version; reload and retry.", {
        expected: input.expectedVersion,
        actual: live.header.version,
      });
    }

    // Work on a clone; commit only on full success (transactional semantics).
    const order = cloneOrder(live);
    const versionBefore = order.header.version;
    const now = new Date().toISOString();

    try {
      for (const patch of input.patches) {
        const fr = findField(order, patch.identity);
        if (!fr) throw appError("VALIDATION_ERROR", "Unknown field identity.");
        const prevStatus = fr.reviewStatus;
        const oldValue = fr.currentValue;
        fr.currentValue = patch.currentValue;
        fr.reviewStatus = statusAfterEdit(prevStatus);
        fr.editedBy = input.actorId;
        fr.editedAt = now;
        fr.confirmedBy = null;
        fr.confirmedAt = null;
        if (patch.identity.entityType === "order") {
          applyHeaderValue(order, patch.identity.fieldName, patch.currentValue);
        }
        if (patch.identity.entityType === "stop") {
          applyStopValue(order, patch.identity.entityId, patch.identity.fieldName, patch.currentValue);
        }
        pushAudit(order, {
          action:
            prevStatus === "confirmed" ||
            prevStatus === "missing_confirmed" ||
            prevStatus === "not_applicable"
              ? "confirmation_revoked_by_edit"
              : "field_edited",
          actorId: input.actorId,
          actorRole: input.actorRole,
          versionBefore,
          versionAfter: versionBefore + 1,
          entityType: patch.identity.entityType,
          entityId: patch.identity.entityId,
          fieldName: patch.identity.fieldName,
          oldValue,
          newValue: patch.currentValue,
          reasonCode: null,
          provider: null,
          model: null,
          promptVersion: null,
          schemaVersion: null,
        });
      }

      const confirmAll = (
        identities: FieldIdentity[],
        nextStatus: "confirmed" | "missing_confirmed" | "not_applicable",
        action: AuditAction,
      ) => {
        for (const identity of identities) {
          const fr = findField(order, identity);
          if (!fr) throw appError("VALIDATION_ERROR", "Unknown field identity.");
          if (fr.reviewStatus === nextStatus) continue;
          fr.reviewStatus =
            nextStatus === "confirmed"
              ? statusAfterConfirm()
              : nextStatus === "missing_confirmed"
                ? statusAfterMarkMissing()
                : statusAfterMarkNotApplicable();
          fr.confirmedBy = input.actorId;
          fr.confirmedAt = now;
          pushAudit(order, {
            action,
            actorId: input.actorId,
            actorRole: input.actorRole,
            versionBefore,
            versionAfter: versionBefore + 1,
            entityType: identity.entityType,
            entityId: identity.entityId,
            fieldName: identity.fieldName,
            oldValue: fr.currentValue,
            newValue: fr.currentValue,
            reasonCode: null,
            provider: null,
            model: null,
            promptVersion: null,
            schemaVersion: null,
          });
        }
      };

      confirmAll(input.confirms, "confirmed", "field_confirmed");
      confirmAll(input.markMissing, "missing_confirmed", "missing_confirmed");
      confirmAll(input.markNotApplicable, "not_applicable", "not_applicable_confirmed");

      order.header.version = versionBefore + 1;
      order.header.updatedAt = now;
      order.header.updatedBy = input.actorId;
      order.header.mapsStaticUrl = buildStaticMapsLink(order.stops);
      this.orders.set(input.orderId, order);
      return cloneOrder(order);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err) return err as AppError;
      return appError("INTERNAL_ERROR", "Mutate failed.");
    }
  }

  async reorderStops(input: {
    orderId: string;
    expectedVersion: number;
    orderedStopIds: string[];
    actorId: string;
    actorRole: string;
  }): Promise<WorkingTransportOrder | AppError> {
    const order = this.orders.get(input.orderId);
    if (!order) return appError("NOT_FOUND", "Order not found.");
    if (order.header.version !== input.expectedVersion) {
      return appError("ORDER_VERSION_CONFLICT", "Stale order version; reload and retry.");
    }

    const currentIds = order.stops.map((s) => s.stopId);
    if (input.orderedStopIds.length !== currentIds.length) {
      return appError("VALIDATION_ERROR", "Reorder must include every stop exactly once.");
    }
    const set = new Set(input.orderedStopIds);
    if (set.size !== input.orderedStopIds.length) {
      return appError("VALIDATION_ERROR", "Duplicate stop_id in reorder.");
    }
    for (const id of currentIds) {
      if (!set.has(id)) return appError("INVALID_STOP_REFERENCE", "Unknown stop_id in reorder.");
    }

    const versionBefore = order.header.version;
    const oldOrder = order.stops
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => s.stopId);

    const byId = new Map(order.stops.map((s) => [s.stopId, s]));
    input.orderedStopIds.forEach((stopId, index) => {
      const stop = byId.get(stopId);
      if (!stop) return;
      stop.sequence = index + 1;
      const seqField = findField(order, {
        entityType: "stop",
        entityId: stopId,
        fieldName: "sequence",
      });
      if (seqField) {
        seqField.currentValue = stop.sequence;
        seqField.reviewStatus = "edited_pending_review";
        seqField.confirmedBy = null;
        seqField.confirmedAt = null;
      }
    });

    order.header.stopOrderReviewStatus = "edited_pending_review";
    order.header.version = versionBefore + 1;
    order.header.updatedAt = new Date().toISOString();
    order.header.updatedBy = input.actorId;
    order.header.mapsStaticUrl = buildStaticMapsLink(order.stops);

    pushAudit(order, {
      action: "stops_reordered",
      actorId: input.actorId,
      actorRole: input.actorRole,
      versionBefore,
      versionAfter: order.header.version,
      entityType: "stop_order",
      entityId: order.header.orderId,
      fieldName: "sequence",
      oldValue: oldOrder,
      newValue: input.orderedStopIds,
      reasonCode: null,
      provider: null,
      model: null,
      promptVersion: null,
      schemaVersion: null,
    });

    return cloneOrder(order);
  }

  async confirmStopOrder(input: {
    orderId: string;
    expectedVersion: number;
    actorId: string;
    actorRole: string;
  }): Promise<WorkingTransportOrder | AppError> {
    const order = this.orders.get(input.orderId);
    if (!order) return appError("NOT_FOUND", "Order not found.");
    if (order.header.version !== input.expectedVersion) {
      return appError("ORDER_VERSION_CONFLICT", "Stale order version; reload and retry.");
    }
    const versionBefore = order.header.version;
    order.header.stopOrderReviewStatus = "confirmed";
    order.header.version = versionBefore + 1;
    order.header.updatedAt = new Date().toISOString();
    order.header.updatedBy = input.actorId;
    pushAudit(order, {
      action: "stop_order_confirmed",
      actorId: input.actorId,
      actorRole: input.actorRole,
      versionBefore,
      versionAfter: order.header.version,
      entityType: "stop_order",
      entityId: order.header.orderId,
      fieldName: "sequence",
      oldValue: null,
      newValue: order.stops.map((s) => s.stopId),
      reasonCode: null,
      provider: null,
      model: null,
      promptVersion: null,
      schemaVersion: null,
    });
    return cloneOrder(order);
  }

  async completeReview(input: {
    orderId: string;
    expectedVersion: number;
    actorId: string;
    actorRole: string;
    completionIdempotencyKey?: string;
  }): Promise<WorkingTransportOrder | AppError> {
    const order = this.orders.get(input.orderId);
    if (!order) return appError("NOT_FOUND", "Order not found.");

    // Idempotent duplicate completion — no duplicate completion audit
    if (order.header.reviewCompletedAt && order.header.version === input.expectedVersion) {
      return cloneOrder(order);
    }

    const gate = evaluateCompletionGate({
      header: order.header,
      stops: order.stops,
      partialLoadPositions: order.partialLoadPositions,
      legs: order.legs,
      fieldReviews: order.fieldReviews,
      expectedVersion: input.expectedVersion,
    });

    if (!gate.ok) {
      // Preferred ADR behavior: do not write audit as a side-effect of a failed completion.
      // No domain mutation, no version bump, no completion_gate_rejected row.
      return appError(gate.code, gate.message, { unresolved: gate.unresolved });
    }

    const versionBefore = order.header.version;
    order.header.reviewCompletedAt = new Date().toISOString();
    order.header.version = versionBefore + 1;
    order.header.updatedAt = order.header.reviewCompletedAt;
    order.header.updatedBy = input.actorId;
    pushAudit(order, {
      action: "review_completed",
      actorId: input.actorId,
      actorRole: input.actorRole,
      versionBefore,
      versionAfter: order.header.version,
      entityType: "order",
      entityId: order.header.orderId,
      fieldName: null,
      oldValue: null,
      newValue: { completed: true },
      reasonCode: null,
      provider: null,
      model: null,
      promptVersion: null,
      schemaVersion: null,
    });
    return cloneOrder(order);
  }

  /** Test helper: confirm every field + stop order without going through UI. */
  async confirmAllForTests(
    orderId: string,
    actorId: string,
    actorRole: string,
  ): Promise<WorkingTransportOrder | AppError> {
    const order = await this.getOrder(orderId);
    if ("code" in order) return order;
    const patches: never[] = [];
    const confirms = order.fieldReviews.map((f) => f.identity);
    const mutated = await this.mutateReview({
      orderId,
      expectedVersion: order.header.version,
      actorId,
      actorRole,
      patches,
      confirms,
      markMissing: [],
      markNotApplicable: [],
    });
    if ("code" in mutated) return mutated;
    return this.confirmStopOrder({
      orderId,
      expectedVersion: mutated.header.version,
      actorId,
      actorRole,
    });
  }
}

export type { ValidatedPdfUpload };
