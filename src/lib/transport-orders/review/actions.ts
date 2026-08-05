"use server";

import { isAppError, requireAdminOrManager, requireAuthenticated } from "@/lib/auth/session";
import {
  canReadTransportOrders,
  canReviewTransportOrders,
  type AppRole,
} from "@/lib/auth/roles";
import { appError, type AppError } from "@/lib/assignments/errors";
import { resolveExtractionProvider } from "@/lib/transport-orders/providers/registry";
import type { MockProviderMode } from "@/lib/transport-orders/providers/mock";
import {
  completeReviewRequestSchema,
  mutateReviewRequestSchema,
  reorderStopsRequestSchema,
} from "@/lib/transport-orders/schema";
import { getTransportOrderStore } from "@/lib/transport-orders/store/factory";
import type { AuditEvent, WorkingTransportOrder } from "@/lib/transport-orders/types";

export type ActionResult<T> = T | AppError;

function forbidViewerWrite(): AppError {
  return appError("FORBIDDEN", "Viewer cannot mutate transport orders.");
}

/** Session capabilities for PACK-006 review UI (viewer is read-only). */
export async function getTransportOrderReviewSessionAction(): Promise<
  ActionResult<{ role: AppRole; canReview: boolean }>
> {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) return auth;
  if (!canReadTransportOrders(auth.role)) {
    return appError("FORBIDDEN", "Cannot read transport orders.");
  }
  return {
    role: auth.role,
    canReview: canReviewTransportOrders(auth.role),
  };
}

export async function listTransportOrdersAction(): Promise<
  ActionResult<Array<{ orderId: string; businessIdentifier: string | null; version: number }>>
> {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) return auth;
  if (!canReadTransportOrders(auth.role)) return appError("FORBIDDEN", "Cannot read transport orders.");
  return getTransportOrderStore().listOrders();
}

export async function getTransportOrderAction(
  orderId: string,
): Promise<ActionResult<WorkingTransportOrder>> {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) return auth;
  if (!canReadTransportOrders(auth.role)) return appError("FORBIDDEN", "Cannot read transport orders.");
  return getTransportOrderStore().getOrder(orderId);
}

export async function listTransportOrderAuditAction(
  orderId: string,
): Promise<ActionResult<AuditEvent[]>> {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) return auth;
  if (!canReadTransportOrders(auth.role)) return appError("FORBIDDEN", "Cannot read transport orders.");
  return getTransportOrderStore().listAuditEvents(orderId);
}

export async function getTransportOrderDocumentSignedUrlAction(
  documentId: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  const auth = await requireAdminOrManager();
  if (isAppError(auth)) return auth;
  return getTransportOrderStore().getSignedDocumentUrl({ documentId });
}

export async function uploadTransportOrderPdfAction(input: {
  idempotencyKey: string;
  filename: string;
  mimeType: string | null;
  bytesBase64: string;
}): Promise<ActionResult<{ documentId: string; storageKey: string; reused: boolean }>> {
  const auth = await requireAdminOrManager();
  if (isAppError(auth)) return auth;
  const bytes = Buffer.from(input.bytesBase64, "base64");
  return getTransportOrderStore().uploadPdf({
    idempotencyKey: input.idempotencyKey,
    filename: input.filename,
    mimeType: input.mimeType,
    bytes,
    actorId: auth.userId,
    actorRole: auth.role,
  });
}

export async function extractTransportOrderAction(input: {
  documentId: string;
  idempotencyKey: string;
  mockMode?: MockProviderMode;
  forceRetry?: boolean;
}): Promise<ActionResult<WorkingTransportOrder>> {
  const auth = await requireAdminOrManager();
  if (isAppError(auth)) return auth;
  const provider = resolveExtractionProvider({ mode: input.mockMode ?? "success_simple" });
  return getTransportOrderStore().extract({
    documentId: input.documentId,
    idempotencyKey: input.idempotencyKey,
    actorId: auth.userId,
    actorRole: auth.role,
    provider,
    forceRetry: input.forceRetry,
  });
}

export async function mutateTransportOrderReviewAction(
  raw: unknown,
): Promise<ActionResult<WorkingTransportOrder>> {
  const auth = await requireAdminOrManager();
  if (isAppError(auth)) return auth;
  if (!canReviewTransportOrders(auth.role)) return forbidViewerWrite();
  const parsed = mutateReviewRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return appError("VALIDATION_ERROR", "Invalid mutate review payload.", {
      issues: parsed.error.issues.map((i) => i.message),
    });
  }
  return getTransportOrderStore().mutateReview({
    orderId: parsed.data.orderId,
    expectedVersion: parsed.data.expectedVersion,
    actorId: auth.userId,
    actorRole: auth.role,
    patches: parsed.data.patches.map((p) => ({
      identity: p.identity,
      currentValue: p.currentValue as unknown,
    })),
    confirms: parsed.data.confirms,
    markMissing: parsed.data.markMissing,
    markNotApplicable: parsed.data.markNotApplicable,
  });
}

export async function reorderTransportOrderStopsAction(
  raw: unknown,
): Promise<ActionResult<WorkingTransportOrder>> {
  const auth = await requireAdminOrManager();
  if (isAppError(auth)) return auth;
  const parsed = reorderStopsRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return appError("VALIDATION_ERROR", "Invalid reorder payload.");
  }
  return getTransportOrderStore().reorderStops({
    orderId: parsed.data.orderId,
    expectedVersion: parsed.data.expectedVersion,
    orderedStopIds: parsed.data.orderedStopIds,
    actorId: auth.userId,
    actorRole: auth.role,
  });
}

export async function confirmTransportOrderStopOrderAction(input: {
  orderId: string;
  expectedVersion: number;
}): Promise<ActionResult<WorkingTransportOrder>> {
  const auth = await requireAdminOrManager();
  if (isAppError(auth)) return auth;
  return getTransportOrderStore().confirmStopOrder({
    orderId: input.orderId,
    expectedVersion: input.expectedVersion,
    actorId: auth.userId,
    actorRole: auth.role,
  });
}

export async function completeTransportOrderReviewAction(
  raw: unknown,
): Promise<ActionResult<WorkingTransportOrder>> {
  const auth = await requireAdminOrManager();
  if (isAppError(auth)) return auth;
  const parsed = completeReviewRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return appError("VALIDATION_ERROR", "Invalid complete review payload.");
  }
  return getTransportOrderStore().completeReview({
    orderId: parsed.data.orderId,
    expectedVersion: parsed.data.expectedVersion,
    actorId: auth.userId,
    actorRole: auth.role,
    completionIdempotencyKey: parsed.data.completionIdempotencyKey,
  });
}
