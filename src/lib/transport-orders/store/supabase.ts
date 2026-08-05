import { createHash } from "node:crypto";
import { appError, mapDatabaseError, type AppError } from "@/lib/assignments/errors";
import { PROVIDER_MAX_ATTEMPTS, PROVIDER_TIMEOUT_MS } from "@/lib/transport-orders/constants";
import { buildStaticMapsLink } from "@/lib/transport-orders/maps/staticLink";
import { materializeWorkingOrder } from "@/lib/transport-orders/persist/materialize";
import type { PdfExtractionProvider } from "@/lib/transport-orders/providers/types";
import { parseExtractionResult, safeParseExtractionResult } from "@/lib/transport-orders/schema";
import { loadWorkingTransportOrder } from "@/lib/transport-orders/store/load-order";
import {
  createPrivatePdfSignedUrl,
  downloadPrivatePdf,
  removePrivatePdf,
  uploadPrivatePdf,
} from "@/lib/transport-orders/store/storage";
import type { TransportOrderStore } from "@/lib/transport-orders/store/types";
import type {
  AuditEvent,
  FieldIdentity,
  WorkingTransportOrder,
} from "@/lib/transport-orders/types";
import { validatePdfUpload } from "@/lib/transport-orders/upload/validate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function requestHash(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function toJsonValue(value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

/**
 * Production transport-order persistence via Supabase tables, Storage, and RPCs.
 */
export class SupabaseTransportOrderStore implements TransportOrderStore {
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
    if ("code" in validated) return validated;

    const supabase = await createSupabaseServerClient();

    // Fast path: existing idempotency key (no Storage write)
    const { data: existing } = await supabase
      .from("transport_order_documents")
      .select("id, sha256_hex, storage_key")
      .eq("upload_idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existing) {
      if (existing.sha256_hex !== validated.sha256Hex) {
        return appError(
          "IDEMPOTENCY_KEY_REUSE_MISMATCH",
          "Idempotency key reused with different payload.",
        );
      }
      return {
        documentId: existing.id as string,
        storageKey: existing.storage_key as string,
        reused: true,
      };
    }

    const uploaded = await uploadPrivatePdf({
      storageKey: validated.storageKey,
      bytes: validated.bytes,
      contentType: "application/pdf",
    });
    if (uploaded !== true) return uploaded;

    const { data, error } = await supabase.rpc("register_transport_order_upload", {
      p_idempotency_key: input.idempotencyKey,
      p_sha256_hex: validated.sha256Hex,
      p_storage_key: validated.storageKey,
      p_sanitized_filename: validated.sanitizedFilename,
      p_size_bytes: validated.sizeBytes,
    });

    if (error) {
      await removePrivatePdf(validated.storageKey);
      return mapDatabaseError(error);
    }

    const row = data as { document_id: string; storage_key: string; reused: boolean };
    if (row.reused && row.storage_key !== validated.storageKey) {
      await removePrivatePdf(validated.storageKey);
    }

