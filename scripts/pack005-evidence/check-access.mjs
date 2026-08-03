/**
 * PACK-005 non-mutating access check.
 * - Reads scripts/pack005-evidence/.env.local if present (never prints values).
 * - Classifies prerequisites; exits non-zero when required access is incomplete.
 * - No database mutations, user creation, RLS tests, or cleanup.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, ".env.local");

/** @typedef {"AVAILABLE"|"MISSING"|"OPTIONAL_MISSING"|"INVALID"} Status */

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
function parseEnvFile(text) {
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
 * @returns {Record<string, string>}
 */
function loadEnv() {
  /** @type {Record<string, string>} */
  const merged = { ...process.env };
  if (existsSync(ENV_PATH)) {
    try {
      const fileEnv = parseEnvFile(readFileSync(ENV_PATH, "utf8"));
      for (const [k, v] of Object.entries(fileEnv)) {
        if (v !== undefined && v !== "") {
          merged[k] = v;
        }
      }
    } catch {
      console.error("STATUS: INVALID — unable to read .env.local (details redacted)");
      process.exit(2);
    }
  }
  return merged;
}

/**
 * @param {unknown} err
 * @returns {string}
 */
function redactError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/https?:\/\/[^\s)'"]+/gi, "[REDACTED_URL]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/(password|secret|key|token)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}

/**
 * @param {string|undefined} value
 * @param {"required"|"optional"} mode
 * @param {(v: string) => boolean} [validate]
 * @returns {Status}
 */
function classify(value, mode, validate) {
  if (value == null || String(value).trim() === "") {
    return mode === "optional" ? "OPTIONAL_MISSING" : "MISSING";
  }
  if (validate && !validate(String(value).trim())) {
    return "INVALID";
  }
  return "AVAILABLE";
}

/**
 * @param {string} ref
 */
function isProjectRef(ref) {
  return /^[a-z0-9]{15,30}$/i.test(ref);
}

/**
 * @param {string} url
 */
function isSupabaseUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (u.username || u.password) return false;
    if (!u.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Publishable/anon: legacy JWT (eyJ…) or new sb_publishable_…
 * @param {string} key
 */
function looksLikeAnonKey(key) {
  if (!key || /\s/.test(key) || key.length < 20) return false;
  return key.startsWith("eyJ") || key.startsWith("sb_publishable_");
}

/**
 * Service/secret: legacy service_role JWT (eyJ…) or new sb_secret_…
 * @param {string} key
 */
function looksLikeServiceRoleKey(key) {
  if (!key || /\s/.test(key) || key.length < 20) return false;
  return key.startsWith("eyJ") || key.startsWith("sb_secret_");
}

/**
 * @param {string} email
 */
function looksLikeEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * @param {Record<string, string>} env
 * @param {string} emailKey
 * @param {string} passwordKey
 * @returns {Status}
 */
function classifyCredentialPair(env, emailKey, passwordKey) {
  const email = env[emailKey];
  const password = env[passwordKey];
  const emailEmpty = email == null || String(email).trim() === "";
  const passEmpty = password == null || String(password).trim() === "";
  if (emailEmpty && passEmpty) return "MISSING";
  if (emailEmpty || passEmpty) return "INVALID";
  if (!looksLikeEmail(String(email).trim())) return "INVALID";
  if (String(password).length < 8) return "INVALID";
  return "AVAILABLE";
}

function main() {
  const env = loadEnv();
  const envFilePresent = existsSync(ENV_PATH);

  /** @type {Record<string, Status>} */
  const prerequisites = {};

  const confirmedRaw = (env.PACK005_NON_PRODUCTION_CONFIRMED ?? "").trim().toLowerCase();
  if (confirmedRaw !== "true") {
    prerequisites.PACK005_NON_PRODUCTION_CONFIRMED =
      confirmedRaw === "" ? "MISSING" : "INVALID";
  } else {
    prerequisites.PACK005_NON_PRODUCTION_CONFIRMED = "AVAILABLE";
  }

  prerequisites.PACK005_SUPABASE_PROJECT_REF = classify(
    env.PACK005_SUPABASE_PROJECT_REF,
    "required",
    isProjectRef,
  );
  prerequisites.PACK005_SUPABASE_URL = classify(
    env.PACK005_SUPABASE_URL,
    "required",
    isSupabaseUrl,
  );
  prerequisites.PACK005_SUPABASE_ANON_KEY = classify(
    env.PACK005_SUPABASE_ANON_KEY,
    "required",
    looksLikeAnonKey,
  );
  prerequisites.PACK005_SUPABASE_SERVICE_ROLE_KEY = classify(
    env.PACK005_SUPABASE_SERVICE_ROLE_KEY,
    "optional",
    looksLikeServiceRoleKey,
  );
  prerequisites.PACK005_ADMIN_CREDENTIALS = classifyCredentialPair(
    env,
    "PACK005_ADMIN_EMAIL",
    "PACK005_ADMIN_PASSWORD",
  );
  prerequisites.PACK005_MANAGER_CREDENTIALS = classifyCredentialPair(
    env,
    "PACK005_MANAGER_EMAIL",
    "PACK005_MANAGER_PASSWORD",
  );
  prerequisites.PACK005_VIEWER_CREDENTIALS = classifyCredentialPair(
    env,
    "PACK005_VIEWER_EMAIL",
    "PACK005_VIEWER_PASSWORD",
  );
  prerequisites.PACK005_RUN_ID = classify(env.PACK005_RUN_ID, "optional", (v) =>
    /^[a-zA-Z0-9_-]{4,32}$/.test(v),
  );

  const requiredKeys = [
    "PACK005_NON_PRODUCTION_CONFIRMED",
    "PACK005_SUPABASE_PROJECT_REF",
    "PACK005_SUPABASE_URL",
    "PACK005_SUPABASE_ANON_KEY",
    "PACK005_ADMIN_CREDENTIALS",
    "PACK005_MANAGER_CREDENTIALS",
    "PACK005_VIEWER_CREDENTIALS",
  ];

  let hasInvalid = false;
  let hasMissingRequired = false;
  for (const [key, status] of Object.entries(prerequisites)) {
    if (status === "INVALID") hasInvalid = true;
    if (requiredKeys.includes(key) && (status === "MISSING" || status === "INVALID")) {
      hasMissingRequired = true;
    }
  }

  const nonProdOk = prerequisites.PACK005_NON_PRODUCTION_CONFIRMED === "AVAILABLE";
  /** @type {"READY"|"MISSING"|"INVALID"|"REJECTED_NON_PRODUCTION"} */
  let overall;
  if (!nonProdOk) {
    overall = "REJECTED_NON_PRODUCTION";
  } else if (hasInvalid) {
    overall = "INVALID";
  } else if (hasMissingRequired) {
    overall = "MISSING";
  } else {
    overall = "READY";
  }

  console.log("PACK-005 access check (non-mutating)");
  console.log(`env_file: ${envFilePresent ? "PRESENT" : "ABSENT"}`);
  console.log(`path_checked: scripts/pack005-evidence/.env.local`);
  console.log("values: REDACTED (never printed)");
  console.log("");
  for (const [key, status] of Object.entries(prerequisites)) {
    console.log(`${key}: ${status}`);
  }
  console.log("");
  console.log(`overall: ${overall}`);
  console.log(
    "notes: service-role/secret is optional for check-access; required for Auth Admin provisioning",
  );
  console.log(
    "notes: expect anon=sb_publishable_|eyJ… ; service=sb_secret_|eyJ… ; never use service as RLS proof",
  );
  console.log(
    "notes: confirm project is isolated development before Apply; no mutations performed",
  );
  if (prerequisites.PACK005_SUPABASE_SERVICE_ROLE_KEY === "INVALID") {
    console.error(
      "STOP-HINT: service key present but shape invalid (need sb_secret_… or legacy eyJ service_role JWT)",
    );
  }
  if (prerequisites.PACK005_SUPABASE_SERVICE_ROLE_KEY === "OPTIONAL_MISSING") {
    console.log(
      "provisioning: BLOCKED until PACK005_SUPABASE_SERVICE_ROLE_KEY is set (Auth Admin)",
    );
  }

  if (overall === "REJECTED_NON_PRODUCTION") {
    console.error(
      "STOP: PACK005_NON_PRODUCTION_CONFIRMED must be exactly true before any evidence work.",
    );
    process.exit(1);
  }
  if (overall === "INVALID" || overall === "MISSING") {
    process.exit(1);
  }
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(`STATUS: INVALID — ${redactError(err)}`);
  process.exit(2);
}
