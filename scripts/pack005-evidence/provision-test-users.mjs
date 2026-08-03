/**
 * PACK-005 evidence-only Auth test user provision + verify.
 * - Loads secrets only from scripts/pack005-evidence/.env.local
 * - Uses Auth Admin API (service role) for create/update; anon key for sign-in proof
 * - Never prints passwords, keys, tokens, or complete JWTs
 * - Not imported by app/src; not part of npm test/build
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, ".env.local");

const ROLES = /** @type {const} */ (["admin", "manager", "viewer"]);

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

function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    console.error("STOP: .env.local absent");
    process.exit(1);
  }
  /** @type {Record<string, string>} */
  const env = { ...process.env };
  const fileEnv = parseEnvFile(readFileSync(ENV_PATH, "utf8"));
  for (const [k, v] of Object.entries(fileEnv)) {
    if (v !== undefined && v !== "") env[k] = v;
  }
  return env;
}

/**
 * @param {unknown} err
 */
function redactError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/https?:\/\/[^\s)'"]+/gi, "[REDACTED_URL]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/(password|secret|key|token|authorization)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}

/**
 * @param {string} email
 */
function redactEmail(email) {
  const at = email.indexOf("@");
  if (at <= 1) return "[REDACTED_EMAIL]";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const localPart =
    local.length <= 2 ? `${local[0]}*` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  const domainPart =
    domain.length <= 3 ? "***" : `${domain.slice(0, 1)}***${domain.slice(domain.lastIndexOf("."))}`;
  return `${localPart}@${domainPart}`;
}

/**
 * @param {string} id
 */
function redactId(id) {
  if (!id || id.length < 8) return "[REDACTED_ID]";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

/**
 * @param {string} ref
 * @param {string} url
 */
function assertProjectAlignment(ref, url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("INVALID Supabase URL format");
  }
  if (parsed.username || parsed.password) {
    throw new Error("STOP: URL must not embed credentials");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("STOP: URL protocol invalid");
  }
  const host = parsed.hostname.toLowerCase();
  if (host.includes("prod") && !host.includes("localhost")) {
    // soft signal only — hard stop uses NON_PRODUCTION flag + human confirmation
  }
  if (!host.includes(ref.toLowerCase()) && !host.endsWith("supabase.co")) {
    throw new Error("STOP: project ref does not align with URL host pattern");
  }
  if (host.endsWith("supabase.co") && !host.startsWith(`${ref.toLowerCase()}.`)) {
    throw new Error("STOP: project ref does not match URL subdomain");
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} email
 */
async function findUserByEmail(admin, email) {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit;
    if (users.length < perPage) return null;
    page += 1;
    if (page > 50) {
      throw new Error("STOP: user listing exceeded safe page limit");
    }
  }
}

/**
 * @param {import("@supabase/auth-js").User} user
 * @param {string} expectedRole
 * @param {string} email
 */
function assertIntendedTestIdentity(user, expectedRole, email) {
  const meta = user.app_metadata ?? {};
  const flagged = meta.pack005_evidence === true || meta.pack005_test === true;
  const existingRole = typeof meta.role === "string" ? meta.role : "";
  if (
    !flagged &&
    existingRole &&
    existingRole !== expectedRole &&
    existingRole !== "admin" &&
    existingRole !== "manager" &&
    existingRole !== "viewer"
  ) {
    throw new Error(
      `STOP: existing user ${redactEmail(email)} looks unrelated (app_metadata.role present, not a known app role)`,
    );
  }
  // If unflagged and has a different known role, still allow only when email is the configured test email
  // (exact env match). Record as update of existing test candidate.
  return flagged ? "existing_flagged" : existingRole ? "existing_unflagged" : "existing_no_role";
}

/**
 * @param {Record<string, string>} env
 * @param {"admin"|"manager"|"viewer"} role
 */
function credentialsFor(env, role) {
  const upper = role.toUpperCase();
  const email = (env[`PACK005_${upper}_EMAIL`] ?? "").trim();
  const password = env[`PACK005_${upper}_PASSWORD`] ?? "";
  if (!email || !password) {
    throw new Error(`STOP: missing credentials for ${role}`);
  }
  return { email, password };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {"admin"|"manager"|"viewer"} role
 * @param {string} email
 * @param {string} password
 */
async function provisionOne(admin, role, email, password) {
  const existing = await findUserByEmail(admin, email);
  /** @type {"created"|"updated_existing"} */
  let action;
  /** @type {string} */
  let userId;

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role,
        pack005_evidence: true,
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error(`STOP: createUser returned no user for ${role}`);
    userId = data.user.id;
    action = "created";
  } else {
    assertIntendedTestIdentity(existing, role, email);
    const prevMeta = existing.app_metadata ?? {};
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: {
        ...prevMeta,
        role,
        pack005_evidence: true,
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error(`STOP: updateUserById returned no user for ${role}`);
    userId = data.user.id;
    action = "updated_existing";
  }

  return { action, userId };
}

/**
 * @param {string} url
 * @param {string} anonKey
 * @param {"admin"|"manager"|"viewer"} role
 * @param {string} email
 * @param {string} password
 */
async function verifySignIn(url, anonKey, role, email, password) {
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      auth: "FAIL",
      roleCheck: "FAIL",
      reason: redactError(error),
      userIdRedacted: "—",
      emailRedacted: redactEmail(email),
      expiresAt: "—",
      appRole: "—",
      uidPresent: false,
    };
  }

  const user = data.user;
  const session = data.session;
  const tokenPresent = Boolean(session?.access_token && session.access_token.length > 20);
  const expiresAt =
    session?.expires_at != null
      ? new Date(session.expires_at * 1000).toISOString()
      : "—";
  const emailMatch = (user?.email ?? "").toLowerCase() === email.toLowerCase();
  const appRole = user?.app_metadata?.role;
  const roleOk = appRole === role;
  const uidPresent = Boolean(user?.id);
  // Do not treat user_metadata.role as authority
  const userMetaRole = user?.user_metadata?.role;

  await client.auth.signOut().catch(() => {});

  const authPass = Boolean(user && emailMatch && tokenPresent && uidPresent);
  return {
    auth: authPass ? "PASS" : "FAIL",
    roleCheck: roleOk ? "PASS" : "FAIL",
    reason: authPass
      ? roleOk
        ? "ok"
        : `app_metadata.role mismatch (got ${typeof appRole === "string" ? appRole : "absent"})`
      : "sign-in or identity mismatch",
    userIdRedacted: user?.id ? redactId(user.id) : "—",
    emailRedacted: redactEmail(email),
    expiresAt,
    appRole: typeof appRole === "string" ? appRole : "absent",
    uidPresent,
    userMetadataRoleIgnored: userMetaRole === undefined ? "absent" : "present_ignored",
  };
}

