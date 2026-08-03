# Post-PACK-004 Backlog and Evidence Assessment

> Date: 2026-07-30
> Mode: **Documentation-only** — no product code, tests, migrations, stage, commit, or push
> Baseline: `master` @ **`dbe59da`** (`feat: complete PACK-004 import hardening`)
> Status: **POST_PACK_004_ASSESSMENT_COMPLETE**
> Recommendation: **PACK_005_EVIDENCE_CLOSURE_RECOMMENDED**

---

## 1. Preflight

| Check | Result |
|---|---|
| Branch | `master` |
| HEAD | `dbe59dabdf08979ae0be329757b28d036f25c1ae` (`dbe59da`) |
| Working tree | **clean** |
| Staged | **none** |
| Latest commit | `feat: complete PACK-004 import hardening` |
| Migration Local == Remote | **PASS** (five migrations including `20260730170000`) |
| PACK-001…004 registry | All ACCEPTED / ACCEPTED_WITH_FOLLOW_UPS |
| PACK-005 implementation | **Absent** |
| Frotcom product/live work | **Absent** (mocks only under `src/lib/frotcom`) |

**Preflight: PASS** — expected baseline matches.

---

## 2. Source-of-Truth inventory (summary)

Read across: `planning/*`, `architecture/ADR-*` + register, `quality/*`, `project-state.json`, `git/GIT-CHECKPOINT.md`, `sprints/sprint-001…004/*`, `README.md`, `DISCOVERY-REPORT.md`, `OPEN-DECISION-STOPS.md`, app routes under `app/`.

### Pack status (authoritative for acceptance)

| Pack | Status | Checkpoint |
|---|---|---|
| PACK-001 | ACCEPTED | `20f2698` |
| PACK-002 | ACCEPTED_WITH_FOLLOW_UPS | `21ab8aa` |
| PACK-003 | ACCEPTED_WITH_FOLLOW_UPS | `a68d8f9` |
| PACK-004 | ACCEPTED_WITH_FOLLOW_UPS | `dbe59da` |

### Contradictions / drift found

| Issue | Severity | Notes |
|---|---|---|
| `planning/EXECUTION-STATE.json` `completedPackCheckpoint`: `"pending-git-log"` | Medium | Actual checkpoint is `dbe59da`; SoT drift |
| `project-state.json` nested `backlog[]` still shows TASK-001…006 as Planned | Medium | Stale mirror; WORK-BACKLOG is more current |
| WORK-BACKLOG still labels TASK-012…016 as “Open → **PACK-004**” | Low | PACK-004 already accepted; tasks remain open but label outdated |
| TEST-MATRIX TM-12 still says “FU-003-01 propose close” | Low | FU-003-01 is **CLOSED** |
| PACK-REGISTRY sequence: PACK-005 = “Frotcom + n8n” | High for planning | Collides with any non-Frotcom next pack; Frotcom blocked by DS-001 |
| README / Discovery still describe full Frotcom utilization reporting outcome | Info | Full vision ≠ delivered slice after PACK-004 |
| Home page still says “PACK-002 settings… Reporting UI later” | Info | Accurate for UI; import exists under settings |
| RSK-016 row still mentions “transport finalize correction tracked” | Low | Correction accepted; residual is FU-003-02 suite |
| ACCEPTANCE-RECORD header line-break glitch after whitespace strip | Cosmetic | Content intact |

None of these reverse pack acceptance. They **do** require SoT reconciliation before authorizing a numbered PACK-005 that is not Frotcom.

---

## 3. Follow-up inventory

### FU-002-01 — Live JWT RLS matrix

| Field | Assessment |
|---|---|
| Origin | PACK-002 / RSK-012 / TASK-012 |
| Requirement | Admin allow + manager/viewer/unauth deny on writes under real Auth JWT |
| Implementation | Design present (`requireAdmin`, RLS policies) |
| Automated tests | Unit role helpers only |
| Live evidence | **NOT_EXECUTED** |
| Missing | Live JWT scripts against remote (or local) Auth users |
| Needs | live JWT test + infrastructure access (Auth users) |
| Code change | Not required if policies already correct |
| Blocker for accepted packs | No (accepted residual) |
| Production risk | Medium — RLS unproven live |

### FU-002-02 — Parallel race harness (assignment overlap)

| Field | Assessment |
|---|---|
| Origin | PACK-002 / RSK-012 / TASK-013 |
| Class | Accepted residual risk (harness preferred) |
| Implementation | GiST exclusion + app overlap + 409 mapping |
| Evidence | Domain/unit; no concurrency harness |
| Needs | concurrency test |
| Code change | Unlikely |
| Production risk | Low–Medium (DB constraint is authority) |

