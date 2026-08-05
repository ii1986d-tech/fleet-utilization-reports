import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canReviewTransportOrders,
  canUploadTransportOrders,
} from "@/lib/auth/roles";
import { MockPdfExtractionProvider } from "@/lib/transport-orders/providers/mock";
import {
  NOT_APPLICABLE_CONFIRM_MESSAGE,
  needsNotApplicableConfirmation,
  reviewChipStyle,
  reviewStatusIndicator,
} from "@/lib/transport-orders/review/ui-helpers";
import { reviewStatusLabelDe, statusAfterEdit } from "@/lib/transport-orders/review/states";
import { MemoryTransportOrderStore } from "@/lib/transport-orders/store/memory";
import type { FieldReview } from "@/lib/transport-orders/types";
import { syntheticPdfBytes } from "@/lib/transport-orders/upload/validate";

async function seedOrder(store: MemoryTransportOrderStore) {
  const upload = await store.uploadPdf({
    idempotencyKey: `up-${crypto.randomUUID()}`,
    filename: "synthetic.pdf",
    mimeType: "application/pdf",
    bytes: syntheticPdfBytes("na"),
    actorId: "admin-1",
    actorRole: "admin",
  });
  if ("code" in upload) throw new Error(upload.code);
  const order = await store.extract({
    documentId: upload.documentId,
    idempotencyKey: `ex-${crypto.randomUUID()}`,
    actorId: "admin-1",
    actorRole: "admin",
    provider: new MockPdfExtractionProvider("success_simple"),
  });
  if ("code" in order) throw new Error(order.code);
  return order;
}

function trailerField(order: Awaited<ReturnType<typeof seedOrder>>): FieldReview {
  const fr = order.fieldReviews.find((f) => f.identity.fieldName === "trailerLicensePlate");
  if (!fr) throw new Error("trailerLicensePlate field missing");
  return fr;
}

describe("PACK-006 not_applicable UI helpers", () => {
  it("exposes German label and non-color indicator for not_applicable", () => {
    expect(reviewStatusLabelDe("not_applicable")).toBe("Nicht zutreffend");
    expect(reviewStatusIndicator("not_applicable")).toBe("⊘");
    const chip = reviewChipStyle("not_applicable");
    expect(chip.label).toBe("Nicht zutreffend");
    expect(chip.indicator).toBe("⊘");
    expect(chip.terminal).toBe(true);
    // Color alone must not be the meaning — text label + indicator required.
    expect(chip.label.length).toBeGreaterThan(0);
    expect(chip.indicator.length).toBeGreaterThan(0);
  });

  it("requires confirmation when extracted or current value is present", () => {
    const withValue: FieldReview = {
      identity: { entityType: "order", entityId: "o1", fieldName: "remarks" },
      extractedValue: "SYN-NOTE",
      currentValue: "SYN-NOTE",
      reviewStatus: "pending_review",
      extractionConfidence: null,
      sourcePage: null,
      sourceSnippet: null,
      provider: "mock",
      model: "mock-v1",
      extractionRunId: "r",
      editedBy: null,
      editedAt: null,
      confirmedBy: null,
      confirmedAt: null,
      note: null,
    };
    const empty: FieldReview = {
      ...withValue,
      extractedValue: null,
      currentValue: null,
    };
    expect(needsNotApplicableConfirmation(withValue)).toBe(true);
    expect(needsNotApplicableConfirmation(empty)).toBe(false);
    expect(NOT_APPLICABLE_CONFIRM_MESSAGE).toMatch(/nicht zutreffend/i);
  });

  it("detail page wires Nicht zutreffend control beside Bestätigen/Fehlt", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/settings/orders/[orderId]/page.tsx"),
      "utf8",
    );
    expect(page).toContain("Nicht zutreffend");
    expect(page).toContain("Bestätigen");
    expect(page).toContain("Fehlt");
    expect(page).toContain('data-action="not_applicable"');
    expect(page).toContain("markNotApplicable: [fr.identity]");
    expect(page).toContain("NOT_APPLICABLE_CONFIRM_MESSAGE");
    expect(page).toContain("aria-label={`Nicht zutreffend:");
    expect(page).toContain("chip.indicator");
    expect(page).toContain("chip.label");
  });
});

