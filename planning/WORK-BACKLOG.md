# Work Backlog

> Updated **2026-08-06** — Mission Control reconciliation; PACK-007 IMPLEMENTED_PENDING_CLOSEOUT; PACK-008 IMPLEMENTED_PENDING_PILOT; FU-SCALE / FU-AI / FU-SEC open

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
| TASK-011 | REQ-EXPORT | Must | 68 | Server-side Excel + PDF exports | Builder | Planned → **PACK-008** for transport-order/calc export; utilization filter exports TBD | Export formats PDF+Excel; roles admin/manager/viewer | PACK-008 (after 006/007) |
| TASK-023 | REQ-PDF-ORDER | Must | 77 | Architect pack for PDF transport-order extraction (incl. AI update) | Architect | **Done (Architect)** | Sprint-006 + ADR-009 AI provider strategy | `sprints/sprint-006/*`; ADR-009 |
| TASK-024 | REQ-PDF-ORDER | Must | 76 | Supply SPL-006-001…003 + expected-field manifests under references/private/pack-006/ | Human/Architect | **Done (local ignored)** | 26/26 pairs; 8 human_verified; DS-004 complete | DRY-RUN-READINESS.md |
| TASK-030 | REQ-PDF-ORDER | Must | 75 | Architect Re-Review remediated ADR-009 | Architect | **Done** | ADR ACCEPTED (design); ARCHITECT_REVIEW_PASS | ARCHITECT-REVIEW.md |
| TASK-028 | REQ-PDF-ORDER | Must | 76 | Resolve DS-005 external AI data-processing approval | Human/Legal/Architect | **Done** | DS-005 APPROVED 2026-08-05 (Gemini/Groq/Qwen/Manual; real PDFs permitted) | DS-005-DECISION-TEMPLATE.md |
| TASK-025 | REQ-PDF-ORDER | Must | 75 | PACK-006 Apply: AI extract + field confirm + Weiter gate | Builder | **DONE** | Mock-path + provider wiring; gates/UAT/smoke PASS; DS-005 APPROVED; ASM-014 SET | CLOSEOUT-AUDIT.md; BUILDER-REPORT.md; `08acb65`…`3bbd605` |
| TASK-031 | REQ-PDF-ORDER | Must | 75 | PACK-006 manual browser smoke (Settings → Orders) | Human/Builder | **DONE** | Admin/manager/viewer 30/30 PASS · I. Dimitrov · 2026-08-05 | `MANUAL-BROWSER-SMOKE-CHECKLIST.md` |
| TASK-029 | REQ-PDF-ORDER | Must | 74 | Architect: field-confirmation workflow docs | Architect | **Done** | Review states, roles, gate, audit, AC cases | sprint-006 + ADR-009 |
| TASK-026 | REQ-ROUTE-KM | Must | 74 | PACK-007: predefined routes + Maps handling + km comparison | Architect→Builder | **DONE** (pack **IMPLEMENTED_PENDING_CLOSEOUT**) | Corridor choice; Maps; paid vs actual vs direct km; cache; manual overrides; UI; formal closeout pending | `sprints/sprint-007/` · `3fb96fb` |
| TASK-034 | REQ-ROUTE-KM / FR-007-08 | Must | 72 | Implement manual Google Maps link input | Builder | **DONE** | Dispatcher override `manual_route_url`; viewer read-only | Part 2–3 `3d73d76` / `3fb96fb` |
| TASK-035 | REQ-ROUTE-KM / FR-007-09 | Must | 72 | Implement manual KM input | Builder | **DONE** | Manual paid_km / actual_km; source=manual; viewer read-only | Part 2–3 `3d73d76` / `3fb96fb` |
| TASK-036 | REQ-ROUTE-KM / FR-007-10 | Should | 68 | Implement predefined route corridors (selectable) | Builder | **DONE** | 4–5 corridors; `route_corridors`; admin CRUD/deactivate; UI select | Part 3 `3fb96fb` |
| TASK-027 | REQ-EXPORT-ORDERS | Must | 73 | PACK-008: export extracted+calculated order data | Builder | **DONE** (pack **IMPLEMENTED_PENDING_PILOT**) | PDF + Excel; filters; admin/manager/viewer; no live AI; TASK-037 pilot open | `src/lib/export/` · `app/api/export` · `86bcf2f` |
| TASK-037 | REQ-EXPORT-ORDERS | Should | 60 | PACK-008 Pilot — test export with real data | Human/Builder | **NOT_STARTED** | Smoke Excel + PDF with real orders; verify sheets/pages/filters | After PACK-008 Apply |
| FU-AI-001 | REQ-PDF-ORDER / AI | Should | 50 | Gemini prompt tuning for complex multi-stop orders | Architect/Builder | **NOT_STARTED** — MEDIUM | Improve extraction for 2–3 pickup + 2–3 delivery / complex layouts; prompt + optional schema; ~1–2 days | After PACK-007 or more PDF templates; pilot 2026-08-05 |
| FU-SEC-001 | REQ-SEC / npm audit | Should | 55 | Next.js 15 → 16 major upgrade (postcss + sharp highs) | Engineering | **Open** — MEDIUM; before 50-disponent rollout | Regression suite PACK-001…006 + browser smoke re-test; ~2–3 days | `SECURITY_OPERATIONS_READINESS_REPORT.md` |
| FU-SEC-002 | REQ-SEC / npm audit | Could | 35 | exceljs uuid moderate vulnerability | Engineering | **Open** — LOW; low exploitability in import path | Wait for exceljs bump **or** approved override review; ~0.5d override / 0d if upstream | Blocked by upstream exceljs or security review; commit `55eabf3` |
| FU-SCALE-001 | REQ-SCALE / Gemini | Must | 70 | Upgrade Gemini to Paid Tier | Engineering | **NOT_STARTED** — HIGH (Phase 2) | Increase rate limits beyond Free Tier ~60 req/min; ~0.5 days | Before 10–20 users; Google Cloud billing |
| FU-SCALE-002 | REQ-SCALE / queue | Must | 72 | Queue/worker for async PDF processing | Engineering | **NOT_STARTED** — HIGH (Phase 3) | Async extraction for ~50 simultaneous uploads; ~3–5 days | Before 50 users; Edge Functions or external queue |
| FU-SCALE-003 | REQ-SCALE / storage | Must | 70 | Upgrade Supabase to Paid Tier | Engineering | **NOT_STARTED** — HIGH (Phase 3) | Free 5 GB → Paid ~100 GB for PDF storage; ~0.5 days | Before 50 users; Supabase billing |
| FU-SCALE-004 | REQ-SCALE / cache | Should | 60 | Implement Redis (or shared) caching | Engineering | **NOT_STARTED** — MEDIUM (Phase 2) | Replace in-memory Maps/cost cache; shared across instances; ~1–2 days | Before 10–20 users; Redis instance |
| FU-SCALE-005 | REQ-SCALE / rate-limit | Should | 60 | Implement rate limiting | Engineering | **NOT_STARTED** — MEDIUM (Phase 2) | Per-user + global limits to prevent API abuse; ~1 day | Before 10–20 users |
| FU-SCALE-006 | REQ-SCALE / Maps budget | Should | 58 | Increase Google Maps budget | Engineering | **NOT_STARTED** — MEDIUM (Phase 2) | Raise ceiling from $50/mo to $100/mo; ~0.5 days | Before 10–20 users; Google Cloud billing |
| FU-SCALE-007 | REQ-SCALE / load-test | Must | 68 | Load testing with 50 simulated users | Engineering | **NOT_STARTED** — HIGH (Phase 3) | Validate architecture under 50-user load; ~2–3 days | Before 50 users; depends FU-SCALE-001/002/003 |
| FU-SCALE-008 | REQ-SCALE / monitoring | Should | 55 | Monitoring and alerting | Engineering | **NOT_STARTED** — MEDIUM (Phase 3) | API usage, errors, performance alerts; ~2–3 days | Before 50 users |

