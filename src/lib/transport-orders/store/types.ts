import type { AppError } from "@/lib/assignments/errors";
import type { PdfExtractionProvider } from "@/lib/transport-orders/providers/types";
import type {
  AuditEvent,
  FieldIdentity,
  WorkingTransportOrder,
} from "@/lib/transport-orders/types";

export type UploadPdfResult = {
  documentId: string;
  storageKey: string;
  reused: boolean;
};

export type OrderListItem = {
  orderId: string;
  businessIdentifier: string | null;
  version: number;
};

/**
 * Persistence boundary for PACK-006 runtime operations (ADR-009).
 * Production must use the Supabase implementation; memory is test-only.
 */
export interface TransportOrderStore {
  uploadPdf(input: {
    idempotencyKey: string;
    filename: string;
    mimeType: string | null | undefined;
    bytes: Buffer;
    actorId: string;
    actorRole: string;
  }): Promise<UploadPdfResult | AppError>;

  extract(input: {
    documentId: string;
    idempotencyKey: string;
    actorId: string;
    actorRole: string;
    provider: PdfExtractionProvider;
    forceRetry?: boolean;
  }): Promise<WorkingTransportOrder | AppError>;

  listOrders(): Promise<OrderListItem[] | AppError>;

  getOrder(orderId: string): Promise<WorkingTransportOrder | AppError>;

  mutateReview(input: {
    orderId: string;
    expectedVersion: number;
    actorId: string;
    actorRole: string;
    patches: Array<{ identity: FieldIdentity; currentValue: unknown }>;
    confirms: FieldIdentity[];
    markMissing: FieldIdentity[];
    markNotApplicable: FieldIdentity[];
  }): Promise<WorkingTransportOrder | AppError>;

  reorderStops(input: {
    orderId: string;
    expectedVersion: number;
    orderedStopIds: string[];
    actorId: string;
    actorRole: string;
  }): Promise<WorkingTransportOrder | AppError>;

  confirmStopOrder(input: {
    orderId: string;
    expectedVersion: number;
    actorId: string;
    actorRole: string;
  }): Promise<WorkingTransportOrder | AppError>;

  completeReview(input: {
    orderId: string;
    expectedVersion: number;
    actorId: string;
    actorRole: string;
    completionIdempotencyKey?: string;
  }): Promise<WorkingTransportOrder | AppError>;

  listAuditEvents(orderId: string): Promise<AuditEvent[] | AppError>;

  getSignedDocumentUrl(input: {
    documentId: string;
    expiresInSeconds?: number;
  }): Promise<{ signedUrl: string } | AppError>;
}