### FU-002-03 — Live DB-bypass → 409 ASSIGNMENT_OVERLAP

| Field | Assessment |
|---|---|
| Origin | PACK-002 / TASK-014 |
| Missing | Integration that bypasses app check and proves constraint + mapper |
| Needs | remote/local DB integration test |
| Production risk | Medium |

### FU-002-04 — End/deactivate row-preservation asserts

| Field | Assessment |
|---|---|
| Origin | PACK-002 / TASK-015 |
| Implementation | No hard DELETE path (ADR-006) |
| Missing | Explicit automated assertions |
| Needs | unit/DB tests (may be code-test only) |
| Production risk | Low–Medium |

### FU-002-05 — ADR-006 correction locking (`FOR UPDATE` or equivalent)

| Field | Assessment |
|---|---|
| Origin | PACK-002 / TASK-016 |
| Implementation | Import row uses `FOR UPDATE` in persist RPC; assignment correction path not newly proven |
| Missing | Architect/Builder review note + optional code |
| Needs | documentation review and/or small code correction |
| Production risk | Medium under concurrent correction |

### FU-002-06 — Local Docker unavailable

| Field | Assessment |
|---|---|
| Origin | PACK-002 / RSK-009 |
| Class | Environment note |
| Needs | document (or local Docker when available) |
| Code change | No |
| Production risk | Low |

### FU-003-02 — Confirm / partial / create-on automated tests

| Field | Assessment |
|---|---|
| Origin | PACK-003 / RSK-016 / TASK-018 |
| Implementation | Confirm + RPC + transport correction present |
| Evidence | Unit/mocked transport helpers; **no DB confirm suite** |
| Missing | remote/local DB tests for confirm, partial success, create-on, counters |
| Needs | local and/or remote database tests (+ Auth) |
| Code change | Only if tests expose defects |
| Production risk | Medium |

### FU-003-03 — Empirical orphan-rollback proof

| Field | Assessment |
|---|---|
| Origin | PACK-003 / RSK-016 / TASK-019 |
| Implementation | **PROVEN_BY_IMPLEMENTATION** (PL/pgSQL subtransaction) |
| Evidence | No automated force-fail-after-create test |
| Missing | DB integration proving no orphan driver/customer |
| Needs | remote/local database test |
| Code change | Only if proof fails |
| Production risk | Medium (design believed safe) |

### Other OPEN / DEFERRED / NOT_EXECUTED (not renumbered FUs)

| Item | Class | Notes |
|---|---|---|
| TASK-009 reports UI | Deferred Must (OQ-004-01) | Product gap for full Anweisungen vision |
| TASK-010 live Frotcom + n8n | Blocked (DS-001) | Must not invent endpoints |
| TASK-011 Excel/PDF export | Planned (PACK-006 historically) | Depends on reports data/UI |
| TM-01…07 utilization metrics | OPEN | No product implementation yet |
| TM-14…16 / 17–18 / 20 | OPEN | Sync/export paths not built |
| DS-001 | Decision stop | Blocks live Frotcom |
| DS-002 timezone/org | Non-blocking default OK | |
| DS-003 credential rotation | Security/manual | Human confirmation |
| RSK-001,003,005,006 | OPEN | Mostly Phase 5+ / reports |
| release/production/operations evidence in project-state | Empty | No release pack executed |
| OQ-004-04 concurrent CAS | NOT_EXECUTED | Best-effort residual accepted |

---

## 4. Product-completeness assessment

### Stated full outcome (README / Discovery)

Manager utilization dashboard from Frotcom with filters, status thresholds, Excel/PDF export, historical assignments.

### Delivered after PACK-001…004 (repository evidence)

| Workflow | Status |
|---|---|
| Login / roles scaffolding | Implemented + accepted |
| Vehicles / drivers / customers CRUD | Implemented + accepted (w/ FU-002 evidence gaps) |
| Assignments CRUD, overlap, no hard delete, correct | Implemented + accepted (w/ FU-002) |
| Excel assignment import preview/confirm/error report | Implemented + accepted (w/ FU-003-02/03) |
| Utilization overview / vehicle detail reports UI | **Deferred** (TASK-009) |
| Live Frotcom sync / n8n | **Blocked** (DS-001); mocks only |
| Filtered Excel/PDF exports | **Not started** (TASK-011) |
| Pilot / Phase 8 | Not started |

### Separation

