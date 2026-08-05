/**
 * Local-only privileged PostgreSQL probe for PACK-006 evidence.
 * Uses docker exec into the local Supabase Postgres container.
 * Never targets remote/production. Never prints connection strings or passwords.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Pack006EvidenceEnv } from "./pack006-live";

function isLocalLoopbackHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

/** Abort unless evidence target is strictly local loopback non-production. */
export function assertLocalPrivilegedPgGuards(env: Pack006EvidenceEnv): void {
  if (env.PACK006_NON_PRODUCTION_CONFIRMED !== "true") {
    throw new Error("STOP: privileged PG probe requires PACK006_NON_PRODUCTION_CONFIRMED=true");
  }
  if (env.PACK006_TARGET !== "local") {
    throw new Error("STOP: privileged PG probe is local-only (PACK006_TARGET must be local)");
  }
  if (!isLocalLoopbackHttpUrl(env.PACK006_SUPABASE_URL)) {
    throw new Error("STOP: privileged PG probe requires loopback PACK006_SUPABASE_URL");
  }
}

function redactCliOutput(text: string): string {
  return text
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "[REDACTED_DB_URL]")
    .replace(/(password|secret|key|token)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]");
}

function resolveLocalDbContainerName(): string {
  const out = execFileSync(
    "docker",
    ["ps", "--filter", "name=supabase_db_", "--format", "{{.Names}}"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  const names = out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) {
    throw new Error("STOP: no local supabase_db_* container found (is `supabase start` running?)");
  }
  if (names.length > 1) {
    throw new Error("STOP: multiple supabase_db_* containers found; refuse ambiguous privileged probe");
  }
  return names[0];
}

/**
 * Execute SQL against the local Supabase Postgres as a privileged role.
 * Returns the last non-empty stdout line (trimmed). Use SELECT ...::text for JSON.
 */
export function runLocalPrivilegedSqlText(env: Pack006EvidenceEnv, sql: string): string {
  assertLocalPrivilegedPgGuards(env);
  const container = resolveLocalDbContainerName();
  const dir = mkdtempSync(join(tmpdir(), "pack006-pg-"));
  const hostFile = join(dir, "query.sql");
  const containerFile = "/tmp/pack006_probe.sql";
  writeFileSync(hostFile, sql, "utf8");
  try {
    execFileSync("docker", ["cp", hostFile, `${container}:${containerFile}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const out = execFileSync(
      "docker",
      [
        "exec",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-t",
        "-A",
        "-f",
        containerFile,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    const lines = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("CREATE") && !l.startsWith("DO"));
    const last = lines[lines.length - 1] ?? "";
    if (!last) {
      throw new Error(
        `STOP: privileged SQL produced no result row: ${redactCliOutput(out).slice(0, 200)}`,
      );
    }
    return last;
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const combined = redactCliOutput(
      [e.stdout, e.stderr, e.message].filter(Boolean).join("\n"),
    );
    throw new Error(`STOP: local privileged SQL failed: ${combined.slice(0, 800)}`);
  } finally {
    try {
      execFileSync("docker", ["exec", container, "rm", "-f", containerFile], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch {
      // best-effort
    }
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
}

export type SnapshotImmutabilityProbe = {
  update_sqlstate: string;
  update_message: string;
  delete_sqlstate: string;
  delete_message: string;
  provider_before: string;
  provider_after: string;
  payload_unchanged: boolean;
  still_exists: boolean;
};

/**
 * Privileged UPDATE then DELETE against one snapshot, each in its own EXCEPTION
 * block (savepoint-equivalent), then verify the row is unchanged.
 */
export function probeSnapshotImmutabilityTrigger(
  env: Pack006EvidenceEnv,
  snapshotId: string,
): SnapshotImmutabilityProbe {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(snapshotId)) {
    throw new Error("STOP: snapshot id must be a UUID");
  }

  // Multi-statement script is OK via psql -f (not supabase db query prepared statement).
  const sql = `
create or replace function pg_temp.pack006_probe_snapshot_immutability(p_snapshot_id uuid)
returns jsonb
language plpgsql
as $fn$
declare
  v_upd_state text := 'NO_EXCEPTION';
  v_upd_msg text := '';
  v_del_state text := 'NO_EXCEPTION';
  v_del_msg text := '';
  v_provider_before text;
  v_provider_after text;
  v_payload_before jsonb;
  v_payload_after jsonb;
  v_exists boolean := false;
begin
  select s.provider, s.normalized_payload
  into v_provider_before, v_payload_before
  from public.transport_order_extracted_snapshots as s
  where s.id = p_snapshot_id;

  if v_provider_before is null then
    raise exception 'STOP: snapshot fixture missing';
  end if;

  begin
    update public.transport_order_extracted_snapshots as s
    set provider = 'tamper-privileged'
    where s.id = p_snapshot_id;
  exception when others then
    get stacked diagnostics v_upd_state = returned_sqlstate, v_upd_msg = message_text;
  end;

  begin
    delete from public.transport_order_extracted_snapshots as s
    where s.id = p_snapshot_id;
  exception when others then
    get stacked diagnostics v_del_state = returned_sqlstate, v_del_msg = message_text;
  end;

  select s.provider, s.normalized_payload, true
  into v_provider_after, v_payload_after, v_exists
  from public.transport_order_extracted_snapshots as s
  where s.id = p_snapshot_id;

  return jsonb_build_object(
    'update_sqlstate', v_upd_state,
    'update_message', v_upd_msg,
    'delete_sqlstate', v_del_state,
    'delete_message', v_del_msg,
    'provider_before', v_provider_before,
    'provider_after', v_provider_after,
    'payload_unchanged', v_payload_before = v_payload_after,
    'still_exists', coalesce(v_exists, false)
  );
end;
$fn$;

select pg_temp.pack006_probe_snapshot_immutability('${snapshotId}'::uuid)::text;
`;

  const raw = runLocalPrivilegedSqlText(env, sql);
  let probe: SnapshotImmutabilityProbe;
  try {
    probe = JSON.parse(raw) as SnapshotImmutabilityProbe;
  } catch {
    throw new Error(`STOP: privileged probe JSON parse failed: ${redactCliOutput(raw).slice(0, 200)}`);
  }
  return probe;
}
