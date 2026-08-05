/**
 * Synthetic UAT helpers — local Supabase + mock provider only.
 * Never reads references/private/**. Never calls live AI/Maps routing.
 */
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MockPdfExtractionProvider, type MockProviderMode } from "@/lib/transport-orders/providers/mock";
import { materializeWorkingOrder } from "@/lib/transport-orders/persist/materialize";
import { buildStaticMapsLink } from "@/lib/transport-orders/maps/staticLink";
import { validatePdfUpload, syntheticPdfBytes } from "@/lib/transport-orders/upload/validate";
import {
  confirmAllFieldsAndStopOrder,
  makeClient,
  sha256Hex,
  signIn,
  syntheticPdf,
  uploadAndRegister,
  type Pack006EvidenceEnv,
} from "./pack006-live";
import { runLocalPrivilegedSqlText } from "./pack006-local-pg";

export type UatVerdict = "PASS" | "FAIL" | "BLOCKED";
export type UatChannel = "api_server" | "ui" | "unit_product_code" | "mixed";

export type UatScenarioResult = {
  scenarioId: string;
  actorRole: string;
  syntheticInput: string;
  stepsExecuted: string[];
  expectedResult: string;
  actualResult: string;
  reviewStateTransitions: string;
  versionBefore: number | null;
  versionAfter: number | null;
  auditEvents: string[];
  errorCode: string | null;
  verdict: UatVerdict;
  channel: UatChannel;
  evidenceRef: string;
  notes?: string;
};

export function newResult(partial: UatScenarioResult): UatScenarioResult {
  return partial;
}

export async function uploadRegister(
  env: Pack006EvidenceEnv,
  role: "admin" | "manager",
  label: string,
): Promise<{
  client: SupabaseClient;
  service: SupabaseClient;
  documentId: string;
  storageKey: string;
  userId: string;
}> {
  const session = await signIn(env, role);
  const service = makeClient(env.PACK006_SUPABASE_URL, env.PACK006_SUPABASE_SERVICE_ROLE_KEY);
  const key = `uat-up-${label}-${randomUUID()}`;
  const uploaded = await uploadAndRegister({
    client: session.client,
    service,
    bucket: env.PACK006_PRIVATE_BUCKET,
    idempotencyKey: key,
    bytes: syntheticPdf(`uat-${label}`),
    filename: `uat-${label}.pdf`,
  });
  return {
    client: session.client,
    service,
    documentId: uploaded.documentId,
    storageKey: uploaded.storageKey,
    userId: session.userId,
  };
}