| Category | Items |
|---|---|
| **A. Core product work (remaining for full vision)** | TASK-009 reports UI; utilization engines TM-01…07; TASK-010 sync (after DS-001); TASK-011 exports |
| **B. Hardening work** | FU-002-05 locking review; any defects found by evidence tests |
| **C. Evidence/verification work** | FU-002-01…04, FU-003-02, FU-003-03; concurrent CAS optional residual |
| **D. Deployment/operations** | Empty release/ops evidence; no authorized release pack yet |
| **E. Optional / deferred enhancements** | FU-002-02 harness if still residual; polish (`buffer` typing); TASK-009 if kept deferred |

### Usable release today?

**Partial yes** for an internal “masters + assignments + Excel import” tool on the accepted stack.
**No** for the README’s full utilization-reporting product (reports UI + Frotcom + exports missing).

Major promised business functionality missing for full FUR-001: daily utilization reporting UI and live Frotcom ingestion. Those are **explicitly deferred/blocked**, not silently forgotten.

---

## 5. Test and evidence maturity

| Category | Present? | Notes |
|---|---|---|
| Unit | Strong | 63 tests; domain, parse, report, transport helpers |
| Mocked integration | Partial | Transport update mocks; no full confirm mock E2E |
| Local database | Weak/absent | Docker env note FU-002-06 |
| Remote database | Migration verify only | Local==Remote; RPC applied; little automated DB suite |
| Live JWT | **NOT_EXECUTED** | FU-002-01 |
| End-to-end (browser) | Absent | |
| Concurrency | **NOT_EXECUTED** | FU-002-02 / OQ-004-04 |
| Migration verification | Strong | Remote apply + list equality |
| Manual | Implicit | Architect reviews |
| Production-like | Absent | |

### Critical workflow strongest evidence

| Workflow | Strongest evidence | Gap |
|---|---|---|
| Authz helpers | Unit | Live JWT |
| RLS | Policy SQL + design | Live JWT |
| Import preview/parse/validate | Unit | Remote confirm path |
| CAS | Code + migration | Concurrent multi-client |
| Atomic persist RPC | SQL structure + remote apply | Empirical orphan test |
| Duplicate skip / overlap | SQL + unit domain | Live bypass 409 |
| Partial success / finalize | Code inspection + unit counters | DB confirm suite |
| Error report / formula | Unit | Optional live admin smoke |
| Audit preservation | Code + migration | DB assert suite |
| Job finalization / transport | Unit + code | Full confirm integration |

---

## 6. Risk assessment (remaining items)

| Item | Severity | Likelihood | Release impact | Treatment |
|---|---|---|---|---|
| FU-002-01 live JWT | Medium | Medium | Conditional blocker for security sign-off | test |
| FU-002-02 race harness | Low–Med | Low | No blocker (constraint exists) | defer / accept residual |
| FU-002-03 bypass 409 | Medium | Low–Med | Conditional | test |
| FU-002-04 preserve asserts | Low–Med | Low | No blocker | test |
| FU-002-05 locking | Medium | Medium | Conditional under concurrent edits | document / correct |
| FU-002-06 Docker | Low | High (env) | No blocker | document |
| FU-003-02 confirm suite | Medium | Medium | Conditional for import trust | test |
| FU-003-03 orphan proof | Medium | Low–Med | Conditional | test |
| TASK-009 deferred reports | High for full vision | Certain (deferred) | Blocker only for full-product release | defer |
| TASK-010 Frotcom | Critical for live sync | Blocked by DS-001 | Blocker for Phase 5 | defer until DS-001 |
| TASK-011 exports | Medium | Planned | Blocker for export release | defer |
| SoT pack-number collision | Medium | Certain | Planning blocker | document / reconcile |
| Empty ops/release evidence | Medium | Certain | Blocker for production launch | defer until release pack |

No critical runtime defect identified in accepted PACK-004 slice beyond known evidence gaps.

---

## 7. Next correct unit of work

**Selected: B — PACK-005 Evidence Closure (recommended)**

### Why this is the smallest correct next step

1. PACK-001…004 product slices that were authorized are **accepted**.
2. Remaining **mandatory follow-ups** are almost entirely **evidence/verification**, not new business modules.
3. Full-vision product work (reports UI, Frotcom, exports) is **deferred or DS-001-blocked** and must not be started under “next pack by default.”
4. PACK-004 was the intended evidence-hardening pack but **explicitly left FU-002 / FU-003-02/03 open** — those remain the unfinished obligation of the current program.
5. A short informal phase (option A) is possible, but the volume and environment needs (JWT, DB) justify a **narrow formal pack** for gates and SoT tracking.

