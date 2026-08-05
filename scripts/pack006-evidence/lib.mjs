/**
 * Shared env + clients for PACK-006 DB evidence (never prints secrets).
 * Do not import from app/ or src/.
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ENV_PATH = join(__dirname, ".env.local");
export const DEFAULT_BUCKET = "transport-order-pdfs";

/**
 * @param {string} text
 */
export function parseEnvFile(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Read `npx supabase status -o env` into a map (local only).
 * @returns {Record<string, string> | null}
 */
export function readSupabaseStatusEnv() {
  try {
    const out = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    /** @type {Record<string, string>} */
    const st = {};
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (v) st[m[1]] = v;
    }
    return st;
  } catch {
    return null;
  }
}

/**
 * For local target, optionally overlay JWT keys from `supabase status`.
 * Stale sb_publishable/sb_secret values are a common post-reset failure mode:
 * PostgREST then runs as `anon` and table SELECT fails with 42501.
 *
 * @param {Record<string, string>} env
 */
function applyLocalStatusKeys(env) {
  if ((env.PACK006_TARGET ?? "").toLowerCase() !== "local") return env;
  // Default ON for local; set PACK006_USE_SUPABASE_STATUS_KEYS=false to force .env.local only.
  if ((env.PACK006_USE_SUPABASE_STATUS_KEYS ?? "true").toLowerCase() === "false") {
    return env;
  }
  const st = readSupabaseStatusEnv();
  if (!st) return env;

  // Prefer legacy JWT forms — most reliable with PostgREST role mapping.
  if (st.ANON_KEY) env.PACK006_SUPABASE_ANON_KEY = st.ANON_KEY;
  if (st.SERVICE_ROLE_KEY) env.PACK006_SUPABASE_SERVICE_ROLE_KEY = st.SERVICE_ROLE_KEY;
  if (st.API_URL) env.PACK006_SUPABASE_URL = st.API_URL;
  return env;
}

export function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    throw new Error("STOP: scripts/pack006-evidence/.env.local absent (copy from .env.example)");
  }
  /** @type {Record<string, string>} */
  const env = { ...process.env };
  for (const [k, v] of Object.entries(parseEnvFile(readFileSync(ENV_PATH, "utf8")))) {
    if (v) env[k] = v;
  }
  if ((env.PACK006_NON_PRODUCTION_CONFIRMED ?? "").toLowerCase() !== "true") {
    throw new Error("STOP: PACK006_NON_PRODUCTION_CONFIRMED must be true (non-production only)");
  }
  const target = (env.PACK006_TARGET ?? "").toLowerCase();
  if (target !== "local" && target !== "remote") {
    throw new Error("STOP: PACK006_TARGET must be 'local' or 'remote'");
  }

  applyLocalStatusKeys(env);

  const required = [
    "PACK006_SUPABASE_URL",
    "PACK006_SUPABASE_ANON_KEY",
    "PACK006_SUPABASE_SERVICE_ROLE_KEY",
    "PACK006_ADMIN_EMAIL",
    "PACK006_ADMIN_PASSWORD",
    "PACK006_MANAGER_EMAIL",
    "PACK006_MANAGER_PASSWORD",
    "PACK006_VIEWER_EMAIL",
    "PACK006_VIEWER_PASSWORD",
  ];
  for (const key of required) {
    if (!env[key]) throw new Error(`STOP: missing ${key}`);
  }
  if (env.PACK006_SUPABASE_URL.includes("NEXT_PUBLIC_")) {
    throw new Error("STOP: invalid URL configuration");
  }
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith("NEXT_PUBLIC_") && /SERVICE_ROLE|SECRET/i.test(k + (v ?? ""))) {
      throw new Error("STOP: service-role material must not appear in NEXT_PUBLIC_* variables");
    }
  }
  if (env.PACK006_SUPABASE_SERVICE_ROLE_KEY === env.PACK006_SUPABASE_ANON_KEY) {
    throw new Error(
      "STOP: PACK006_SUPABASE_SERVICE_ROLE_KEY must not equal the anon/publishable key",
    );
  }
  return env;
}

/**
 * @param {string} text
 */
