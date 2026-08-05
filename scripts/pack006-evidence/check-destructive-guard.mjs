#!/usr/bin/env node
/**
 * Refuses to print a remote destructive reset command unless acknowledgement is set.
 * Does not execute supabase itself.
 */
import { loadEnv, redactError } from "./lib.mjs";

try {
  const env = loadEnv();
  if (env.PACK006_TARGET !== "remote") {
    console.log("Destructive remote guard: target is not remote. Local reset uses: npx supabase db reset");
    process.exit(0);
  }
  if ((env.PACK006_ALLOW_DESTRUCTIVE_TEST_PROJECT_RESET ?? "").toLowerCase() !== "true") {
    console.error(
      "STOP: remote destructive reset refused. Set PACK006_ALLOW_DESTRUCTIVE_TEST_PROJECT_RESET=true " +
        "only for an approved disposable test project. Never production.",
    );
    process.exit(1);
  }
  console.log(
    "ACKNOWLEDGED: operator may run non-production linked reset manually:\n" +
      "  npx supabase link --project-ref <TEST_REF>\n" +
      "  npx supabase db reset --linked\n" +
      "This script does not execute those commands.",
  );
} catch (err) {
  console.error(redactError(err));
  process.exit(1);
}