### Why not other options

| Option | Rejected because |
|---|---|
| A No pack | Under-structures mandatory FU closure; acceptable only if sponsor rejects pack ceremony |
| C Release readiness | No authorized release/ops requirements executed yet; empty ops evidence ≠ justified release pack now |
| D Product completion | Would pull TASK-009/010/011; larger than needed; Frotcom forbidden without DS-001 |
| E Multiple packs | Premature until evidence pack finishes and DS-001/reports decisions reopen |

### Registry reconciliation required as a **docs gate inside** the next pack

Historical `PACK-REGISTRY` lists PACK-005 as **Frotcom + n8n**. That name must **not** be used for Frotcom work. Before Apply of an evidence pack:

- Retitle next pack to **Evidence Closure** (or similar), and
- Move Frotcom/n8n to a later pack ID after DS-001 (e.g. keep blocked as future Phase 5).

This assessment does **not** create PACK-005 files.

---

## 8. Proposed PACK-005 (only if authorized later)

| Field | Proposal |
|---|---|
| Title | **PACK-005 — Evidence Closure (import & assignment hardening proof)** |
| Objective | Close or explicitly residual-sign FU-002-01…05 and FU-003-02…03 with honest evidence classes; reconcile SoT pack sequence |
| In scope | Live JWT RLS matrix; confirm/partial/create-on DB tests; orphan-rollback DB proof; bypass→409 evidence; end/deactivate asserts; FU-002-05 review note; optional best-effort concurrent CAS; SoT checkpoint label fixes |
| Out of scope | Frotcom live; n8n; reports dashboard; CSV/XLS/XLSM; new business modules; vehicle auto-create; broad refactors; closing FU without evidence |
| Acceptance gates | Tests for new evidence; lint/build/diff-check; documented live JWT results or residual with env limitation; Local==Remote unchanged unless approved migration (expect **none**) |
| Environment | Remote Supabase + Auth test users (and/or local DB if available) |
| Expected records | `sprints/sprint-005/*` package, evidence appendices, updated TEST-MATRIX / RISKS / backlog |
| Migration expectation | **None** by default |
| Code-change expectation | **Minimal** — only if tests prove a defect or FU-002-05 requires locking |
| Complexity | **Small–medium** |
| Dependencies | Auth user credentials; DB access; human for DS-003 if touched |
| Known risks | Env blocks live JWT again; false closure pressure |

---

## 9. Remaining-work estimate (ranges)

Assumptions: one Builder; remote Supabase available; Auth test users obtainable; no Frotcom; reports UI stays deferred; no production launch yet.

| Bucket | Estimate | Notes |
|---|---|---|
| Core product completion (full vision) | **Large** (multi-pack: reports UI + DS-001 Frotcom + exports + pilot) | Outside this assessment’s next step |
| Evidence closure (proposed PACK-005) | **Small–medium** (about 0.5–2 person-weeks) | Depends on Auth/DB access |
| Release readiness | **Medium** later | Not justified as next pack now |
| Optional enhancements | **Small** ongoing | FU-002-02 residual; polish |

---

## 10. Decisions for sponsors

1. Authorize **PACK-005 Evidence Closure** (after SoT rename of historical Frotcom slot), **or**
2. Choose informal evidence phase (**NO_NEW_PACK**), **or**
3. Explicitly reopen product scope (reports UI) as a **separate** pack — not mixed with evidence.

Do **not** start Frotcom. Do **not** invent endpoints. Do **not** close FUs without evidence.

---

## 11. Files

| Action | Path |
|---|---|
| Created | `planning/POST-PACK-004-ASSESSMENT.md` |
| Modified | **none** (acceptance statuses of PACK-001…004 untouched) |

---

## 12. Confirmations

- No product code, tests, migrations, package, stage, commit, or push
- Frotcom not introduced; no PACK-005 package files created
- Open FUs not closed

---

## Recommendation

**PACK_005_EVIDENCE_CLOSURE_RECOMMENDED**

## Status

**POST_PACK_004_ASSESSMENT_COMPLETE**

---

## Follow-on (2026-07-30)

Architect Preparation authorized and completed for **PACK-005 — Evidence Closure**.
SoT contradictions listed in §2 were reconciled; package at `sprints/sprint-005/`.
No evidence executed. See `planning/STATE.md` / `PACK-REGISTRY.md`.

> **Follow-on (2026-08-03):** PACK-005 was formally accepted with follow-ups (`PACK_005_ACCEPTED_WITH_FOLLOW_UPS`). This assessment remains the historical post-PACK-004 recommendation record.