/** Mock extract → materialize → persist RPC (product mock provider + live DB). */
export async function mockExtractPersist(
  client: SupabaseClient,
  service: SupabaseClient,
  env: Pack006EvidenceEnv,
  documentId: string,
  extractKey: string,
  mode: MockProviderMode,
  actorId: string,
): Promise<{ orderId: string; version: number; mapsStaticUrl: string | null }> {
  const { data: doc, error: docErr } = await service
    .from("transport_order_documents")
    .select("id, sha256_hex, storage_key, sanitized_filename")
    .eq("id", documentId)
    .maybeSingle();
  if (docErr || !doc) throw new Error(`document missing: ${docErr?.message ?? "null"}`);

  const provider = new MockPdfExtractionProvider(mode);
  const { data: blob, error: dlErr } = await service.storage
    .from(env.PACK006_PRIVATE_BUCKET)
    .download(doc.storage_key as string);
  if (dlErr || !blob) throw new Error(`pdf download failed: ${dlErr?.message}`);
  const bytes = Buffer.from(await blob.arrayBuffer());

  const outcome = await provider.extractPdf({
    documentBytes: bytes,
    filename: doc.sanitized_filename as string,
    timeoutMs: 30_000,
  });
  if (!outcome.ok) {
    const reqHash = sha256Hex(
      Buffer.from(
        [
          documentId,
          extractKey,
          doc.sha256_hex,
          provider.providerName,
          provider.modelName,
          provider.promptVersion,
        ].join("|"),
      ),
    );
    await client.rpc("mark_transport_order_extraction_failed", {
      p_document_id: documentId,
      p_idempotency_key: extractKey,
      p_request_hash: reqHash,
      p_provider: provider.providerName,
      p_model: provider.modelName,
      p_prompt_version: provider.promptVersion,
      p_schema_version: "pack006.extraction.v1",
      p_safe_error: outcome.message.slice(0, 200),
      p_terminal: true,
    });
    throw Object.assign(new Error(outcome.message), { code: "EXTRACTION_FAILED", terminal: true });
  }

  const orderId = randomUUID();
  const extractionId = randomUUID();
  const runId = randomUUID();
  const working = materializeWorkingOrder({
    orderId,
    documentId,
    extractionRunId: runId,
    extractionId,
    provider: outcome.providerName,
    model: outcome.modelName,
    promptVersion: outcome.promptVersion,
    schemaVersion: outcome.schemaVersion,
    result: outcome.result,
    actorId,
  });
  working.header.mapsStaticUrl = buildStaticMapsLink(working.stops);

  const reqHash = sha256Hex(
    Buffer.from(
      [
        documentId,
        extractKey,
        doc.sha256_hex,
        provider.providerName,
        provider.modelName,
        provider.promptVersion,
      ].join("|"),
    ),
  );

  const { data, error } = await client.rpc("persist_transport_order_extraction", {
    p_document_id: documentId,
    p_idempotency_key: extractKey,
    p_request_hash: reqHash,
    p_provider: outcome.providerName,
    p_model: outcome.modelName,
    p_prompt_version: outcome.promptVersion,
    p_schema_version: outcome.schemaVersion,
    p_working_order: working,
  });
  if (error) throw new Error(`persist failed: ${error.message}`);
  const persisted = data as { order_id: string };
  const { data: ord } = await client
    .from("transport_orders")
    .select("version, maps_static_url")
    .eq("id", persisted.order_id)
    .single();
  return {
    orderId: persisted.order_id,
    version: (ord?.version as number) ?? 1,
    mapsStaticUrl: (ord?.maps_static_url as string | null) ?? null,
  };
}

export async function listAuditActions(
  client: SupabaseClient,
  orderId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("transport_order_field_review_events")
    .select("action")
    .eq("order_id", orderId)
    .order("occurred_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.action as string);
}

export async function getOrderVersion(client: SupabaseClient, orderId: string): Promise<number> {
  const { data, error } = await client
    .from("transport_orders")
    .select("version, review_completed_at, stop_order_review_status")
    .eq("id", orderId)
    .single();
  if (error) throw new Error(error.message);
  return data.version as number;
}

export async function getOrderMeta(
  client: SupabaseClient,
  orderId: string,
): Promise<{
  version: number;
  reviewCompletedAt: string | null;
  stopOrderReviewStatus: string;
  businessIdentifier: string | null;
  mapsStaticUrl: string | null;
}> {
  const { data, error } = await client
    .from("transport_orders")
    .select(
      "version, review_completed_at, stop_order_review_status, business_identifier, maps_static_url",
    )
    .eq("id", orderId)
    .single();
  if (error) throw new Error(error.message);
  return {
    version: data.version as number,
    reviewCompletedAt: (data.review_completed_at as string | null) ?? null,
    stopOrderReviewStatus: data.stop_order_review_status as string,
    businessIdentifier: (data.business_identifier as string | null) ?? null,
    mapsStaticUrl: (data.maps_static_url as string | null) ?? null,
  };
}

export async function completeHappyPath(
  client: SupabaseClient,
  orderId: string,
  version: number,
  completionKey?: string,
): Promise<{ version: number; reviewCompletedAt: string | null }> {
  const afterConfirm = await confirmAllFieldsAndStopOrder(client, orderId, version);
  const { error } = await client.rpc("complete_transport_order_review", {
    p_order_id: orderId,
    p_expected_version: afterConfirm,
    p_completion_idempotency_key: completionKey ?? null,
  });
  if (error) throw new Error(`complete failed: ${error.message}`);
  const meta = await getOrderMeta(client, orderId);
  return { version: meta.version, reviewCompletedAt: meta.reviewCompletedAt };
}

export {
  validatePdfUpload,
  syntheticPdfBytes,
  confirmAllFieldsAndStopOrder,
  runLocalPrivilegedSqlText,
  sha256Hex,
  signIn,
  makeClient,
  randomUUID,
};