    return {
      documentId: row.document_id,
      storageKey: row.storage_key,
      reused: Boolean(row.reused),
    };
  }

  async extract(input: {
    documentId: string;
    idempotencyKey: string;
    actorId: string;
    actorRole: string;
    provider: PdfExtractionProvider;
    forceRetry?: boolean;
  }): Promise<WorkingTransportOrder | AppError> {
    const supabase = await createSupabaseServerClient();
    const { data: doc, error: docErr } = await supabase
      .from("transport_order_documents")
      .select("*")
      .eq("id", input.documentId)
      .maybeSingle();
    if (docErr) return mapDatabaseError(docErr);
    if (!doc) return appError("NOT_FOUND", "Document not found.");

    const reqHash = requestHash([
      input.documentId,
      input.idempotencyKey,
      doc.sha256_hex as string,
      input.provider.providerName,
      input.provider.modelName,
      input.provider.promptVersion,
    ]);

    const { data: existingRun } = await supabase
      .from("transport_order_extraction_runs")
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existingRun) {
      if ((existingRun.request_hash as string) !== reqHash) {
        return appError(
          "IDEMPOTENCY_KEY_REUSE_MISMATCH",
          "Idempotency key reused with different payload.",
        );
      }
      if (existingRun.status === "completed" && existingRun.order_id) {
        return this.getOrder(existingRun.order_id as string);
      }
      if (existingRun.terminal && !input.forceRetry) {
        return appError("EXTRACTION_FAILED", "Terminal extraction failure; explicit retry required.");
      }
    }

    const bytes = await downloadPrivatePdf(doc.storage_key as string);
    if ("code" in bytes) return bytes;

    let lastFailure: AppError | null = null;
    let attempts = 0;
    while (attempts < PROVIDER_MAX_ATTEMPTS) {
      attempts += 1;
      const outcome = await input.provider.extractPdf({
        documentBytes: bytes,
        filename: doc.sanitized_filename as string,
        timeoutMs: PROVIDER_TIMEOUT_MS,
      });
      if (!outcome.ok) {
        lastFailure = appError("EXTRACTION_FAILED", outcome.message);
        if (outcome.errorClass === "non_retryable") break;
        continue;
      }
      const parsed = safeParseExtractionResult(outcome.result);
      if (!parsed.success) {
        lastFailure = appError("EXTRACTION_FAILED", "Malformed extraction schema.");
        continue;
      }

      const orderId = crypto.randomUUID();
      const extractionId = crypto.randomUUID();
      const runId = crypto.randomUUID();
      const working = materializeWorkingOrder({
        orderId,
        documentId: input.documentId,
        extractionRunId: runId,
        extractionId,
        provider: outcome.providerName,
        model: outcome.modelName,
        promptVersion: outcome.promptVersion,
        schemaVersion: outcome.schemaVersion,
        result: parseExtractionResult(outcome.result),
        actorId: input.actorId,
      });
      working.header.mapsStaticUrl = buildStaticMapsLink(working.stops);

      const { data, error } = await supabase.rpc("persist_transport_order_extraction", {
        p_document_id: input.documentId,
        p_idempotency_key: input.idempotencyKey,
        p_request_hash: reqHash,
        p_provider: outcome.providerName,
        p_model: outcome.modelName,
        p_prompt_version: outcome.promptVersion,
        p_schema_version: outcome.schemaVersion,
        p_working_order: working,
      });

      if (error) return mapDatabaseError(error);
      const persisted = data as { order_id: string; reused: boolean };
      return this.getOrder(persisted.order_id);
    }

    await supabase.rpc("mark_transport_order_extraction_failed", {
      p_document_id: input.documentId,
      p_idempotency_key: input.idempotencyKey,
      p_request_hash: reqHash,
      p_provider: input.provider.providerName,
      p_model: input.provider.modelName,
      p_prompt_version: input.provider.promptVersion,
      p_schema_version: "pack006.extraction.v1",
      p_safe_error: lastFailure?.message ?? "extraction failed",
      p_terminal: true,
    });

    return lastFailure ?? appError("EXTRACTION_FAILED", "Extraction failed.");
  }

  async listOrders(): Promise<
    Array<{ orderId: string; businessIdentifier: string | null; version: number }> | AppError
  > {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("transport_orders")
      .select("id, business_identifier, version")
      .order("updated_at", { ascending: false });
    if (error) return mapDatabaseError(error);
    return (data ?? []).map((r) => ({
      orderId: r.id as string,
      businessIdentifier: (r.business_identifier as string | null) ?? null,
      version: r.version as number,
    }));
  }

  async getOrder(orderId: string): Promise<WorkingTransportOrder | AppError> {
    const supabase = await createSupabaseServerClient();
    return loadWorkingTransportOrder(supabase, orderId);
  }

  async listAuditEvents(orderId: string): Promise<AuditEvent[] | AppError> {
    const order = await this.getOrder(orderId);
    if ("code" in order) return order;
    return order.auditEvents;
  }

  async getSignedDocumentUrl(input: {
    documentId: string;
    expiresInSeconds?: number;
  }): Promise<{ signedUrl: string } | AppError> {
    const supabase = await createSupabaseServerClient();
    const { data: doc, error } = await supabase
      .from("transport_order_documents")
      .select("storage_key")
      .eq("id", input.documentId)
      .maybeSingle();
    if (error) return mapDatabaseError(error);
    if (!doc) return appError("NOT_FOUND", "Document not found.");
    return createPrivatePdfSignedUrl(doc.storage_key as string, input.expiresInSeconds ?? 300);
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
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("mutate_transport_order_review", {
      p_order_id: input.orderId,
      p_expected_version: input.expectedVersion,
      p_patches: input.patches.map((p) => ({
        identity: p.identity,
        currentValue: toJsonValue(p.currentValue),
      })),
      p_confirms: input.confirms,
      p_mark_missing: input.markMissing,
      p_mark_not_applicable: input.markNotApplicable,
    });
    if (error) return mapDatabaseError(error);
    return this.getOrder(input.orderId);
  }

  async reorderStops(input: {
    orderId: string;
    expectedVersion: number;
    orderedStopIds: string[];
    actorId: string;
    actorRole: string;
  }): Promise<WorkingTransportOrder | AppError> {
    const supabase = await createSupabaseServerClient();
    const current = await this.getOrder(input.orderId);
    if ("code" in current) return current;
    const byId = new Map(current.stops.map((s) => [s.stopId, s]));
    const reorderedStops: typeof current.stops = [];
    for (const [index, id] of input.orderedStopIds.entries()) {
      const stop = byId.get(id);
      if (!stop) {
        return appError("INVALID_STOP_REFERENCE", "Unknown stop_id in reorder.");
      }
      reorderedStops.push({ ...stop, sequence: index + 1 });
    }
    const maps = buildStaticMapsLink(reorderedStops);

    const { error } = await supabase.rpc("reorder_transport_order_stops", {
      p_order_id: input.orderId,
      p_expected_version: input.expectedVersion,
      p_ordered_stop_ids: input.orderedStopIds,
      p_maps_static_url: maps,
    });
    if (error) return mapDatabaseError(error);
    return this.getOrder(input.orderId);
  }

  async confirmStopOrder(input: {
    orderId: string;
    expectedVersion: number;
    actorId: string;
    actorRole: string;
  }): Promise<WorkingTransportOrder | AppError> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("confirm_transport_order_stop_order", {
      p_order_id: input.orderId,
      p_expected_version: input.expectedVersion,
    });
    if (error) return mapDatabaseError(error);
    return this.getOrder(input.orderId);
  }

  async completeReview(input: {
    orderId: string;
    expectedVersion: number;
    actorId: string;
    actorRole: string;
    completionIdempotencyKey?: string;
  }): Promise<WorkingTransportOrder | AppError> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("complete_transport_order_review", {
      p_order_id: input.orderId,
      p_expected_version: input.expectedVersion,
      p_completion_idempotency_key: input.completionIdempotencyKey ?? null,
    });
    if (error) return mapDatabaseError(error);
    return this.getOrder(input.orderId);
  }
}
