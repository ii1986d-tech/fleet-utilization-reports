/**
 * Non-mutating p5ev_* leftover check for Architect Review.
 * Never prints secrets.
 */
import { loadEnv, serviceClient, runId } from "./lib.mjs";

const env = loadEnv();
const run = runId(env);
const prefix = `p5ev_${run}_`;
const svc = serviceClient(env);

async function count(table, column, pattern) {
  const { count, error } = await svc
    .from(table)
    .select("id", { count: "exact", head: true })
    .ilike(column, pattern);
  if (error) throw error;
  return count ?? 0;
}

const out = {
  runId: run,
  drivers: await count("drivers", "full_name", `${prefix}%`),
  customers: await count("customers", "name", `${prefix}%`),
  vehicles: await count("vehicles", "display_name", `${prefix}%`),
  assignments: await count("vehicle_assignments", "notes", `%${prefix}%`),
  import_jobs: await count("import_jobs", "source_filename", `%${prefix}%`),
};

// also scan broader p5ev_ prefix in case run id doubled
const broad = {
  drivers: await count("drivers", "full_name", "p5ev_%"),
  customers: await count("customers", "name", "p5ev_%"),
  vehicles: await count("vehicles", "display_name", "p5ev_%"),
  assignments: await count("vehicle_assignments", "notes", "%p5ev_%"),
  import_jobs: await count("import_jobs", "source_filename", "%p5ev_%"),
};

console.log("cleanup_verify_run", JSON.stringify(out));
console.log("cleanup_verify_broad_p5ev", JSON.stringify(broad));
const numericClean =
  out.drivers === 0 &&
  out.customers === 0 &&
  out.vehicles === 0 &&
  out.assignments === 0 &&
  out.import_jobs === 0 &&
  broad.drivers === 0 &&
  broad.customers === 0 &&
  broad.vehicles === 0 &&
  broad.assignments === 0 &&
  broad.import_jobs === 0;
console.log("cleanup_class", numericClean ? "COMPLETE_WITH_RETAINED_TEST_IDENTITIES" : "INCOMPLETE");
process.exit(numericClean ? 0 : 1);
