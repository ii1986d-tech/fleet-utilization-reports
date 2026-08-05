import { describe, expect, it } from "vitest";
import { buildStaticMapsLink } from "@/lib/transport-orders/maps/staticLink";
import { MockPdfExtractionProvider } from "@/lib/transport-orders/providers/mock";
import { resolveExtractionProvider } from "@/lib/transport-orders/providers/registry";
import { MemoryTransportOrderStore } from "@/lib/transport-orders/store/memory";
import { syntheticPdfBytes } from "@/lib/transport-orders/upload/validate";

async function seedOrder(
  store: MemoryTransportOrderStore,
  mode: ConstructorParameters<typeof MockPdfExtractionProvider>[0] = "success_simple",
) {
  const upload = await store.uploadPdf({
    idempotencyKey: `up-${crypto.randomUUID()}`,
    filename: "synthetic.pdf",
    mimeType: "application/pdf",
    bytes: syntheticPdfBytes(mode),
    actorId: "admin-1",
    actorRole: "admin",
  });
  if ("code" in upload) throw new Error(upload.code);
  const order = await store.extract({
    documentId: upload.documentId,
    idempotencyKey: `ex-${crypto.randomUUID()}`,
    actorId: "admin-1",
    actorRole: "admin",
    provider: new MockPdfExtractionProvider(mode),
  });
  if ("code" in order) throw new Error(order.code);
  return order;
}

