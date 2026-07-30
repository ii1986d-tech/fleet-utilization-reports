# Git Checkpoint

> PACK-004 formally accepted with follow-ups — checkpoint **committed** on master

## PACK-004 (current)

- Sprint: sprint-004 / PACK-004
- Baseline (PACK-003 checkpoint): `a68d8f9`
- Pack status: **PACK_004_ACCEPTED_WITH_FOLLOW_UPS**
- Checkpoint status: **PACK_004_CHECKPOINT_COMMITTED**
- Architect Review: `sprints/sprint-004/ARCHITECT-REVIEW.md` → ACCEPT_WITH_FOLLOW_UPS (+ focused transport correction)
- Acceptance: `sprints/sprint-004/ACCEPTANCE-RECORD.md`
- Builder report: `sprints/sprint-004/BUILDER-REPORT.md`
- Dependency: **exceljs 4.4.0** (server-only; no second spreadsheet library)
- Migration: `20260730170000_pack004_import_hardening.sql` (remote applied + verified; Local == Remote)
- Validation environment: remote Supabase (approved isolated dev)
- Local Docker/WSL: environment note only (RSK-009 / FU-002-06)
- PACK-005 / Frotcom: **not started**

### Gates

| Gate | Result |
|---|---|
| `npm test` | **63/63 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

### Integrity highlights

- `persist_assignment_import_row` atomic per-row RPC (SECURITY INVOKER, fixed search_path)
- `persistence_errors` separated from validation_*
- CAS `begin_import_job_confirm` hardened + transport-failure finalize correction
- Formula-safe on-demand import error report
- Admin-only authorization + RLS not weakened

### Checkpoint commit

- Message: `feat: complete PACK-004 import hardening`
- Hash: see `git log -1 --oneline` on master after acceptance commit

### Accepted follow-ups (must remain after commit)

- FU-003-01 **CLOSED**
- FU-003-02 / FU-003-03 **OPEN** / RSK-016
- FU-002-01…06 **OPEN** / RSK-012 (live JWT NOT_EXECUTED; concurrency residual)

---

## PACK-003 (preserved)

- Checkpoint commit: **`a68d8f9`**
- Pack status: **PACK_003_ACCEPTED_WITH_FOLLOW_UPS**
- Migration: `20260730153000_import_jobs_protocol.sql`

---

## PACK-002 (preserved)

- Checkpoint commit: **`21ab8aa`**
- Pack status: **PACK_002_ACCEPTED_WITH_FOLLOW_UPS**
- Migration: `20260730140000_assignment_overlap_guard.sql`
- Follow-ups: FU-002-01…06 / RSK-012

---

## PACK-001 (preserved)

- Checkpoint commit: **`20f2698`**
- Pack status: **PACK_001_ACCEPTED**
- Post-acceptance: **PACK_001_POST_ACCEPTANCE_CHECK_PASS**
- Gate DATABASE_APPLY_REQUIRED_BEFORE_PACK-002: **CLOSED**
