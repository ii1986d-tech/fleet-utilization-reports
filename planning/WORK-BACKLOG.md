# Work Backlog

> Updated 2026-08-03 — PACK-005 formally accepted with follow-ups

| ID | Requirement | Priority | Score | Title | Owner | Status | Definition of Done | Evidence |
|---|---|---|---:|---|---|---|---|---|
| TASK-001 | REQ-FOUND | Must | 95 | Next.js App Router + TS strict scaffold | Builder | Done | App boots; lint/typecheck/build scripts | PACK-001 Builder Report |
| TASK-002 | REQ-FOUND | Must | 94 | Supabase project wiring + env example | Builder | Done | `.env.example`; client/server helpers; no secrets committed | PACK-001 Builder Report |
| TASK-003 | REQ-AUTH | Must | 93 | Auth + roles admin/manager/viewer + RLS stubs | Builder | Done | Role claim mapped; RLS policies for master tables | docs/AUTH-ROLES.md + migrations |
| TASK-004 | REQ-DATA | Must | 92 | Migrations for vehicles/drivers/customers/assignments/daily_reports/import_jobs/sync_runs/settings | Builder | Done | Migrations SQL ready; unique (vehicle_id, report_date) | supabase/migrations |
| TASK-005 | REQ-TEST | Must | 90 | Test infrastructure + fixtures skeleton | Builder | Done | Test runner configured; sample fixture loads | Vitest |
| TASK-006 | REQ-FROTCOM | Must | 88 | Frotcom adapter interfaces + mock fixtures | Builder | Done | No live calls; types/schemas/normalize stubs | src/lib/frotcom |
| TASK-007 | REQ-ASSIGN | Must | 80 | Assignment CRUD + mandatory overlap + in-place correct + no hard delete | Builder | **Done** | ADR-005/006; 409; migration applied; accepted | PACK-002 ACCEPTANCE-RECORD |
| TASK-012 | REQ-ASSIGN / FU-002-01 | Should | 72 | Automated RLS validation with real Auth/JWT users | Builder | **Done (FU CLOSED)** | Viewer/manager write deny + admin allow under real JWT | PACK-005 ACCEPTANCE-RECORD |
| TASK-013 | REQ-ASSIGN / FU-002-02 | Should | 70 | Parallel-client race harness for overlapping assignment writes | Builder | **Done (FU CLOSED)** | ≤1 success; loser 409/constraint | PACK-005 ACCEPTANCE-RECORD |
| TASK-014 | REQ-ASSIGN / FU-002-03 | Should | 74 | Live DB-bypass → 409 `ASSIGNMENT_OVERLAP` integration test | Builder | **Done (FU CLOSED)** | Bypass app check; constraint + mapper evidence | PACK-005 ACCEPTANCE-RECORD |
| TASK-015 | REQ-ASSIGN / FU-002-04 | Should | 71 | End/deactivate row-preservation assertions | Builder | **Done (FU CLOSED)** | Row remains queryable after end/deactivate | PACK-005 ACCEPTANCE-RECORD |
| TASK-016 | REQ-ASSIGN / FU-002-05 | Should | 69 | ADR-006 correction hardening (`SELECT FOR UPDATE` or equivalent) | Architect/Builder | **Done (CLOSED_WITH_RESIDUAL)** | FOR UPDATE gap documented; exclusion protects | PACK-005 ACCEPTANCE-RECORD |
| TASK-008 | REQ-IMPORT | Must | 78 | Excel assignment import pipeline | Builder | **Done (accepted w/ FU)** | ADR-007; migration 20260730153000; 38/38 gates | PACK-003 `a68d8f9` |
| TASK-017 | REQ-IMPORT / FU-003-01 | Should | 73 | Downloadable Excel error report for import jobs | Builder | **Done (FU closed)** | `.xlsx` from import_job_rows; formula-safe | ARCHITECT-REVIEW; unit tests |
| TASK-018 | REQ-IMPORT / FU-003-02 | Should | 72 | Automated confirm/partial/create-on import tests | Builder | **Done (CLOSED_WITH_RESIDUAL)** | Remote C01–C13; C14 unit residual | PACK-005 ACCEPTANCE-RECORD |
| TASK-019 | REQ-IMPORT / FU-003-03 | Should | 71 | Atomic per-row master create + assignment insert | Builder | **Done (FU CLOSED)** | Empirical orphan-rollback DB proof | PACK-005 ACCEPTANCE-RECORD |
| TASK-020 | REQ-P4-AUDIT | Should | 70 | Preserve preview validation errors across persist | Builder | Done → accepted w/ pack | `persistence_errors` mandatory; no overwrite validation_* | ADR-008 / ARCHITECT-REVIEW |
| TASK-021 | REQ-P4-DB | Should | 69 | CAS + persist_assignment_import_row hardening | Builder | Done → accepted w/ pack | search_path; INVOKER; is_admin; grants | ADR-008 / ARCHITECT-REVIEW |
| TASK-022 | REQ-ENV / FU-002-06 | Could | 40 | Document local Docker/WSL unavailability residual | Architect | **Done (FU CLOSED)** | RSK-009 env note; remote substitute | PACK-005 ACCEPTANCE-RECORD |

| TASK-009 | REQ-UI | Must | 76 | Utilization overview + vehicle detail on mocks | Builder | **Deferred** (OQ-004-01 RESOLVED ACCEPT DEFAULT) | Filters + status engine + quality badges | Later pack (not PACK-005) |
| TASK-010 | REQ-SYNC | Must | 70 | Live Frotcom + n8n daily workflow | Builder | **Blocked** (DS-001) | DS-001 cleared; sync_runs evidence | **Future pack after DS-001 — not PACK-005** |
| TASK-011 | REQ-EXPORT | Must | 68 | Server-side Excel + PDF exports | Builder | Planned | Filter-respecting exports | Future pack (not PACK-005) |

Notes:

- PACK-005: **PACK_005_ACCEPTED_WITH_FOLLOW_UPS** — evidence-closure only; FU-002/FU-003 follow-ups closed (with residuals on FU-002-05 / FU-003-02).
- FU-003-01 remains **CLOSED**; do not reopen without regression evidence.
- OQ-004-04 concurrent import CAS: **CLOSED / SATISFIED** (BEST-EFFORT).
- Residuals remain visible: FOR UPDATE gap; C14 unit-only; local Docker unavailable; retained Auth test identities.
- Frotcom remains DS-001-blocked and is **not** auto-assigned to a next pack.
- No PACK-006 invented by this acceptance.
