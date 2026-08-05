#!/usr/bin/env node
/**
 * Entry: prepare env + preflight + run PACK-006 live vitest suite.
 * Does not mark evidence PASS by itself — vitest exit code is authoritative.
 *
 * Usage:
 *   node scripts/pack006-evidence/run-evidence-suite.mjs
 *   npm run test:pack006-db-evidence
 */
import { spawnSync } from "node:child_process";
import { assertNeverReadsPrivateSamples, loadEnv, redactError } from "./lib.mjs";

function main() {
  assertNeverReadsPrivateSamples();
  const envFile = loadEnv();

  console.log("Running preflight…");
  const pre = spawnSync(process.execPath, ["scripts/pack006-evidence/preflight.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (pre.status !== 0) {
    process.exit(pre.status ?? 1);
  }

  const env = {
    ...process.env,
    ...envFile,
    PACK006_DB_EVIDENCE: "1",
    // Never select memory for live evidence
    TRANSPORT_ORDER_STORE: "supabase",
  };
  delete env.TRANSPORT_ORDER_ALLOW_MEMORY_STORE;

  console.log("Running live vitest suite (PACK006_DB_EVIDENCE=1)…");
  const vitest = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vitest", "run", "tests/transport-orders/db-evidence.live.test.ts"],
    {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );
  process.exit(vitest.status ?? 1);
}

try {
  main();
} catch (err) {
  console.error(redactError(err));
  process.exit(1);
}
