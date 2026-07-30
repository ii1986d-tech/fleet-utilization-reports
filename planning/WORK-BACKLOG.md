# Work Backlog

> Updated 2026-07-30 — PACK-004 Architect Review complete

| ID | Requirement | Priority | Score | Title | Owner | Status | Definition of Done | Evidence |
|---|---|---|---:|---|---|---|---|---|
| TASK-001 | REQ-FOUND | Must | 95 | Next.js App Router + TS strict scaffold | Builder | Done | App boots; lint/typecheck/build scripts | PACK-001 Builder Report |
| TASK-002 | REQ-FOUND | Must | 94 | Supabase project wiring + env example | Builder | Done | `.env.example`; client/server helpers; no secrets committed | PACK-001 Builder Report |
| TASK-003 | REQ-AUTH | Must | 93 | Auth + roles admin/manager/viewer + RLS stubs | Builder | Done | Role claim mapped; RLS policies for master tables | docs/AUTH-ROLES.md + migrations |
| TASK-004 | REQ-DATA | Must | 92 | Migrations for vehicles/drivers/customers/assignments/daily_reports/import_jobs/sync_runs/settings | Builder | Done | Migrations SQL ready; unique (vehicle_id, report_date) | supabase/migrations |
| TASK-005 | REQ-TEST | Must | 90 | Test infrastructure + fixtures skeleton | Builder | Done | Test runner configured; sample fixture loads | Vitest |
| TASK-006 | REQ-FROTCOM | Must | 88 | Frotcom adapter interfaces + mock fixtures | Builder | Done | No live calls; types/schemas/normalize stubs | src/lib/frotcom |
| TASK-007 | REQ-ASSIGN | Must | 80 | Assignment CRUD + mandatory overlap + in-place correct + no hard delete | Builder | **Done** | ADR-005/006; 409; migration applied; accepted | PACK-002 ACCEPTANCE-RECORD |
| TASK-012 | REQ-ASSIGN / FU-002-01 | Should | 72 | Automated RLS validation with real Auth/JWT users | Builder | Open → **PACK-004** | Viewer/manager write deny + admin allow under real JWT | RSK-012 |
| TASK-013 | REQ-ASSIGN / FU-002-02 | Should | 70 | Parallel-client race harness for overlapping assignment writes | Builder | Open → **PACK-004** (residual OK) | ≤1 success; loser 409/constraint | RSK-012 |
| TASK-014 | REQ-ASSIGN / FU-002-03 | Should | 74 | Live DB-bypass → 409 `ASSIGNMENT_OVERLAP` integration test | Builder | Open → **PACK-004** | Bypass app check; constraint + mapper evidence | RSK-012 |
| TASK-015 | REQ-ASSIGN / FU-002-04 | Should | 71 | End/deactivate row-preservation assertions | Builder | Open → **PACK-004** | Row remains queryable after end/deactivate | RSK-012 |
| TASK-016 | REQ-ASSIGN / FU-002-05 | Should | 69 | ADR-006 correction hardening (`SELECT FOR UPDATE` or equivalent) | Architect/Builder | Open → **PACK-004** | Review + optional hardening; ADR-006 intact | RSK-012 |
| TASK-008 | REQ-IMPORT | Must | 78 | Excel assignment import pipeline | Builder | **Done (accepted w/ FU)** | ADR-007; migration 20260730153000; 38/38 gates | PACK-003 `a68d8f9` |
| TASK-017 | REQ-IMPORT / FU-003-01 | Should | 73 | Downloadable Excel error report for import jobs | Builder | **Done (FU closed)** | `.xlsx` from import_job_rows; formula-safe | ARCHITECT-REVIEW; unit tests |
| TASK-018 | REQ-IMPORT / FU-003-02 | Should | 72 | Automated confirm/partial/create-on import tests | Builder | Open (residual) | Cover confirm paths + transport-failure fix | RSK-016 / ARCHITECT-REVIEW |
| TASK-019 | REQ-IMPORT / FU-003-03 | Should | 71 | Atomic per-row master create + assignment insert | Builder | Open (empirical) | One TX/RPC per row; orphan DB proof | migration `20260730170000` |
| TASK-020 | REQ-P4-AUDIT | Should | 70 | Preserve preview validation errors across persist | Builder | Done → accepted w/ pack | `persistence_errors` mandatory; no overwrite validation_* | ADR-008 / ARCHITECT-REVIEW |
| TASK-021 | REQ-P4-DB | Should | 69 | CAS + persist_assignment_import_row hardening | Builder | Done → accepted w/ pack | search_path; INVOKER; is_admin; grants | ADR-008 / ARCHITECT-REVIEW |

| TASK-009 | REQ-UI | Must | 76 | Utilization overview + vehicle detail on mocks | Builder | **Deferred** (OQ-004-01 RESOLVED ACCEPT DEFAULT) | Filters + status engine + quality badges | Later pack |
| TASK-010 | REQ-SYNC | Must | 70 | Live Frotcom + n8n daily workflow | Builder | Blocked | DS-001 cleared; sync_runs evidence | PACK-005 |
| TASK-011 | REQ-EXPORT | Must | 68 | Server-side Excel + PDF exports | Builder | Planned | Filter-respecting exports | PACK-006 |

Notes:

- TASK-012…016 and TASK-018…019 remain open with **original IDs** where evidence incomplete; do not renumber.
- FU-003-01 closed by Architect Review; FU-002-06 / RSK-009 remains environment note only.
- PACK-004: **PACK_004_ACCEPTED_WITH_FOLLOW_UPS**; open FUs remain; PACK-005 blocked.
- PACK-005 / Frotcom blocked. Reports UI deferred (OQ-004-01 RESOLVED ACCEPT DEFAULT).
