import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PACK-006 migration presence", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260804160000_pack006_transport_order_domain.sql"),
    "utf8",
  );

  it("uses one consistent extracted_snapshots table name", () => {
    expect(sql).toContain("create table public.transport_order_extracted_snapshots");
    expect(sql).not.toContain("transport_order_extractions_snapshots");
    expect(sql).toContain(
      "before update or delete on public.transport_order_extracted_snapshots",
    );
    expect(sql).toContain("alter table public.transport_order_extracted_snapshots enable row level security");
    expect(sql).toContain(
      "comment on table public.transport_order_extracted_snapshots",
    );
  });

  it("defines snapshot immutability trigger (static presence; not live proof)", () => {
    expect(sql).toContain("create or replace function public.forbid_transport_order_snapshot_mutation()");
    expect(sql).toContain("raise exception 'IMMUTABLE_EXTRACTION_SNAPSHOT'");
    expect(sql).toContain("before update or delete on public.transport_order_extracted_snapshots");
    expect(sql).toContain("trg_transport_order_snapshot_no_update");
  });

  it("defines CAS RPCs, deferrable unique sequence, private bucket, ADR idempotency code", () => {
    expect(sql).toContain("create table public.transport_orders");
    expect(sql).toContain("create table public.transport_order_stops");
    expect(sql).toContain("stop_id uuid primary key");
    expect(sql).toContain("deferrable initially deferred");
    expect(sql).toContain("mutate_transport_order_review");
    expect(sql).toContain("reorder_transport_order_stops");
    expect(sql).toContain("complete_transport_order_review");
    expect(sql).toContain("register_transport_order_upload");
    expect(sql).toContain("persist_transport_order_extraction");
    expect(sql).toContain("IDEMPOTENCY_KEY_REUSE_MISMATCH");
    expect(sql).toContain("ORDER_VERSION_CONFLICT");
    expect(sql).toContain("ORDER_REVIEW_INCOMPLETE");
    expect(sql).toContain("transport-order-pdfs");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
    expect(sql).not.toContain("NEXT_PUBLIC_");
    expect(sql).not.toContain("GEMINI_API_KEY");
  });

  it("does not grant direct authenticated writes on domain tables", () => {
    expect(sql).not.toMatch(/create policy \w+_write on public\.transport_orders/i);
    expect(sql).not.toMatch(/create policy stops_write/i);
    expect(sql).toContain("for select using (public.is_authenticated_role())");
  });

  it("grants SELECT on PACK-006 tables to authenticated and service_role only", () => {
    const tables = [
      "transport_order_documents",
      "transport_order_extraction_runs",
      "transport_orders",
      "transport_order_extracted_snapshots",
      "transport_order_stops",
      "transport_order_partial_load_positions",
      "transport_order_legs",
      "transport_order_field_reviews",
      "transport_order_field_review_events",
    ];
    for (const table of tables) {
      expect(sql).toContain(
        `grant select on table public.${table} to authenticated, service_role;`,
      );
      expect(sql).toContain(
        `revoke all on table public.${table} from public, anon, authenticated, service_role;`,
      );
      expect(sql).not.toMatch(
        new RegExp(`grant\\s+(select|insert|update|delete|all).*on table public\\.${table}.*\\banon\\b`, "i"),
      );
      expect(sql).not.toMatch(
        new RegExp(`grant\\s+(insert|update|delete|all)\\s+on table public\\.${table}\\s+to authenticated`, "i"),
      );
    }
  });

  it("reorder_transport_order_stops avoids PL/pgSQL sid ambiguity", () => {
    const start = sql.indexOf(
      "create or replace function public.reorder_transport_order_stops(",
    );
    const end = sql.indexOf(
      "create or replace function public.confirm_transport_order_stop_order(",
      start,
    );
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const body = sql.slice(start, end);

    expect(body).toContain("p_order_id uuid");
    expect(body).toContain("p_expected_version integer");
    expect(body).toContain("p_ordered_stop_ids uuid[]");
    expect(body).toContain("p_maps_static_url text");
    expect(body).toContain("returns jsonb");
    expect(body).toContain("v_stop_id uuid");
    expect(body).toContain("v_ordinal integer");
    expect(body).toContain("unnest(p_ordered_stop_ids) as requested(stop_id)");
    expect(body).toContain("st.stop_id = requested.stop_id");
    expect(body).not.toMatch(/#variable_conflict|plpgsql\.variable_conflict|use_column|use_variable/);

    const codeOnly = body.replace(/--[^\n]*/g, "");
    expect(codeOnly).not.toMatch(/\bsid\b/);
    expect(codeOnly).not.toMatch(/\bdeclare[\s\S]*?\border_id\s+uuid\b/);
  });

  it("persist_transport_order_extraction avoids PL/pgSQL order_id ambiguity", () => {
    const start = sql.indexOf(
      "create or replace function public.persist_transport_order_extraction(",
    );
    const end = sql.indexOf(
      "create or replace function public.mark_transport_order_extraction_failed(",
      start,
    );
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const body = sql.slice(start, end);

    // Signature unchanged (parameter names + types).
    expect(body).toContain("p_document_id uuid");
    expect(body).toContain("p_idempotency_key text");
    expect(body).toContain("p_request_hash text");
    expect(body).toContain("p_working_order jsonb");
    expect(body).toContain("returns jsonb");

    // Locals must not collide with table columns named order_id.
    expect(body).toContain("v_order_id uuid");
    expect(body).toContain("order_id = v_order_id");
    expect(body).toContain("v_run_id uuid");
    expect(body).toContain("v_snapshot_id uuid");
    // Strip SQL comments before scanning for the classic ambiguous assignment.
    const codeOnly = body.replace(/--[^\n]*/g, "");
    expect(codeOnly).not.toMatch(/(?<![.\w])order_id\s*=\s*order_id(?![\w])/);
    expect(codeOnly).not.toMatch(/\bdeclare[\s\S]*?(?<![.\w])order_id\s+uuid\b/);
    expect(body).not.toMatch(/#variable_conflict|plpgsql\.variable_conflict|use_column|use_variable/);
  });

  it("grants EXECUTE on PACK-006 RPCs to authenticated and service_role", () => {
    const rpcs = [
      "transport_order_assert_manager_or_admin()",
      "transport_order_cas_bump(uuid, integer)",
      "register_transport_order_upload(text, text, text, text, integer)",
      "persist_transport_order_extraction(uuid, text, text, text, text, text, text, jsonb)",
      "mark_transport_order_extraction_failed(uuid, text, text, text, text, text, text, text, boolean)",
      "mutate_transport_order_review(uuid, integer, jsonb, jsonb, jsonb, jsonb)",
      "reorder_transport_order_stops(uuid, integer, uuid[], text)",
      "confirm_transport_order_stop_order(uuid, integer)",
      "complete_transport_order_review(uuid, integer, text)",
    ];
    for (const rpc of rpcs) {
      expect(sql).toContain(`grant execute on function public.${rpc} to authenticated, service_role;`);
    }
    // Internal audit helper must not be client-executable
    expect(sql).toContain("revoke all on function public.transport_order_insert_audit");
    expect(sql).not.toMatch(
      /grant execute on function public\.transport_order_insert_audit[^;]*to authenticated/i,
    );
  });
});
