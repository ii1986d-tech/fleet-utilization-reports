/**
 * Shared env + clients for PACK-005 evidence (never prints secrets).
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ENV_PATH = join(__dirname, ".env.local");

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

export function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    throw new Error("STOP: .env.local absent");
  }
  /** @type {Record<string, string>} */
  const env = { ...process.env };
  for (const [k, v] of Object.entries(parseEnvFile(readFileSync(ENV_PATH, "utf8")))) {
    if (v) env[k] = v;
  }
  if ((env.PACK005_NON_PRODUCTION_CONFIRMED ?? "").toLowerCase() !== "true") {
    throw new Error("STOP: non-production not confirmed");
  }
  return env;
}

/**
 * @param {unknown} err
 */
export function redactError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/https?:\/\/[^\s)'"]+/gi, "[REDACTED_URL]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/(password|secret|key|token|authorization)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}

/**
 * @param {string} id
 */
export function redactId(id) {
  if (!id || id.length < 8) return "[REDACTED_ID]";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
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
 * @param {Record<string, string>} env
 * @param {"admin"|"manager"|"viewer"} role
 */
export async function signInRole(env, role) {
  const upper = role.toUpperCase();
  const email = env[`PACK005_${upper}_EMAIL`];
  const password = env[`PACK005_${upper}_PASSWORD`];
  const client = makeClient(env.PACK005_SUPABASE_URL, env.PACK005_SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    throw new Error(`STOP: sign-in failed for ${role}: ${redactError(error ?? "no session")}`);
  }
  if (data.user.app_metadata?.role !== role) {
    throw new Error(`STOP: role mismatch for ${role}`);
  }
  return { client, userId: data.user.id, role };
}

/**
 * @param {Record<string, string>} env
 */
export function serviceClient(env) {
  const key = env.PACK005_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("STOP: service role required for fixtures");
  return makeClient(env.PACK005_SUPABASE_URL, key);
}

/**
 * @param {Record<string, string>} env
 */
export function anonClient(env) {
  return makeClient(env.PACK005_SUPABASE_URL, env.PACK005_SUPABASE_ANON_KEY);
}

export function runId(env) {
  return (env.PACK005_RUN_ID || `r${Date.now().toString(36)}`).slice(0, 32);
}

export function ns(run, entity) {
  return `p5ev_${run}_${entity}`;
}