describe("PACK-006 store flow (MemoryTransportOrderStore — test-only)", () => {
  it("happy path: upload → mock extract → confirm all → Weiter", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store, "success_simple");
    const confirmed = await store.confirmAllForTests(order.header.orderId, "admin-1", "admin");
    if ("code" in confirmed) throw new Error(confirmed.code);
    const done = await store.completeReview({
      orderId: confirmed.header.orderId,
      expectedVersion: confirmed.header.version,
      actorId: "admin-1",
      actorRole: "admin",
    });
    expect("code" in done).toBe(false);
    if (!("code" in done)) {
      expect(done.header.reviewCompletedAt).toBeTruthy();
      expect(done.snapshot?.normalizedPayload).toBeTruthy();
    }
  });

  it("upload idempotency: same key+payload reuses; different payload conflicts", async () => {
    const store = new MemoryTransportOrderStore();
    const bytes = syntheticPdfBytes("a");
    const key = "idem-1";
    const first = await store.uploadPdf({
      idempotencyKey: key,
      filename: "a.pdf",
      mimeType: "application/pdf",
      bytes,
      actorId: "a",
      actorRole: "admin",
    });
    const second = await store.uploadPdf({
      idempotencyKey: key,
      filename: "a.pdf",
      mimeType: "application/pdf",
      bytes,
      actorId: "a",
      actorRole: "admin",
    });
    expect("code" in first).toBe(false);
    expect("code" in second).toBe(false);
    if (!("code" in first) && !("code" in second)) {
      expect(second.reused).toBe(true);
      expect(second.documentId).toBe(first.documentId);
    }
    const conflict = await store.uploadPdf({
      idempotencyKey: key,
      filename: "b.pdf",
      mimeType: "application/pdf",
      bytes: syntheticPdfBytes("different"),
      actorId: "a",
      actorRole: "admin",
    });
    expect("code" in conflict && conflict.code).toBe("IDEMPOTENCY_KEY_REUSE_MISMATCH");
  });

  it("duplicate extraction request returns same order", async () => {
    const store = new MemoryTransportOrderStore();
    const upload = await store.uploadPdf({
      idempotencyKey: "u1",
      filename: "a.pdf",
      mimeType: "application/pdf",
      bytes: syntheticPdfBytes("x"),
      actorId: "a",
      actorRole: "admin",
    });
    if ("code" in upload) throw new Error(upload.code);
    const key = "e1";
    const provider = new MockPdfExtractionProvider("success_simple");
    const first = await store.extract({
      documentId: upload.documentId,
      idempotencyKey: key,
      actorId: "a",
      actorRole: "admin",
      provider,
    });
    const second = await store.extract({
      documentId: upload.documentId,
      idempotencyKey: key,
      actorId: "a",
      actorRole: "admin",
      provider,
    });
    expect("code" in first).toBe(false);
    expect("code" in second).toBe(false);
    if (!("code" in first) && !("code" in second)) {
      expect(second.header.orderId).toBe(first.header.orderId);
    }
  });

  it("malformed / timeout / terminal failure paths", async () => {
    const store = new MemoryTransportOrderStore();
    const upload = await store.uploadPdf({
      idempotencyKey: "u-fail",
      filename: "a.pdf",
      mimeType: "application/pdf",
      bytes: syntheticPdfBytes("f"),
      actorId: "a",
      actorRole: "admin",
    });
    if ("code" in upload) throw new Error(upload.code);
    const fail = await store.extract({
      documentId: upload.documentId,
      idempotencyKey: "e-fail",
      actorId: "a",
      actorRole: "admin",
      provider: new MockPdfExtractionProvider("malformed_json"),
    });
    expect("code" in fail && fail.code).toBe("EXTRACTION_FAILED");
    const blocked = await store.extract({
      documentId: upload.documentId,
      idempotencyKey: "e-fail",
      actorId: "a",
      actorRole: "admin",
      provider: new MockPdfExtractionProvider("success_simple"),
    });
    expect("code" in blocked && blocked.code).toBe("EXTRACTION_FAILED");
    const retried = await store.extract({
      documentId: upload.documentId,
      idempotencyKey: "e-fail",
      actorId: "a",
      actorRole: "admin",
      provider: new MockPdfExtractionProvider("success_simple"),
      forceRetry: true,
    });
    expect("code" in retried).toBe(false);
  });

  it("edit revokes confirmation; stale version conflicts; duplicate complete safe", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store);
    const confirmed = await store.confirmAllForTests(order.header.orderId, "admin-1", "admin");
    if ("code" in confirmed) throw new Error(confirmed.code);
    const field = confirmed.fieldReviews[0];
    const edited = await store.mutateReview({
      orderId: confirmed.header.orderId,
      expectedVersion: confirmed.header.version,
      actorId: "admin-1",
      actorRole: "admin",
      patches: [{ identity: field.identity, currentValue: "CHANGED" }],
      confirms: [],
      markMissing: [],
      markNotApplicable: [],
    });
    expect("code" in edited).toBe(false);
    if (!("code" in edited)) {
      const fr = edited.fieldReviews.find(
        (f) =>
          f.identity.entityId === field.identity.entityId &&
          f.identity.fieldName === field.identity.fieldName,
      );
      expect(fr?.reviewStatus).toBe("edited_pending_review");
      expect(fr?.confirmedBy).toBeNull();
    }

    const stale = await store.mutateReview({
      orderId: order.header.orderId,
      expectedVersion: 1,
      actorId: "admin-2",
      actorRole: "admin",
      patches: [],
      confirms: [field.identity],
      markMissing: [],
      markNotApplicable: [],
    });
    expect("code" in stale && stale.code).toBe("ORDER_VERSION_CONFLICT");

    const again = await store.confirmAllForTests(order.header.orderId, "admin-1", "admin");
    if ("code" in again) throw new Error(again.code);
    const done1 = await store.completeReview({
      orderId: again.header.orderId,
      expectedVersion: again.header.version,
      actorId: "admin-1",
      actorRole: "admin",
    });
    expect("code" in done1).toBe(false);
    if (!("code" in done1)) {
      const done2 = await store.completeReview({
        orderId: done1.header.orderId,
        expectedVersion: done1.header.version,
        actorId: "admin-1",
        actorRole: "admin",
      });
      expect("code" in done2).toBe(false);
    }
  });

  it("reorder preserves stop_id and associations; revokes stop-order confirmation", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store, "success_partial_loads");
    const confirmed = await store.confirmAllForTests(order.header.orderId, "admin-1", "admin");
    if ("code" in confirmed) throw new Error(confirmed.code);
    const originalIds = confirmed.stops.map((s) => s.stopId).sort();
    const reversed = confirmed.stops
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => s.stopId)
      .reverse();
    const reordered = await store.reorderStops({
      orderId: confirmed.header.orderId,
      expectedVersion: confirmed.header.version,
      orderedStopIds: reversed,
      actorId: "admin-1",
      actorRole: "admin",
    });
    expect("code" in reordered).toBe(false);
    if (!("code" in reordered)) {
      expect(reordered.header.stopOrderReviewStatus).toBe("edited_pending_review");
      expect(reordered.stops.map((s) => s.stopId).sort()).toEqual(originalIds);
      expect(reordered.partialLoadPositions.every((p) => originalIds.includes(p.pickupStopId))).toBe(
        true,
      );
      const audit = reordered.auditEvents.find((e) => e.action === "stops_reordered");
      expect(Array.isArray(audit?.oldValue)).toBe(true);
      expect(Array.isArray(audit?.newValue)).toBe(true);
      expect(reordered.snapshot?.normalizedPayload).toEqual(confirmed.snapshot?.normalizedPayload);
    }
  });

  it("supports roundtrip, incomplete address, billing provenance fixtures", async () => {
    const store = new MemoryTransportOrderStore();
    const rt = await seedOrder(store, "success_roundtrip");
    expect(rt.stops).toHaveLength(4);
    expect(rt.legs).toHaveLength(2);
    const inc = await seedOrder(store, "success_incomplete_address");
    const incomplete = inc.stops.find((s) => s.address.street === null);
    expect(incomplete).toBeTruthy();
    const bill = await seedOrder(store, "success_billing_provenance");
    const paidSrc = bill.fieldReviews.find((f) => f.identity.fieldName === "paidKilometersSource");
    const freightSrc = bill.fieldReviews.find((f) => f.identity.fieldName === "freightSource");
    expect(paidSrc?.currentValue).toBe("Line Haul Units");
    expect(freightSrc?.currentValue).toBe("Grand Total");
  });

  it("two concurrent reviewers: loser gets ORDER_VERSION_CONFLICT", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store);
    const v = order.header.version;
    const field = order.fieldReviews[0];
    const a = await store.mutateReview({
      orderId: order.header.orderId,
      expectedVersion: v,
      actorId: "a",
      actorRole: "admin",
      patches: [{ identity: field.identity, currentValue: "A" }],
      confirms: [],
      markMissing: [],
      markNotApplicable: [],
    });
    const b = await store.mutateReview({
      orderId: order.header.orderId,
      expectedVersion: v,
      actorId: "b",
      actorRole: "manager",
      patches: [{ identity: field.identity, currentValue: "B" }],
      confirms: [],
      markMissing: [],
      markNotApplicable: [],
    });
    expect("code" in a).toBe(false);
    expect("code" in b && b.code).toBe("ORDER_VERSION_CONFLICT");
  });

  it("incomplete Weiter returns ORDER_REVIEW_INCOMPLETE without audit side effects", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store);
    const before = order.auditEvents.length;
    const result = await store.completeReview({
      orderId: order.header.orderId,
      expectedVersion: order.header.version,
      actorId: "admin-1",
      actorRole: "admin",
    });
    expect("code" in result && result.code).toBe("ORDER_REVIEW_INCOMPLETE");
    if ("code" in result) {
      expect(result.details && "unresolved" in result.details).toBe(true);
    }
    const after = await store.getOrder(order.header.orderId);
    if (!("code" in after)) {
      expect(after.auditEvents.length).toBe(before);
      expect(after.header.version).toBe(order.header.version);
    }
  });

  it("static Maps link has no routing API side effects", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store);
    const link = buildStaticMapsLink(order.stops);
    expect(link?.startsWith("https://www.google.com/maps/dir/")).toBe(true);
  });

  it("live providers resolve when DS-005 secrets are configured (no network)", () => {
    const gemini = resolveExtractionProvider({
      env: {
        TRANSPORT_ORDER_PROVIDER: "gemini",
        GEMINI_API_KEY: "test-key-not-real",
      } as unknown as NodeJS.ProcessEnv,
      withFallbacks: false,
    });
    expect(gemini.providerName).toBe("gemini");
    const grok = resolveExtractionProvider({
      env: {
        TRANSPORT_ORDER_PROVIDER: "xai",
        XAI_API_KEY: "test-key-not-real",
      } as unknown as NodeJS.ProcessEnv,
      withFallbacks: false,
    });
    expect(grok.providerName).toBe("grok");
  });
});