describe("PACK-006 not_applicable authorization helpers", () => {
  it("admin and manager may review; viewer cannot", () => {
    expect(canReviewTransportOrders("admin")).toBe(true);
    expect(canReviewTransportOrders("manager")).toBe(true);
    expect(canReviewTransportOrders("viewer")).toBe(false);
    expect(canUploadTransportOrders("viewer")).toBe(false);
  });
});

describe("PACK-006 not_applicable store mutations", () => {
  it("admin can mark not applicable; version +1; audit; state terminal", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store);
    const field = trailerField(order);
    const v0 = order.header.version;
    const result = await store.mutateReview({
      orderId: order.header.orderId,
      expectedVersion: v0,
      actorId: "admin-1",
      actorRole: "admin",
      patches: [],
      confirms: [],
      markMissing: [],
      markNotApplicable: [field.identity],
    });
    expect("code" in result).toBe(false);
    if ("code" in result) return;
    expect(result.header.version).toBe(v0 + 1);
    const fr = result.fieldReviews.find(
      (f) =>
        f.identity.entityId === field.identity.entityId &&
        f.identity.fieldName === field.identity.fieldName,
    );
    expect(fr?.reviewStatus).toBe("not_applicable");
    const audit = result.auditEvents.filter((e) => e.action === "not_applicable_confirmed");
    expect(audit).toHaveLength(1);
    expect(audit[0]?.versionAfter).toBe(v0 + 1);
  });

  it("manager can mark not applicable", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store);
    const field = trailerField(order);
    const result = await store.mutateReview({
      orderId: order.header.orderId,
      expectedVersion: order.header.version,
      actorId: "mgr-1",
      actorRole: "manager",
      patches: [],
      confirms: [],
      markMissing: [],
      markNotApplicable: [field.identity],
    });
    expect("code" in result).toBe(false);
    if ("code" in result) return;
    const fr = result.fieldReviews.find((f) => f.identity.fieldName === "trailerLicensePlate");
    expect(fr?.reviewStatus).toBe("not_applicable");
    expect(result.auditEvents.some((e) => e.actorRole === "manager")).toBe(true);
  });

  it("stale expected_version is rejected with ORDER_VERSION_CONFLICT", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store);
    const field = trailerField(order);
    const v = order.header.version;
    const win = await store.mutateReview({
      orderId: order.header.orderId,
      expectedVersion: v,
      actorId: "admin-1",
      actorRole: "admin",
      patches: [],
      confirms: [],
      markMissing: [],
      markNotApplicable: [field.identity],
    });
    expect("code" in win).toBe(false);
    const lose = await store.mutateReview({
      orderId: order.header.orderId,
      expectedVersion: v,
      actorId: "admin-2",
      actorRole: "admin",
      patches: [],
      confirms: [],
      markMissing: [],
      markNotApplicable: [field.identity],
    });
    expect("code" in lose && lose.code).toBe("ORDER_VERSION_CONFLICT");
  });

  it("subsequent edit revokes not_applicable to edited_pending_review", async () => {
    const store = new MemoryTransportOrderStore();
    const order = await seedOrder(store);
    const field = trailerField(order);
    const marked = await store.mutateReview({
      orderId: order.header.orderId,
      expectedVersion: order.header.version,
      actorId: "admin-1",
      actorRole: "admin",
      patches: [],
      confirms: [],
      markMissing: [],
      markNotApplicable: [field.identity],
    });
    expect("code" in marked).toBe(false);
    if ("code" in marked) return;
    expect(statusAfterEdit("not_applicable")).toBe("edited_pending_review");
    const edited = await store.mutateReview({
      orderId: marked.header.orderId,
      expectedVersion: marked.header.version,
      actorId: "admin-1",
      actorRole: "admin",
      patches: [{ identity: field.identity, currentValue: "SYN-TRAILER" }],
      confirms: [],
      markMissing: [],
      markNotApplicable: [],
    });
    expect("code" in edited).toBe(false);
    if ("code" in edited) return;
    const fr = edited.fieldReviews.find((f) => f.identity.fieldName === "trailerLicensePlate");
    expect(fr?.reviewStatus).toBe("edited_pending_review");
    expect(fr?.confirmedBy).toBeNull();
    expect(
      edited.auditEvents.some((e) => e.action === "confirmation_revoked_by_edit"),
    ).toBe(true);
  });
});
