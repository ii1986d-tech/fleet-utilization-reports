#!/usr/bin/env node
/**
 * PACK-006 local-only Auth test user provisioner (idempotent).
 * Uses Auth Admin API + service-role client. Never touches remote projects.
 *
 *   npm run pack006:provision-local-users
 */
import {
  assertNeverReadsPrivateSamples,
  formatSupabaseError,
  loadEnv,
  redactError,
  serviceClient,
} from "./lib.mjs";

export const ROLES = /** @type {const} */ (["admin", "manager", "viewer"]);

const PLACEHOLDER_EXACT_RE =
  /^(change.?me|changeme|password|secret|example|todo|xxx+|placeholder|<.*>|\[.*\]|your[-_].*|REPLACE_ME)$/i;

/**
 * @param {string} email
 */
export function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

/**
 * True when a required credential value is empty or an obvious example placeholder.
 * Synthetic local emails (e.g. admin@local.test) are allowed.
 * @param {string} value
 */
export function looksLikePlaceholder(value) {
  const v = String(value ?? "").trim();
  if (!v) return true;
  if (PLACEHOLDER_EXACT_RE.test(v)) return true;
  if (/^(your_|YOUR_|xxx@)/i.test(v)) return true;
  if (/REPLACE_ME|changeme|CHANGEME|<\w+>/i.test(v)) return true;
  if (/^example@/i.test(v)) return true;
  return false;
}

/**
 * Strict local loopback HTTP URL only (never remote).
 * @param {string} url
 */
export function isLocalLoopbackHttpUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:") return false;
  const host = parsed.hostname.toLowerCase();
  return host === "127.0.0.1" || host === "localhost";
}

/**
 * Abort before any Auth mutation unless all local-only guards pass.
 * @param {Record<string, string>} env
 * @returns {{ roles: Array<{ role: "admin"|"manager"|"viewer"; email: string; password: string }> }}
 */
export function assertLocalProvisionGuards(env) {
  if ((env.PACK006_NON_PRODUCTION_CONFIRMED ?? "").toLowerCase() !== "true") {
    throw new Error("STOP: PACK006_NON_PRODUCTION_CONFIRMED must be true");
  }
  if ((env.PACK006_TARGET ?? "").toLowerCase() !== "local") {
    throw new Error(
      "STOP: pack006:provision-local-users is local-only (PACK006_TARGET must be local). " +
        "Never runs against remote even if PACK006_ALLOW_DESTRUCTIVE_TEST_PROJECT_RESET is set.",
    );
  }
  if (!isLocalLoopbackHttpUrl(env.PACK006_SUPABASE_URL ?? "")) {
    throw new Error(
      "STOP: PACK006_SUPABASE_URL must be http://127.0.0.1:* or http://localhost:* (local loopback only)",
    );
  }

  /** @type {Array<{ role: "admin"|"manager"|"viewer"; email: string; password: string }>} */
  const roles = [];
  for (const role of ROLES) {
    const upper = role.toUpperCase();
    const emailKey = `PACK006_${upper}_EMAIL`;
    const passKey = `PACK006_${upper}_PASSWORD`;
    const email = env[emailKey];
    const password = env[passKey];
    if (!email || !password) {
      throw new Error(`STOP: missing ${emailKey} and/or ${passKey}`);
    }
    if (looksLikePlaceholder(email)) {
      throw new Error(`STOP: ${emailKey} looks like a placeholder`);
    }
    if (looksLikePlaceholder(password)) {
      throw new Error(`STOP: ${passKey} looks like a placeholder`);
    }
    if (password.length < 8) {
      throw new Error(`STOP: ${passKey} must be at least 8 characters`);
    }
    roles.push({ role, email: normalizeEmail(email), password });
  }

  const emails = roles.map((r) => r.email);
  if (new Set(emails).size !== emails.length) {
    throw new Error("STOP: admin, manager and viewer emails must be distinct after normalization");
  }

  return { roles };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} email normalized
 */
export async function findUserByEmail(admin, email) {
  const target = normalizeEmail(email);
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const hit = users.find((u) => normalizeEmail(u.email ?? "") === target);
    if (hit) return hit;
    if (users.length < perPage) return null;
    page += 1;
    if (page > 50) {
      throw new Error("STOP: user listing exceeded safe page limit");
    }
  }
}