export function redactText(text) {
  return text
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/https?:\/\/[^\s)'"]+/gi, "[REDACTED_URL]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/(password|secret|key|token|authorization)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}

/**
 * Structured, redacted error summary for Supabase / PostgREST / Auth errors.
 * Never relies on String(error) alone ([object Object]).
 * @param {unknown} err
 */
export function formatSupabaseError(err) {
  if (err == null) {
    return "message=<null>";
  }

  /** @type {Record<string, unknown>} */
  let obj = {};
  if (typeof err === "object") {
    obj = /** @type {Record<string, unknown>} */ (err);
  } else if (typeof err === "string") {
    return `message=${redactText(err)}`;
  } else {
    return `message=${redactText(String(err))}`;
  }

  const message =
    typeof obj.message === "string"
      ? obj.message
      : err instanceof Error
        ? err.message
        : undefined;
  const code = obj.code ?? obj.error_code ?? obj.error;
  const details = obj.details;
  const hint = obj.hint;
  const status = obj.status ?? obj.statusCode ?? obj.status_code;

  return [
    `message=${redactText(message ?? "<missing>")}`,
    `code=${redactText(code == null ? "<none>" : String(code))}`,
    `details=${redactText(details == null ? "<none>" : String(details))}`,
    `hint=${redactText(hint == null ? "<none>" : String(hint))}`,
    `status=${redactText(status == null ? "<none>" : String(status))}`,
  ].join(" | ");
}

/**
 * @param {unknown} err
 */
export function redactError(err) {
  // Prefer Error.message first — STOP wrappers already embed formatSupabaseError().
  if (err instanceof Error) {
    return redactText(err.message);
  }
  if (err && typeof err === "object" && ("message" in err || "code" in err || "details" in err)) {
    return formatSupabaseError(err);
  }
  return formatSupabaseError(err);
}

/**
 * True when PostgREST treated the caller as anon (common with stale sb_* keys).
 * @param {unknown} err
 */
export function looksLikeAnonPrivilegeFailure(err) {
  const formatted = formatSupabaseError(err);
  return (
    /42501/.test(formatted) &&
    (/TO anon/i.test(formatted) || /for table .*anon/i.test(formatted) || /role "anon"/i.test(formatted))
  );
}

/**
 * @param {string} url
 * @param {string} key
 */
export function makeClient(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Server-only service-role client for infrastructure checks (bypasses RLS).
 * @param {Record<string, string>} env
 */
export function serviceClient(env) {
  const key = env.PACK006_SUPABASE_SERVICE_ROLE_KEY;
  return createClient(env.PACK006_SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Anon/publishable key client — base for password sign-in only.
 * Do not use for tables protected by is_authenticated_role() without a session.
 * @param {Record<string, string>} env
 */
export function anonClient(env) {
  return makeClient(env.PACK006_SUPABASE_URL, env.PACK006_SUPABASE_ANON_KEY);
}

/**
 * @param {Record<string, string>} env
 * @param {"admin"|"manager"|"viewer"} role
 */
export async function signInRole(env, role) {
  const upper = role.toUpperCase();
  const email = env[`PACK006_${upper}_EMAIL`];
  const password = env[`PACK006_${upper}_PASSWORD`];
  const client = anonClient(env);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    throw new Error(`STOP: sign-in failed for ${role}: ${formatSupabaseError(error ?? "no session")}`);
  }
  const claimed = data.user.app_metadata?.role;
  if (claimed !== role) {
    throw new Error(
      `STOP: role mismatch for ${role} (got app_metadata.role=${String(claimed ?? "<missing>")})`,
    );
  }
  return { client, userId: data.user.id, role, appRole: claimed };
}

export function bucketName(env) {
  return env.PACK006_PRIVATE_BUCKET || DEFAULT_BUCKET;
}

/** Minimal synthetic PDF bytes (%PDF magic). */
export function syntheticPdfBytes(label = "pack006-evidence") {
  return Buffer.from(`%PDF-1.4\n%${label}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`, "utf8");
}

export function assertNeverReadsPrivateSamples() {
  if (process.argv.some((a) => a.includes("references/private") || a.includes("references\\private"))) {
    throw new Error("STOP: references/private must not be accessed");
  }
  void join(process.cwd(), "references", "private");
}
