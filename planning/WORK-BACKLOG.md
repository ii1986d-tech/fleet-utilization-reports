# Work Backlog

> Updated 2026-07-30 — PACK-003 accepted with follow-ups

| ID | Requirement | Priority | Score | Title | Owner | Status | Definition of Done | Evidence |
|---|---|---|---:|---|---|---|---|---|
| TASK-001 | REQ-FOUND | Must | 95 | Next.js App Router + TS strict scaffold | Builder | Done | App boots; lint/typecheck/build scripts | PACK-001 Builder Report |
| TASK-002 | REQ-FOUND | Must | 94 | Supabase project wiring + env example | Builder | Done | `.env.example`; client/server helpers; no secrets committed | PACK-001 Builder Report |
| TASK-003 | REQ-AUTH | Must | 93 | Auth + roles admin/manager/viewer + RLS stubs | Builder | Done | Role claim mapped; RLS policies for master tables | docs/AUTH-ROLES.md + migrations |
| TASK-004 | REQ-DATA | Must | 92 | Migrations for vehicles/drivers/customers/assignments/daily_reports/import_jobs/sync_runs/settings | Builder | Done | Migrations SQL ready; unique (vehicle_id, report_date) | supabase/migrations |
| TASK-005 | REQ-TEST | Must | 90 | Test infrastructure + fixtures skeleton | Builder | Done | Test runner configured; sample fixture loads | Vitest |
| TASK-006 | REQ-FROTCOM | Must | 88 | Frotcom adapter interfaces + mock fixtures | Builder | Done | No live calls; types/schemas/normalize stubs | src/lib/frotcom |
| TASK-007 | REQ-ASSIGN | Must | 80 | Assignment CRUD + mandatory overlap + in-place correct + no hard delete | Builder | **Done** | ADR-005/006; 409; migration applied; accepted | PACK-002 ACCEPTANCE-RECORD |
| TASK-012 | REQ-ASSIGN / FU-002-01 | Should | 72 | Automated RLS validation with real Auth/JWT users | Builder | Open (accepted FU) | Viewer/manager write deny + admin allow under real JWT | RSK-012 |
| TASK-013 | REQ-ASSIGN / FU-002-02 | Should | 70 | Parallel-client race harness for overlapping assignment writes | Builder | Open (accepted FU) | ≤1 success; loser 409/constraint | RSK-012 |
| TASK-014 | REQ-ASSIGN / FU-002-03 | Should | 74 | Live DB-bypass → 409 `ASSIGNMENT_OVERLAP` integration test | Builder | Open (accepted FU) | Bypass app check; constraint + mapper evidence | RSK-012 |
| TASK-015 | REQ-ASSIGN / FU-002-04 | Should | 71 | End/deactivate row-preservation assertions | Builder | Open (accepted FU) | Row remains queryable after end/deactivate | RSK-012 |
| TASK-016 | REQ-ASSIGN / FU-002-05 | Should | 69 | ADR-006 correction hardening (`SELECT FOR UPDATE` or equivalent) | Architect/Builder | Open (accepted FU) | Review + optional hardening; ADR-006 intact | RSK-012 |
| TASK-008 | REQ-IMPORT | Must | 78 | Excel assignment import pipeline | Builder | **Done (accepted w/ FU)** | ADR-007; migration 20260730153000; 38/38 gates | PACK-003 ACCEPTANCE-RECORD |
| TASK-017 | REQ-IMPORT / FU-003-01 | Should | 73 | Downloadable Excel error report for import jobs | Builder | Open (accepted FU) | `.xlsx` from import_job_rows | RSK-016 |
| TASK-018 | REQ-IMPORT / FU-003-02 | Should | 72 | Automated confirm/partial/create-on import tests | Builder | Open (accepted FU) | Cover PACK-003 §12 confirm paths | RSK-016 |
| TASK-019 | REQ-IMPORT / FU-003-03 | Should | 71 | Atomic per-row master create + assignment insert | Builder | Open (accepted FU) | One TX/RPC per row | RSK-016 |
| TASK-009 | REQ-UI | Must | 76 | Utilization overview + vehicle detail on mocks | Builder | Planned | Filters + status engine + quality badges | PACK-004 |
| TASK-010 | REQ-SYNC | Must | 70 | Live Frotcom + n8n daily workflow | Builder | Blocked | DS-001 cleared; sync_runs evidence | PACK-005 |
| TASK-011 | REQ-EXPORT | Must | 68 | Server-side Excel + PDF exports | Builder | Planned | Filter-respecting exports | PACK-006 |

Notes:

- TASK-012…016 are **PACK-002 accepted follow-ups** (RSK-012). Do not silently remove or absorb into PACK-003.
- TASK-017…019 are **PACK-003 accepted follow-ups** (RSK-016 / FU-003-01…03). Do not silently remove, merge, or renumber.
- Local Docker unavailability (FU-002-06 / RSK-009) is an environment note only — no separate build task.
- PACK-003: **PACK_003_ACCEPTED_WITH_FOLLOW_UPS** · checkpoint **PACK_003_CHECKPOINT_READY** (commit pending approval).
- PACK-004+ blocked until separate explicit start approval.