Notes:

- PACK-005: **PACK_005_ACCEPTED_WITH_FOLLOW_UPS** — evidence-closure only; FU-002/FU-003 follow-ups closed (with residuals on FU-002-05 / FU-003-02).
- FU-003-01 remains **CLOSED**; do not reopen without regression evidence.
- OQ-004-04 concurrent import CAS: **CLOSED / SATISFIED** (BEST-EFFORT).
- Residuals remain visible: FOR UPDATE gap; C14 unit-only; retained Auth test identities.
- Local Docker/Supabase: **available** for PACK-006 local evidence (preflight + DB suite + synthetic UAT).
- Frotcom remains DS-001-blocked and is **not** auto-assigned to PACK-006…008.
- PACK-006 **COMPLETE** 2026-08-05; Gemini free-tier pilot **SUCCESS** (`docs/GEMINI-PILOT-REPORT-2026-08-05.md`); FU-AI-001 for complex multi-stop tuning.
- npm audit residuals → **FU-SEC-001** / **FU-SEC-002** (non-blocking).
- PACK-007: **IMPLEMENTED_PENDING_CLOSEOUT** (`3fb96fb`) — not COMPLETE without formal closeout.
- PACK-008: **IMPLEMENTED_PENDING_PILOT** (`86bcf2f`, TASK-027) — not COMPLETE while TASK-037 open.
- Scaling: Phase 1 pilot (1–5) **READY**; Phase 2/3 gated by **FU-SCALE-001…008** — see `docs/SCALING-ASSESSMENT-50-DISPATCHERS.md` · **RSK-SCALE-001**.
- Task status owner: this file. Pack lifecycle owner: `PACK-REGISTRY.md` + `EXECUTION-STATE.json`. Next action: `STATE.md`.
