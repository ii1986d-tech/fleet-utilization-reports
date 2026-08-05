import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static / gated PACK-006 DB evidence contracts.
 * Live execution lives in db-evidence.live.test.ts and is entered via:
 *   npm run test:pack006-db-evidence
 * or:
 *   PACK006_DB_EVIDENCE=1 npm test -- tests/transport-orders/db-evidence.live.test.ts
 *
 * This file must never claim live PASS.
 */
const liveEnabled = process.env.PACK006_DB_EVIDENCE === "1";

describe("PACK-006 database evidence preparation", () => {
  it("documents that live evidence is gated and not silently replaced by memory", () => {
    expect(process.env.TRANSPORT_ORDER_STORE ?? "supabase").not.toBe("memory");
    if (!liveEnabled) {
      expect(liveEnabled).toBe(false);
    }
  });

  it("migration SQL is executable-contract complete (static preflight)", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20260804160000_pack006_transport_order_domain.sql"),
      "utf8",
    );
    const createMatches = sql.match(/create table public\.transport_order_extracted_snapshots/g);
    expect(createMatches?.length).toBe(1);
    expect(sql.includes("transport_order_extractions_snapshots")).toBe(false);
    expect(sql).toContain("deferrable initially deferred");
    expect(sql).toContain("sequence = 100000 + v_ordinal");
    expect(sql).toContain("ORDER_REVIEW_INCOMPLETE:%");
    expect(sql).toMatch(/do NOT write audit as a side-effect/i);
    expect(sql).toContain("IDEMPOTENCY_KEY_REUSE_MISMATCH");
    expect(sql).toContain("transport-order-pdfs");
  });

  it("evidence package entrypoints exist", () => {
    const readme = readFileSync(
      resolve(process.cwd(), "scripts/pack006-evidence/README.md"),
      "utf8",
    );
    expect(readme).toContain("npm run test:pack006-db-evidence");
    expect(readme).toContain("npm run pack006:provision-local-users");
    expect(readme).toContain("PACK006_NON_PRODUCTION_CONFIRMED");
    expect(readme).toContain("PACK006_ALLOW_DESTRUCTIVE_TEST_PROJECT_RESET");
    expect(readme).not.toMatch(/PACK006_DB_EVIDENCE_PASS/);

    const envExample = readFileSync(
      resolve(process.cwd(), "scripts/pack006-evidence/.env.example"),
      "utf8",
    );
    expect(envExample).toContain("PACK006_SUPABASE_SERVICE_ROLE_KEY");
    expect(envExample).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE");
  });

  it("adapter RPC names match migration (static)", () => {
    const adapter = readFileSync(
      resolve(process.cwd(), "src/lib/transport-orders/store/supabase.ts"),
      "utf8",
    );
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20260804160000_pack006_transport_order_domain.sql"),
      "utf8",
    );
    for (const rpc of [
      "register_transport_order_upload",
      "persist_transport_order_extraction",
      "mark_transport_order_extraction_failed",
      "mutate_transport_order_review",
      "reorder_transport_order_stops",
      "confirm_transport_order_stop_order",
      "complete_transport_order_review",
    ]) {
      expect(adapter).toContain(rpc);
      expect(sql).toContain(`function public.${rpc}`);
    }
    expect(adapter).toContain("p_idempotency_key");
    expect(adapter).toContain("p_ordered_stop_ids");
    expect(adapter).toContain("p_maps_static_url");
    expect(adapter).toContain("removePrivatePdf");
  });

  it("production actions do not import MemoryTransportOrderStore", () => {
    const actions = readFileSync(
      resolve(process.cwd(), "src/lib/transport-orders/review/actions.ts"),
      "utf8",
    );
    expect(actions).toContain('from "@/lib/transport-orders/store/factory"');
    expect(actions).not.toContain("MemoryTransportOrderStore");
    expect(actions).not.toContain("store/memory");
  });
});