/**
 * Merge role into app_metadata without dropping unrelated keys.
 * Roles live only in app_metadata (never user_metadata).
 * @param {Record<string, unknown> | undefined} existing
 * @param {string} role
 */
export function mergeAppMetadataRole(existing, role) {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};
  return { ...base, role };
}

/**
 * @param {import("@supabase/supabase-js").User} user
 * @param {string} expectedRole
 * @param {string} expectedEmail
 */
export function assertVerifiedUser(user, expectedRole, expectedEmail) {
  if (normalizeEmail(user.email ?? "") !== normalizeEmail(expectedEmail)) {
    throw new Error("STOP: verified user email mismatch");
  }
  if (user.app_metadata?.role !== expectedRole) {
    throw new Error(
      `STOP: verified app_metadata.role mismatch (expected ${expectedRole}, got ${String(user.app_metadata?.role)})`,
    );
  }
  if (user.user_metadata && "role" in user.user_metadata) {
    // Do not fail if stale user_metadata.role exists historically; roles must be in app_metadata.
    // We never write role to user_metadata.
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {{ role: "admin"|"manager"|"viewer"; email: string; password: string }} spec
 * @returns {Promise<{ action: "created"|"updated"; email: string; role: string; verified: true }>}
 */
export async function provisionRoleUser(admin, spec) {
  const existing = await findUserByEmail(admin, spec.email);
  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
      app_metadata: mergeAppMetadataRole(undefined, spec.role),
    });
    if (error || !data.user) {
      throw new Error(
        `STOP: createUser failed for ${spec.role}: ${formatSupabaseError(error ?? "no user")}`,
      );
    }
    const { data: again, error: getErr } = await admin.auth.admin.getUserById(data.user.id);
    if (getErr || !again.user) {
      throw new Error(
        `STOP: verify after create failed for ${spec.role}: ${formatSupabaseError(getErr ?? "no user")}`,
      );
    }
    assertVerifiedUser(again.user, spec.role, spec.email);
    return { action: "created", email: spec.email, role: spec.role, verified: true };
  }

  const nextMeta = mergeAppMetadataRole(
    /** @type {Record<string, unknown>} */ (existing.app_metadata ?? {}),
    spec.role,
  );
  const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
    password: spec.password,
    email_confirm: true,
    app_metadata: nextMeta,
  });
  if (error || !data.user) {
    throw new Error(
      `STOP: updateUser failed for ${spec.role}: ${formatSupabaseError(error ?? "no user")}`,
    );
  }
  const { data: again, error: getErr } = await admin.auth.admin.getUserById(existing.id);
  if (getErr || !again.user) {
    throw new Error(
      `STOP: verify after update failed for ${spec.role}: ${formatSupabaseError(getErr ?? "no user")}`,
    );
  }
  assertVerifiedUser(again.user, spec.role, spec.email);
  return { action: "updated", email: spec.email, role: spec.role, verified: true };
}

/**
 * Safe one-line summary (no passwords, keys, tokens, full user objects).
 * @param {{ action: string; email: string; role: string; verified: boolean }} result
 */
export function formatProvisionResultLine(result) {
  return `${result.action} | verified=${result.verified} | role=${result.role} | email=${result.email}`;
}

/**
 * @param {string} text
 */
export function assertNoSecretsInOutput(text) {
  if (/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(text)) {
    throw new Error("STOP: output contained a JWT-like token");
  }
  if (/sb_secret_|sb_publishable_|SERVICE_ROLE|access_token|refresh_token/i.test(text)) {
    throw new Error("STOP: output contained secret-like material");
  }
}

async function main() {
  assertNeverReadsPrivateSamples();
  const env = loadEnv();
  const { roles } = assertLocalProvisionGuards(env);

  const admin = serviceClient(env);
  console.log("PACK-006 local Auth provisioner (service_role; secrets redacted)");

  const lines = [];
  for (const spec of roles) {
    const result = await provisionRoleUser(admin, spec);
    const line = formatProvisionResultLine(result);
    assertNoSecretsInOutput(line);
    console.log(line);
    lines.push(line);
  }

  assertNoSecretsInOutput(lines.join("\n"));
  console.log("PACK006_LOCAL_AUTH_USERS_PROVISIONED");
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("provision-local-users.mjs") ||
    process.argv[1].includes("provision-local-users"));

if (isDirectRun) {
  main().catch((err) => {
    console.error(redactError(err));
    process.exit(1);
  });
}
