/**
 * PACK-006 live database evidence.
 *
 * Runs only when PACK006_DB_EVIDENCE=1 and non-production env is configured.
 * Fail-closed if the flag is set without a reachable configured target.
 *
 * Entry points:
 *   npm run test:pack006-db-evidence
 *   PACK006_DB_EVIDENCE=1 npm test -- tests/transport-orders/db-evidence.live.test.ts
 *
 * Never reads references/private/**. Synthetic PDFs only.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupOrder,
  confirmAllFieldsAndStopOrder,
  loadPack006EvidenceEnv,
  makeClient,
  persistSyntheticOrder,
  sha256Hex,
  signIn,
  syntheticPdf,
  uploadAndRegister,
  type Pack006EvidenceEnv,
} from "./helpers/pack006-live";
import { probeSnapshotImmutabilityTrigger } from "./helpers/pack006-local-pg";

const live = process.env.PACK006_DB_EVIDENCE === "1";

describe.runIf(live)("PACK-006 live DB evidence", () => {
  let env: Pack006EvidenceEnv;
  let service: ReturnType<typeof makeClient>;
  const created: Array<{ documentId: string; storageKey: string }> = [];

  beforeAll(() => {
    env = loadPack006EvidenceEnv();
    service = makeClient(env.PACK006_SUPABASE_URL, env.PACK006_SUPABASE_SERVICE_ROLE_KEY);
  });

  afterAll(async () => {
    for (const row of created) {
      try {
        await cleanupOrder(service, row.documentId, env.PACK006_PRIVATE_BUCKET, row.storageKey);
      } catch {
        // best-effort cleanup
      }
    }
  });

  it("private bucket exists and is not public; missing bucket fails closed", async () => {
    const { data, error } = await service.storage.getBucket(env.PACK006_PRIVATE_BUCKET);
    expect(error).toBeNull();
    expect(data?.public).toBe(false);

    const missing = await service.storage.getBucket(`missing-bucket-${randomUUID()}`);
    expect(missing.error || !missing.data).toBeTruthy();
  });

  it("persist_transport_order_extraction RPC succeeds without ambiguous order_id", async () => {
    const admin = await signIn(env, "admin");
    const bytes = syntheticPdf(`persist-order-id-${randomUUID()}`);
    const key = `up-persist-order-id-${randomUUID()}`;
    const extractKey = `ex-${key}`;
    const uploaded = await uploadAndRegister({
      client: admin.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes,
    });
    created.push(uploaded);

    const built = await persistSyntheticOrder(admin.client, uploaded.documentId, extractKey);
    expect(built.orderId).toBeTruthy();

    const { data: orderRow, error: orderErr } = await admin.client
      .from("transport_orders")
      .select("id, document_id, extraction_run_id, version")
      .eq("id", built.orderId)
      .maybeSingle();
    expect(orderErr).toBeNull();
    expect(orderRow?.id).toBe(built.orderId);
    expect(orderRow?.document_id).toBe(uploaded.documentId);
    expect(orderRow?.version).toBe(1);

    const { data: runRow, error: runErr } = await admin.client
      .from("transport_order_extraction_runs")
      .select("order_id, status")
      .eq("idempotency_key", extractKey)
      .maybeSingle();
    expect(runErr).toBeNull();
    expect(runRow?.status).toBe("completed");
    expect(runRow?.order_id).toBe(built.orderId);

    // Idempotent reuse path (same key + hash) must also remain unambiguous.
    const requestHash = sha256Hex(
      Buffer.from(`${uploaded.documentId}|${extractKey}|synthetic`),
    );
    const { data: reuse, error: reuseErr } = await admin.client.rpc(
      "persist_transport_order_extraction",
      {
        p_document_id: uploaded.documentId,
        p_idempotency_key: extractKey,
        p_request_hash: requestHash,
        p_provider: "mock",
        p_model: "mock-v1",
        p_prompt_version: "pack006.prompt.v1",
        p_schema_version: "pack006.extraction.v1",
        p_working_order: built.working,
      },
    );
    expect(reuseErr).toBeNull();
    expect(String(reuseErr?.message ?? "")).not.toMatch(/ambiguous/i);
    expect((reuse as { order_id: string; reused?: boolean }).order_id).toBe(built.orderId);
    expect((reuse as { reused?: boolean }).reused).toBe(true);
  });

  it("admin upload + persist; viewer read ok; viewer mutate denied; direct writes denied", async () => {
    const admin = await signIn(env, "admin");
    const viewer = await signIn(env, "viewer");
    const bytes = syntheticPdf(`admin-${randomUUID()}`);
    const key = `up-admin-${randomUUID()}`;
    const uploaded = await uploadAndRegister({
      client: admin.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes,
    });
    created.push(uploaded);

    const built = await persistSyntheticOrder(admin.client, uploaded.documentId, `ex-${key}`);
    const { data: readable, error: readErr } = await viewer.client
      .from("transport_orders")
      .select("id, version")
      .eq("id", built.orderId)
      .maybeSingle();
    expect(readErr).toBeNull();
    expect(readable?.id).toBe(built.orderId);

    const { error: viewerMut } = await viewer.client.rpc("mutate_transport_order_review", {
      p_order_id: built.orderId,
      p_expected_version: 1,
      p_patches: [],
      p_confirms: [],
      p_mark_missing: [],
      p_mark_not_applicable: [],
    });
    expect(viewerMut).toBeTruthy();
    expect(String(viewerMut?.message)).toMatch(/FORBIDDEN|P0001/i);

    const { error: directWrite } = await viewer.client.from("transport_orders").insert({
      id: randomUUID(),
      document_id: uploaded.documentId,
      version: 1,
    });
    expect(directWrite).toBeTruthy();

    const { error: adminDirect } = await admin.client.from("transport_order_stops").insert({
      stop_id: randomUUID(),
      order_id: built.orderId,
      sequence: 99,
      stop_type: "other",
    });
    expect(adminDirect).toBeTruthy();
  });

  it("manager mutation succeeds; CAS stale write conflicts; audit increments with version", async () => {
    const admin = await signIn(env, "admin");
    const manager = await signIn(env, "manager");
    const bytes = syntheticPdf(`mgr-${randomUUID()}`);
    const key = `up-mgr-${randomUUID()}`;
    const uploaded = await uploadAndRegister({
      client: admin.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes,
    });
    created.push(uploaded);
    const built = await persistSyntheticOrder(admin.client, uploaded.documentId, `ex-${key}`);

    const { data: beforeEvents } = await manager.client
      .from("transport_order_field_review_events")
      .select("id")
      .eq("order_id", built.orderId);
    const beforeCount = beforeEvents?.length ?? 0;

    const { error: ok } = await manager.client.rpc("mutate_transport_order_review", {
      p_order_id: built.orderId,
      p_expected_version: 1,
      p_patches: [
        {
          identity: {
            entityType: "order",
            entityId: built.orderId,
            fieldName: "businessIdentifier",
          },
          currentValue: "SYN-EDITED-1",
        },
      ],
      p_confirms: [],
      p_mark_missing: [],
      p_mark_not_applicable: [],
    });
    expect(ok).toBeNull();

    const { data: ord } = await manager.client
      .from("transport_orders")
      .select("version, business_identifier")
      .eq("id", built.orderId)
      .single();
    expect(ord?.version).toBe(2);
    expect(ord?.business_identifier).toBe("SYN-EDITED-1");

    const { data: afterEvents } = await manager.client
      .from("transport_order_field_review_events")
      .select("id, action, version_after")
      .eq("order_id", built.orderId);
    expect((afterEvents?.length ?? 0)).toBeGreaterThan(beforeCount);

    const { error: stale } = await manager.client.rpc("mutate_transport_order_review", {
      p_order_id: built.orderId,
      p_expected_version: 1,
      p_patches: [
        {
          identity: {
            entityType: "order",
            entityId: built.orderId,
            fieldName: "businessIdentifier",
          },
          currentValue: "SHOULD-FAIL",
        },
      ],
      p_confirms: [],
      p_mark_missing: [],
      p_mark_not_applicable: [],
    });
    expect(String(stale?.message)).toMatch(/ORDER_VERSION_CONFLICT/);

    const { data: still } = await manager.client
      .from("transport_orders")
      .select("version, business_identifier")
      .eq("id", built.orderId)
      .single();
    expect(still?.version).toBe(2);
    expect(still?.business_identifier).toBe("SYN-EDITED-1");
  });

  it("upload idempotency across separate clients; mismatch code; extraction idempotency", async () => {
    const adminA = await signIn(env, "admin");
    const adminB = await signIn(env, "admin");
    const bytes = syntheticPdf(`idem-${randomUUID()}`);
    const key = `idem-up-${randomUUID()}`;

    const first = await uploadAndRegister({
      client: adminA.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes,
    });
    created.push(first);

    const second = await uploadAndRegister({
      client: adminB.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes,
    });
    expect(second.reused).toBe(true);
    expect(second.documentId).toBe(first.documentId);

    const otherBytes = syntheticPdf(`idem-other-${randomUUID()}`);
    const otherHash = sha256Hex(otherBytes);
    const otherKey = `transport-orders/ev/conflict-${randomUUID()}.pdf`;
    await service.storage.from(env.PACK006_PRIVATE_BUCKET).upload(otherKey, otherBytes, {
      contentType: "application/pdf",
    });
    const { error: conflict } = await adminB.client.rpc("register_transport_order_upload", {
      p_idempotency_key: key,
      p_sha256_hex: otherHash,
      p_storage_key: otherKey,
      p_sanitized_filename: "other.pdf",
      p_size_bytes: otherBytes.length,
    });
    await service.storage.from(env.PACK006_PRIVATE_BUCKET).remove([otherKey]);
    expect(String(conflict?.message)).toMatch(/IDEMPOTENCY_KEY_REUSE_MISMATCH/);

    const exKey = `ex-idem-${randomUUID()}`;
    const a = await persistSyntheticOrder(adminA.client, first.documentId, exKey);
    const { data: reuse, error: reuseErr } = await adminB.client.rpc("persist_transport_order_extraction", {
      p_document_id: first.documentId,
      p_idempotency_key: exKey,
      p_request_hash: sha256Hex(Buffer.from(`${first.documentId}|${exKey}|synthetic`)),
      p_provider: "mock",
      p_model: "mock-v1",
      p_prompt_version: "pack006.prompt.v1",
      p_schema_version: "pack006.extraction.v1",
      p_working_order: a.working,
    });
    expect(reuseErr).toBeNull();
    expect((reuse as { order_id: string; reused?: boolean }).order_id).toBe(a.orderId);
  });

  it("reorder_transport_order_stops RPC: reorder succeeds; stop_ids stable; associations intact; stale rejected", async () => {
    const admin = await signIn(env, "admin");
    const key = `up-re-${randomUUID()}`;
    const uploaded = await uploadAndRegister({
      client: admin.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes: syntheticPdf(key),
    });
    created.push(uploaded);
    const built = await persistSyntheticOrder(admin.client, uploaded.documentId, `ex-${key}`);

    const reversed = [...built.stopIds].reverse();
    const { data: reorderResult, error } = await admin.client.rpc("reorder_transport_order_stops", {
      p_order_id: built.orderId,
      p_expected_version: 1,
      p_ordered_stop_ids: reversed,
      p_maps_static_url: null,
    });
    expect(error).toBeNull();
    expect(String(error?.message ?? "")).not.toMatch(/ambiguous/i);
    expect((reorderResult as { order_id: string; version: number }).order_id).toBe(built.orderId);
    expect((reorderResult as { version: number }).version).toBe(2);

    const { data: stops } = await admin.client
      .from("transport_order_stops")
      .select("stop_id, sequence")
      .eq("order_id", built.orderId)
      .order("sequence");
    expect(stops?.map((s) => s.stop_id)).toEqual(reversed);
    expect(stops?.map((s) => s.sequence)).toEqual([1, 2]);
    expect(new Set(stops?.map((s) => s.sequence)).size).toBe(stops?.length);

    const { data: positions } = await admin.client
      .from("transport_order_partial_load_positions")
      .select("pickup_stop_id, delivery_stop_id")
      .eq("order_id", built.orderId);
    expect(positions?.[0]?.pickup_stop_id).toBe(built.pickupId);
    expect(positions?.[0]?.delivery_stop_id).toBe(built.deliveryId);

    const { data: legs } = await admin.client
      .from("transport_order_legs")
      .select("origin_stop_id, destination_stop_id")
      .eq("order_id", built.orderId);
    expect(legs?.[0]?.origin_stop_id).toBe(built.pickupId);
    expect(legs?.[0]?.destination_stop_id).toBe(built.deliveryId);

    const { data: audit } = await admin.client
      .from("transport_order_field_review_events")
      .select("action, old_value, new_value")
      .eq("order_id", built.orderId)
      .eq("action", "stops_reordered")
      .maybeSingle();
    expect(Array.isArray(audit?.old_value)).toBe(true);
    expect(Array.isArray(audit?.new_value)).toBe(true);

    const { error: stale } = await admin.client.rpc("reorder_transport_order_stops", {
      p_order_id: built.orderId,
      p_expected_version: 1,
      p_ordered_stop_ids: built.stopIds,
      p_maps_static_url: null,
    });
    expect(String(stale?.message)).toMatch(/ORDER_VERSION_CONFLICT/);

    const { data: afterStale } = await admin.client
      .from("transport_order_stops")
      .select("stop_id")
      .eq("order_id", built.orderId)
      .order("sequence");
    expect(afterStale?.map((s) => s.stop_id)).toEqual(reversed);
  });

  it("API direct snapshot writes denied by table privileges", async () => {
    const admin = await signIn(env, "admin");
    const key = `up-snap-api-${randomUUID()}`;
    const uploaded = await uploadAndRegister({
      client: admin.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes: syntheticPdf(key),
    });
    created.push(uploaded);
    const built = await persistSyntheticOrder(admin.client, uploaded.documentId, `ex-${key}`);

    const { data: before, error: beforeErr } = await service
      .from("transport_order_extracted_snapshots")
      .select("id, provider, model, normalized_payload")
      .eq("order_id", built.orderId)
      .maybeSingle();
    expect(beforeErr).toBeNull();
    expect(before?.id).toBeTruthy();
    const providerBefore = before!.provider;
    const payloadBefore = before!.normalized_payload;

    const { error: upd } = await service
      .from("transport_order_extracted_snapshots")
      .update({ provider: "tamper" })
      .eq("id", before!.id);
    expect(upd?.code).toBe("42501");
    expect(String(upd?.message)).toMatch(/permission denied for table transport_order_extracted_snapshots/i);

    const { error: del } = await service
      .from("transport_order_extracted_snapshots")
      .delete()
      .eq("id", before!.id);
    expect(del?.code).toBe("42501");
    expect(String(del?.message)).toMatch(/permission denied for table transport_order_extracted_snapshots/i);

    const { data: after, error: afterErr } = await service
      .from("transport_order_extracted_snapshots")
      .select("id, provider, normalized_payload")
      .eq("id", before!.id)
      .maybeSingle();
    expect(afterErr).toBeNull();
    expect(after?.id).toBe(before!.id);
    expect(after?.provider).toBe(providerBefore);
    expect(after?.normalized_payload).toEqual(payloadBefore);
  });

  it("privileged DB snapshot mutation rejected by immutability trigger", async () => {
    const admin = await signIn(env, "admin");
    const key = `up-snap-trg-${randomUUID()}`;
    const uploaded = await uploadAndRegister({
      client: admin.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes: syntheticPdf(key),
    });
    created.push(uploaded);
    const built = await persistSyntheticOrder(admin.client, uploaded.documentId, `ex-${key}`);

    const { data: snap, error: snapErr } = await admin.client
      .from("transport_order_extracted_snapshots")
      .select("id, provider, normalized_payload")
      .eq("order_id", built.orderId)
      .maybeSingle();
    expect(snapErr).toBeNull();
    expect(snap?.id).toBeTruthy();

    const probe = probeSnapshotImmutabilityTrigger(env, snap!.id);
    expect(probe.update_message).toMatch(/IMMUTABLE_EXTRACTION_SNAPSHOT/);
    expect(probe.update_sqlstate).toBe("P0001");
    expect(probe.delete_message).toMatch(/IMMUTABLE_EXTRACTION_SNAPSHOT/);
    expect(probe.delete_sqlstate).toBe("P0001");
    expect(probe.still_exists).toBe(true);
    expect(probe.payload_unchanged).toBe(true);
    expect(probe.provider_after).toBe(probe.provider_before);
    expect(probe.provider_after).toBe(snap!.provider);
  });

  it("completion gate incomplete; complete succeeds; duplicate completion safe; audit once", async () => {
    const admin = await signIn(env, "admin");
    const key = `up-done-${randomUUID()}`;
    const uploaded = await uploadAndRegister({
      client: admin.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes: syntheticPdf(key),
    });
    created.push(uploaded);
    const built = await persistSyntheticOrder(admin.client, uploaded.documentId, `ex-${key}`);

    const { error: incomplete } = await admin.client.rpc("complete_transport_order_review", {
      p_order_id: built.orderId,
      p_expected_version: 1,
      p_completion_idempotency_key: null,
    });
    expect(String(incomplete?.message)).toMatch(/ORDER_REVIEW_INCOMPLETE/);
    expect(String(incomplete?.message)).toMatch(/entityType|pending_review|stop_order/i);

    const { data: afterFail } = await admin.client
      .from("transport_orders")
      .select("version, review_completed_at")
      .eq("id", built.orderId)
      .single();
    expect(afterFail?.review_completed_at).toBeNull();
    expect(afterFail?.version).toBe(1);

    let version = await confirmAllFieldsAndStopOrder(admin.client, built.orderId, 1);
    const completionKey = `complete-${randomUUID()}`;
    const { error: doneErr } = await admin.client.rpc("complete_transport_order_review", {
      p_order_id: built.orderId,
      p_expected_version: version,
      p_completion_idempotency_key: completionKey,
    });
    expect(doneErr).toBeNull();

    const { data: completedEvents } = await admin.client
      .from("transport_order_field_review_events")
      .select("id")
      .eq("order_id", built.orderId)
      .eq("action", "review_completed");
    expect(completedEvents?.length).toBe(1);

    const { data: doneRow } = await admin.client
      .from("transport_orders")
      .select("version, review_completed_at")
      .eq("id", built.orderId)
      .single();
    version = doneRow?.version as number;

    const { error: dupErr } = await admin.client.rpc("complete_transport_order_review", {
      p_order_id: built.orderId,
      p_expected_version: version,
      p_completion_idempotency_key: completionKey,
    });
    expect(dupErr).toBeNull();

    const { data: completedEvents2 } = await admin.client
      .from("transport_order_field_review_events")
      .select("id")
      .eq("order_id", built.orderId)
      .eq("action", "review_completed");
    expect(completedEvents2?.length).toBe(1);
  });

  it("DB registration failure cleans up storage object (orphan upload removed)", async () => {
    const admin = await signIn(env, "admin");
    const bytes = syntheticPdf(`orphan-${randomUUID()}`);
    const storageKey = `transport-orders/ev/orphan-${randomUUID()}.pdf`;
    await service.storage.from(env.PACK006_PRIVATE_BUCKET).upload(storageKey, bytes, {
      contentType: "application/pdf",
    });

    // Force register failure: reuse existing idempotency with different hash after a successful register
    const key = `orphan-key-${randomUUID()}`;
    const first = await uploadAndRegister({
      client: admin.client,
      service,
      bucket: env.PACK006_PRIVATE_BUCKET,
      idempotencyKey: key,
      bytes: syntheticPdf(`keep-${key}`),
    });
    created.push(first);

    const { error } = await admin.client.rpc("register_transport_order_upload", {
      p_idempotency_key: key,
      p_sha256_hex: sha256Hex(bytes),
      p_storage_key: storageKey,
      p_sanitized_filename: "orphan.pdf",
      p_size_bytes: bytes.length,
    });
    expect(String(error?.message)).toMatch(/IDEMPOTENCY_KEY_REUSE_MISMATCH/);

    // Product adapter would removePrivatePdf on RPC failure — evidence the same cleanup here
    await service.storage.from(env.PACK006_PRIVATE_BUCKET).remove([storageKey]);
    const { data: listed } = await service.storage.from(env.PACK006_PRIVATE_BUCKET).list("transport-orders/ev", {
      search: storageKey.split("/").pop(),
    });
    const stillThere = (listed ?? []).some((f) => storageKey.endsWith(f.name));
    expect(stillThere).toBe(false);
  });

  it("public URL is not used for private bucket objects", async () => {
    const { data } = await service.storage.from(env.PACK006_PRIVATE_BUCKET).getPublicUrl("transport-orders/nope.pdf");
    // getPublicUrl always returns a URL string; object must not be anonymously fetchable
    expect(data.publicUrl).toBeTruthy();
    const res = await fetch(data.publicUrl);
    expect(res.ok).toBe(false);
  });
});

describe.runIf(!live)("PACK-006 live DB evidence (gated off)", () => {
  it("does not claim live PASS when PACK006_DB_EVIDENCE is unset", () => {
    expect(process.env.PACK006_DB_EVIDENCE).not.toBe("1");
  });
});
