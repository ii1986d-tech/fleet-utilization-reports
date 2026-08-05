#!/usr/bin/env node
/**
 * PACK-006 evidence preflight — non-destructive reachability checks.
 *
 * Order:
 * 1. validate environment
 * 2. service-role client → tables, RPCs, private bucket
 * 3. sign in admin / manager / viewer → verify app_metadata.role
 * 4. representative RLS reads with each authenticated client
 *
 * Exit 0 only when target is confirmed non-production and ready for live suite.
 */
import {
  assertNeverReadsPrivateSamples,
  bucketName,
  formatSupabaseError,
  loadEnv,
  looksLikeAnonPrivilegeFailure,
  redactError,
  serviceClient,
  signInRole,
} from "./lib.mjs";

const REQUIRED_TABLES = [
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

/** Probe payloads use named args so PostgREST resolves the function (empty `{}` → false PGRST202). */
const REQUIRED_RPC_PROBES = [
  {
    name: "register_transport_order_upload",
    args: {
      p_idempotency_key: "preflight",
      p_sha256_hex: "0".repeat(64),
      p_storage_key: "preflight/probe.pdf",
      p_sanitized_filename: "probe.pdf",
      p_size_bytes: 1,
    },
  },
  {
    name: "persist_transport_order_extraction",
    args: {
      p_document_id: "00000000-0000-4000-8000-000000000000",
      p_idempotency_key: "preflight",
      p_request_hash: "0".repeat(64),
      p_provider: "mock",
      p_model: "mock",
      p_prompt_version: "preflight",
      p_schema_version: "preflight",
      p_working_order: {},
    },
  },
  {
    name: "mark_transport_order_extraction_failed",
    args: {
      p_document_id: "00000000-0000-4000-8000-000000000000",
      p_idempotency_key: "preflight",
      p_request_hash: "0".repeat(64),
      p_provider: "mock",
      p_model: "mock",
      p_prompt_version: "preflight",
      p_schema_version: "preflight",
      p_safe_error: "preflight",
      p_terminal: true,
    },
  },
  {
    name: "mutate_transport_order_review",
    args: {
      p_order_id: "00000000-0000-4000-8000-000000000000",
      p_expected_version: 1,
      p_patches: [],
      p_confirms: [],
      p_mark_missing: [],
      p_mark_not_applicable: [],
    },
  },
  {
    name: "reorder_transport_order_stops",
    args: {
      p_order_id: "00000000-0000-4000-8000-000000000000",
      p_expected_version: 1,
      p_ordered_stop_ids: [],
      p_maps_static_url: null,
    },
  },
  {
    name: "confirm_transport_order_stop_order",
    args: {
      p_order_id: "00000000-0000-4000-8000-000000000000",
      p_expected_version: 1,
    },
  },
  {
    name: "complete_transport_order_review",
    args: {
      p_order_id: "00000000-0000-4000-8000-000000000000",
      p_expected_version: 1,
      p_completion_idempotency_key: null,
    },
  },
  {
    name: "transport_order_cas_bump",
    args: {
      p_order_id: "00000000-0000-4000-8000-000000000000",
      p_expected_version: 1,
    },
  },
];

const ANON_KEY_REMEDIATION =
  "PostgREST treated the service-role client as anon. " +
  "Refresh keys from `npx supabase status -o env` into scripts/pack006-evidence/.env.local " +
  "(prefer ANON_KEY + SERVICE_ROLE_KEY JWT forms). " +
  "For local target, PACK006_USE_SUPABASE_STATUS_KEYS defaults to true and overlays status JWTs. " +
  "Do not grant SELECT to anon; do not weaken RLS.";

/**
 * @param {string} label
 * @param {unknown} error
 */
function stop(label, error) {
  let msg = `STOP: ${label}: ${formatSupabaseError(error)}`;
  if (looksLikeAnonPrivilegeFailure(error)) {
    msg += ` | remediation=${ANON_KEY_REMEDIATION}`;
  }
  throw new Error(msg);
}

async function main() {
  assertNeverReadsPrivateSamples();

  // 1. Validate environment (+ local status JWT overlay when enabled)
  const env = loadEnv();
  const target = env.PACK006_TARGET.toLowerCase();
  const bucket = bucketName(env);
  const statusOverlay =
    target === "local" && (env.PACK006_USE_SUPABASE_STATUS_KEYS ?? "true").toLowerCase() !== "false";
  console.log(
    `PACK-006 preflight target=${target} status_key_overlay=${statusOverlay} (secrets redacted)`,
  );

  if (env.PACK006_SUPABASE_PROJECT_REF) {
    try {
      const host = new URL(env.PACK006_SUPABASE_URL).hostname;
      if (!host.includes(env.PACK006_SUPABASE_PROJECT_REF) && target === "remote") {
        console.warn(
          "WARN: PACK006_SUPABASE_PROJECT_REF not found in URL host (soft check). host=[REDACTED]",
        );
      }
    } catch {
      throw new Error("STOP: PACK006_SUPABASE_URL is not a valid URL");
    }
  }

  // 2. Service-role client for infrastructure reachability (bypasses RLS)
  const svc = serviceClient(env);
  console.log("OK service-role client created");

  // 3. PACK-006 tables via service-role (never anon, never unauthenticated publishable)
  for (const table of REQUIRED_TABLES) {
    const { error } = await svc.from(table).select("*").limit(1);
    if (error) stop(`table not reachable via service_role: ${table}`, error);
    console.log(`OK table ${table} (service_role)`);
  }

  // 4. Required RPCs (named args; domain/auth errors prove the function exists)
  for (const probe of REQUIRED_RPC_PROBES) {
    const { error } = await svc.rpc(probe.name, probe.args);
    if (!error) {
      console.log(`OK rpc ${probe.name} (callable)`);
      continue;
    }
    const formatted = formatSupabaseError(error);
    // True missing function — not signature/auth/domain failures
    if (
      /PGRST202/i.test(formatted) &&
      /could not find the function/i.test(formatted) &&
      /without parameters/i.test(formatted)
    ) {
      stop(`RPC missing or schema-cache stale: ${probe.name}`, error);
    }
    if (/PGRST202/i.test(formatted) && /could not find the function/i.test(formatted)) {
      stop(`RPC missing: ${probe.name}`, error);
    }
    console.log(`OK rpc ${probe.name} (reachable; ${formatted.slice(0, 120)}…)`);
  }

  // 5. Private bucket
  const { data: b, error: bErr } = await svc.storage.getBucket(bucket);
  if (bErr || !b) stop(`private bucket missing/inaccessible: ${bucket}`, bErr ?? "no bucket data");
  if (b.public) {
    throw new Error(`STOP: bucket ${bucket} must be private`);
  }
  console.log(`OK private bucket ${bucket}`);

  // 6–11. Sign in roles and verify app_metadata.role (authenticated clients)
  const admin = await signInRole(env, "admin");
  console.log(
    `OK admin sign-in role=${admin.appRole} user=${admin.userId.slice(0, 4)}…${admin.userId.slice(-4)}`,
  );

  const manager = await signInRole(env, "manager");
  console.log(
    `OK manager sign-in role=${manager.appRole} user=${manager.userId.slice(0, 4)}…${manager.userId.slice(-4)}`,
  );

  const viewer = await signInRole(env, "viewer");
  console.log(
    `OK viewer sign-in role=${viewer.appRole} user=${viewer.userId.slice(0, 4)}…${viewer.userId.slice(-4)}`,
  );

  // 12. Representative RLS reads with each authenticated session (not anon)
  for (const session of [admin, manager, viewer]) {
    const { error } = await session.client.from("transport_order_documents").select("id").limit(1);
    if (error) {
      stop(`RLS read failed for ${session.role} on transport_order_documents`, error);
    }
    console.log(`OK RLS select transport_order_documents as ${session.role}`);
  }

  const { error: viewerMutErr } = await viewer.client.rpc("mutate_transport_order_review", {
    p_order_id: "00000000-0000-4000-8000-000000000000",
    p_expected_version: 1,
    p_patches: [],
    p_confirms: [],
    p_mark_missing: [],
    p_mark_not_applicable: [],
  });
  if (!viewerMutErr) {
    throw new Error("STOP: viewer mutate RPC unexpectedly succeeded");
  }
  console.log(`OK viewer mutate denied (${formatSupabaseError(viewerMutErr)})`);

  console.log("PACK006_PREFLIGHT_PASS");
}

main().catch((err) => {
  if (err instanceof Error) {
    console.error(redactError(err));
  } else {
    console.error(formatSupabaseError(err));
  }
  process.exit(1);
});