async function main() {
  const mode = (process.argv[2] ?? "provision").toLowerCase();
  if (mode !== "provision" && mode !== "verify") {
    console.error("Usage: node provision-test-users.mjs [provision|verify]");
    process.exit(2);
  }

  const env = loadEnv();
  if ((env.PACK005_NON_PRODUCTION_CONFIRMED ?? "").trim().toLowerCase() !== "true") {
    console.error("STOP: PACK005_NON_PRODUCTION_CONFIRMED must be true");
    process.exit(1);
  }

  const url = (env.PACK005_SUPABASE_URL ?? "").trim();
  const ref = (env.PACK005_SUPABASE_PROJECT_REF ?? "").trim();
  const anon = (env.PACK005_SUPABASE_ANON_KEY ?? "").trim();
  const service = (env.PACK005_SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!url || !ref || !anon) {
    console.error("STOP: URL, project ref, and anon key are required");
    process.exit(1);
  }
  if (!service) {
    console.error(
      "STOP: PACK005_SUPABASE_SERVICE_ROLE_KEY required for Auth Admin provisioning (server-side only)",
    );
    process.exit(1);
  }
  if (!service.startsWith("eyJ") && !service.startsWith("sb_secret_")) {
    console.error(
      "STOP: service key shape invalid — use Dashboard API secret (sb_secret_…) or legacy service_role JWT (eyJ…). Value not printed.",
    );
    process.exit(1);
  }
  if (!anon.startsWith("eyJ") && !anon.startsWith("sb_publishable_")) {
    console.error(
      "STOP: anon/publishable key shape invalid — use sb_publishable_… or legacy anon JWT (eyJ…). Value not printed.",
    );
    process.exit(1);
  }

  assertProjectAlignment(ref, url);

  console.log("PACK-005 provision-test-users (sanitized)");
  console.log(`mode: ${mode}`);
  console.log(`non_production_confirmed: true`);
  console.log(`project_ref: ${ref}`);
  console.log("secrets: REDACTED");
  console.log("");

  /** @type {Array<Record<string, string>>} */
  const rows = [];

  if (mode === "provision") {
    const admin = createClient(url, service, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    for (const role of ROLES) {
      const { email, password } = credentialsFor(env, role);
      try {
        const { action, userId } = await provisionOne(admin, role, email, password);
        console.log(
          `provision ${role}: ${action} id=${redactId(userId)} email=${redactEmail(email)}`,
        );
        rows.push({ role, provision: action });
      } catch (err) {
        console.error(`provision ${role}: FAIL — ${redactError(err)}`);
        process.exit(1);
      }
    }
    console.log("");
  }

  let allPass = true;
  for (const role of ROLES) {
    const { email, password } = credentialsFor(env, role);
    const result = await verifySignIn(url, anon, role, email, password);
    if (result.auth !== "PASS" || result.roleCheck !== "PASS") allPass = false;
    console.log(`verify ${role}:`);
    console.log(`  email: ${result.emailRedacted}`);
    console.log(`  user_id: ${result.userIdRedacted}`);
    console.log(`  auth: ${result.auth}`);
    console.log(`  app_metadata.role: ${result.appRole} (${result.roleCheck})`);
    console.log(`  token: ${result.auth === "PASS" ? "present_redacted" : "absent"}`);
    console.log(`  token_expiry: ${result.expiresAt}`);
    console.log(`  auth.uid_available: ${result.uidPresent ? "yes" : "no"}`);
    console.log(`  user_metadata.role: ${result.userMetadataRoleIgnored} (not authoritative)`);
    if (result.reason !== "ok") console.log(`  detail: ${result.reason}`);
    console.log("");
    rows.push({
      role,
      auth: result.auth,
      roleCheck: result.roleCheck,
    });
  }

  console.log(
    `authorization_source: app_metadata.role (profile table not required)`,
  );
  console.log(`overall: ${allPass ? "PASS" : "FAIL"}`);
  process.exit(allPass ? 0 : 1);
}

try {
  await main();
} catch (err) {
  console.error(`STOP: ${redactError(err)}`);
  process.exit(1);
}
