/**
 * Sanitize-only diagnostics for PACK-005 keys. Never prints secret values.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, ".env.local");

function parseEnvFile(text) {
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

function band(s) {
  if (!s) return "EMPTY";
  if (s.length < 20) return "TOO_SHORT";
  if (s.length < 100) return "SHORT";
  if (s.length < 200) return "MED";
  return "LONG";
}

function kind(s) {
  if (!s) return "EMPTY";
  if (s.startsWith("eyJ")) return "JWT_LIKE";
  if (s.startsWith("sb_publishable") || s.startsWith("sb_secret")) return "SB_NEW_STYLE";
  if (s.startsWith("sb_")) return "SB_PREFIX";
  return "OTHER";
}

if (!existsSync(ENV_PATH)) {
  console.error("ENV_ABSENT");
  process.exit(1);
}

const env = parseEnvFile(readFileSync(ENV_PATH, "utf8"));
const anon = env.PACK005_SUPABASE_ANON_KEY || "";
const svc = env.PACK005_SUPABASE_SERVICE_ROLE_KEY || "";
const url = env.PACK005_SUPABASE_URL || "";
const ref = env.PACK005_SUPABASE_PROJECT_REF || "";

let hostOk = false;
try {
  hostOk = new URL(url).hostname.toLowerCase().startsWith(`${ref.toLowerCase()}.`);
} catch {
  hostOk = false;
}

console.log("project_ref_present", Boolean(ref));
console.log("url_host_matches_ref", hostOk);
console.log("anon_kind", kind(anon), "anon_len_band", band(anon));
console.log("svc_kind", kind(svc), "svc_len_band", band(svc));
console.log("anon_eq_svc", anon.length > 0 && anon === svc);
console.log("svc_has_whitespace", /\s/.test(svc));
console.log("svc_leading_bearer", /^bearer\s+/i.test(svc));
console.log(
  "anon_prefix_class",
  anon.startsWith("sb_publishable_")
    ? "sb_publishable_"
    : anon.startsWith("eyJ")
      ? "eyJ"
      : "other",
);
console.log(
  "svc_prefix_class",
  svc.startsWith("sb_secret_")
    ? "sb_secret_"
    : svc.startsWith("eyJ")
      ? "eyJ"
      : svc.startsWith("sb_")
        ? "sb_other"
        : "other",
);
console.log(
  "hint",
  svc.startsWith("sb_secret_") || svc.startsWith("eyJ")
    ? "service_key_shape_ok"
    : "service_key_shape_unexpected_expect_sb_secret_or_legacy_jwt",
);
