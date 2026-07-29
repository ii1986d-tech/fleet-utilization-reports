# Gate Matrix — FUR-001

> Updated after PACK-001 Apply 2026-07-29

- discovery: READY — DISCOVERY-REPORT.md filled from Anweisungen + repo scan
- business: READY — internal mandate; formal ROI light (BUSINESS-VALIDATION)
- dataModel: READY — data/DATA-MODEL.md
- architecture: READY — ADR-001…004
- governance: READY — governance/PROFILE.md Professional
- build: READY — PACK-001 foundation code
- dryRun: READY — approved
- approval: READY — human apply freigabe
- validation: READY — typecheck/lint/test/build PASS
- review: BLOCKED — awaiting Architect decision
- accepted: BLOCKED
- release: BLOCKED
- production: BLOCKED
- operations: BLOCKED

## Checks

- tests: PASS (Vitest smoke 5/5)
- security: OPEN (RLS stubs present; full review later)
- performance: OPEN
- accessibility: OPEN
- backup: OPEN
- rollback: OPEN (git revert + db reset documented)
