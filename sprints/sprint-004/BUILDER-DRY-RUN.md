# Builder Dry-Run — PACK-004

> Date: 2026-07-30> Baseline HEAD: **`a68d8f9`** (`feat: complete PACK-003 Excel assignment import`)> Mode: **Dry-run only** — no product code, tests, packages, migrations, stage, commit, or push> Architect package: `READY_WITH_OPEN_DECISIONS` → Dry-run recommendation below> Re-verified preflight: 2026-07-30 (re-authorization) — still docs-dirty only; product clean; PACK-005 absent

## Recommendation

**READY_WITH_REQUIRED_CORRECTIONS**

## Status

**PACK_004_DRY_RUN_READY_FOR_APPROVAL** → Architect corrections produced **PACK_004_CORRECTIONS_READY_FOR_APPROVAL** (2026-07-30).Dry-run findings incorporated into ADR-008 ACCEPTED (design). Apply still blocked.

---

## 1. Preflight result — PASS (docs-dirty expected)

| Check | Result |
|---|---|
| Branch | `master` |
| HEAD | `a68d8f9` |
| `a68d8f9` in history | **Yes** (`a68d8f9841b2759c5bdf2213317e76a7f0acfb59`) |
| Working tree | **Dirty** — Architect docs only |
| Product `src/` / `tests/` / `package*` / `supabase/migrations` | **Unchanged** |
| `sprints/sprint-005` | **Absent** — PACK-005 not started |
| Frotcom Apply | Not started |

### Dirty tree (allowed Architect docs)

**Modified:** `architecture/DECISION-REGISTER.md`, `planning/*` (STATE, PACK-REGISTRY, PACK-VALIDATION, ARCHITECT-BRIEFING, EXECUTION-STATE, RISKS, WORK-BACKLOG, DECISIONS), `project-state.json`, `quality/TEST-MATRIX.md`, `quality/TRACEABILITY-MATRIX.md`

**Untracked:** `architecture/ADR-008.md`, `sprints/sprint-004/*` (pack package; this dry-run file added after)

**Verdict:** No unrelated/conflicting product changes. Proceed.

---

## 2. Scope verdict — PASS

In scope matches Architect: FU-003-01…03, mandatory FU-002 evidence, audit, CAS `search_path`, narrow optional polish.

Excluded confirmed: Frotcom, PACK-005, reports dashboard / TASK-009, CSV/XLS/XLSM, vehicle auto-create, broad redesign, new modules.

**Note:** Error-report UI on `/settings/imports/assignments` is **in scope** and is **not** the deferred Phase 4 reports dashboard.

---

## 3. Follow-up inventory verdict — PASS WITH NOTES

| ID | SoT wording preserved? | Can PACK-004 close? | Notes |
|---|---|---|---|
| FU-003-01 | Yes (RSK-016 / ACCEPTANCE-RECORD) | Yes | Report column wording in `requirements.md` uses `invalid`; DB uses `ERROR`/`CONFLICT` — **align before Apply** |
| FU-003-02 | Yes | Yes (env-honest) | Unit-only today |
| FU-003-03 | Yes | Yes | Requires RPC (see §6) |
| FU-002-01 | Yes | Yes | Needs **live** remote JWT smoke — not yet executed |
| FU-002-02 | Yes (accepted residual) | Best-effort only | Do **not** force-close without harness |
| FU-002-03 | Yes | Yes | Live/integration required |
| FU-002-04 | Yes | Yes | Product paths exist; asserts missing |
| FU-002-05 | Yes | Review mandatory | Implement only if review requires |
| FU-002-06 | Yes (env note) | N/A | Never a build task |
| RSK-012 / 016 / 017 | Present | — | No ownership drift; RSK-017 scope-creep guard OK |

**No silent renumbering.** No duplicates of FU IDs.

**Cannot safely close without evidence:** FU-002-01, FU-002-03 (live), FU-002-02 (unless residual sign-off), FU-003-01…03 product gates.

---

## 4. Existing-code impact — changed-file plan

### Must change (Apply)

| File | Why |
|---|---|
| `src/lib/imports/assignments/actions.ts` | Atomic persist via RPC; stop `markRow` overwrite; download action; no raw SQL in errors |
| `app/settings/imports/assignments/page.tsx` | Download control; loading/error/unavailable; optional submit lock |
| `src/lib/assignments/errors.ts` | Any new IMPORT_* codes if needed for report/RPC mapping |
| `architecture/ADR-007.md` / `ADR-008.md` | Doc alignment after corrections accepted |
| SoT planning/quality | Evidence closure on Apply (not dry-run) |

### Must add (Apply)

| File | Why |
|---|---|
| `src/lib/imports/assignments/report.ts` | exceljs error workbook builder + formula neutralization |
| `supabase/migrations/YYYYMMDDHHMMSS_pack004_import_hardening.sql` | `persistence_errors`, CAS recreate + `search_path`, `persist_import_job_row` |
| `tests/imports/report.test.ts` | Columns + formula injection |
| `tests/imports/confirm*.test.ts` (and/or integration) | FU-003-02 paths |
| `tests/imports/atomic-persist.test.ts` or DB evidence script | Orphan rollback |
| `tests/assignments/lifecycle-preserve.test.ts` | FU-002-04 |
| `tests/assignments/overlap-bypass*.test.ts` or evidence script | FU-002-03 |
| `scripts/evidence/` or `tests/**/rls-live*.ts` | FU-002-01 smoke (remote) |

### Reuse (do not duplicate)

| Module | Reuse for |
|---|---|
| `exceljs` 4.4.0 (`parse.ts` pattern) | Report generation — **no second library** |
| `requireAdmin` / `isAppError` | Authz |
| `mapDatabaseError` / `appError` | Mapping (but **do not** put raw DB text in row audit) |
| `findOverlappingAssignments` | App-side overlap (RPC should also rely on GiST) |
| `normalizePlate` / `normalizePersonName` | Lookups |
| CAS `begin_import_job_confirm` | Keep semantics; harden only |

### Contract risks (must not break)

- ADR-005 GiST exclusion + 409 `ASSIGNMENT_OVERLAP`
- ADR-006 no hard-delete; end/deactivate
- ADR-007: create masters default OFF; no vehicle create; server preview; confirm jobId-only; partial success
- CAS → 409 `IMPORT_ALREADY_CONFIRMED`
- Admin-only RLS on `import_jobs` / `import_job_rows`

---

## 5. Workstream A — Error-report download

### Binding design (Apply)

| Item | Decision |
|---|---|
| Library | **Reuse exceljs 4.4.0** server-only |
| Generation | **On demand** from `import_jobs` + `import_job_rows` |
| Action | `downloadImportErrorReport({ jobId: uuid })` in `actions.ts` → returns base64 or `Uint8Array` + filename (not a stored blob) |
| Auth | `requireAdmin` + RLS |
| Sheet | One sheet named **`ImportErrors`** |
| Filename | `import-errors-{jobId8}-{yyyyMMddHHmmss}.xlsx` (sanitize; no user path chars) |
| Row filter | `validation_status IN ('ERROR','CONFLICT')` **OR** `persistence_status = 'failed'` (include failed-after-OK) |
| Data source | Server DB only — never client row arrays |

### Columns (align to payload keys)

Use `normalized_payload` fields: `registrationDisplay`, `registrationNormalized`, `driverDisplay`, `customerDisplay`, `validFrom`, `validUntil`, `notes`, plus job/row metadata.**Correction:** `requirements.md` “invalid” → map to DB `ERROR`/`CONFLICT`.

### Formula-injection escaping (mandatory)

For **every** exported string cell (including error JSON text):

1. Convert value to string.
2. If first character is `=`, `+`, `-`, or `@` → prefix with a single quote `'` **or** set ExcelJS cell to explicit text type with neutralized value (recommended: prefix `'` **and** ensure cell type is string).
3. Also neutralize leading tab/`\t` and CR if present (Excel injection variants).
4. Never set cell formula API from payload.

### Leakage stop

- Do **not** write `error.message` from PostgREST/Postgres into report or `persistence_errors` (current `markRow` / create-fail paths can leak — **must fix**).
- Use AppError `code` + stable safe message only.

---

## 6. Workstream B — Atomic per-row persistence

### Current flow (confirmed in `actions.ts`)

Separate statements: driver insert → customer insert → overlap check → assignment insert → row update.`markRow` **replaces** `validation_errors`. Orphan masters possible. Create-fail stores `error?.message`.

### Comparison

| Option | Atomicity | RLS | Testability | Feasibility |
|---|---|---|---|---|
| A. App multi-call | **Cannot** guarantee TX with current Supabase JS server client (no exposed multi-statement TX) | RLS per call | Hard to prove rollback | Insufficient for FU-003-03 |
| B. One DB RPC per row | **Yes** | SECURITY INVOKER + RLS; optional `is_admin()` guard | SQL tests / remote | **Required** |

### Binding recommendation

**DATABASE RPC** (`persist_import_job_row`)

### Proposed RPC signature (mandatory ADR correction)

```sql
persist_import_job_row(
  p_job_id uuid,
  p_row_id uuid,
  p_actor_id uuid,
  p_create_new_masters boolean
) returns jsonb
```

Return JSON shape (stable):

```json
{
  "outcome": "imported" | "skipped" | "failed" | "not_attempted",
  "assignment_id": "uuid|null",
  "driver_id": "uuid|null",
  "customer_id": "uuid|null",
  "persistence_errors": [{"code":"…","message":"…"}]
}
```

Rules inside TX:

1. `IF NOT public.is_admin() THEN RAISE …` (or rely solely on RLS — prefer explicit check).
2. Verify `p_actor_id = auth.uid()` (reject mismatch).
3. Lock/load row by id + job_id; only persist if validation_status allows (`OK`/`WARNING`/`NEW_MASTER`).
4. Optional create driver/customer; never vehicles.
5. Exact-duplicate → skip + update row; commit.
6. Insert assignment; on exclusion → failed + safe code `ASSIGNMENT_OVERLAP`; **rollback creates**.
7. Update `import_job_rows`: `persistence_status`, IDs, `persistence_errors` (**not** overwrite `validation_errors`/`validation_warnings`/`normalized_payload`).
8. `SET search_path = public` (or pinned list).
9. `SECURITY INVOKER`; revoke PUBLIC; grant authenticated + service_role.

App loop: CAS → for each eligible row call RPC → aggregate counters → terminal status. Keep partial success across rows.

---

## 7. ADR-008 verdict — INCOMPLETE FOR ACCEPTED (corrections required)

| Required topic | Present? | Gap |
|---|---|---|
| Transaction boundary | Yes | — |
| Function security mode | Yes (INVOKER) | Add explicit `is_admin` / `auth.uid` checks |
| search_path | Yes | — |
| Execution grants | Partial | State revoke PUBLIC explicitly on new RPC |
| Actor identity source | **Weak** | Must define `p_actor_id` vs `auth.uid()` |
| Master lookup/create | Yes | — |
| Duplicate / overlap | Yes | — |
| Assignment insert | Yes | — |
| import-row update | Yes | — |
| Rollback | Yes | — |
| Retry behavior | Thin | State: re-confirm forbidden after confirming/completed; row retry only via new job or explicit rules |
| Error-code mapping | **Missing** | Add table |
| persistence_errors | Preferred | Elevate to **mandatory** column |
| Exact RPC signature | **Missing** | Add § signature + return JSON |

**Mandatory ADR-008 corrections before Apply** (Architect docs update; not done in this dry-run body except recorded here):

1. Exact `persist_import_job_row` signature + return contract2. `persistence_errors jsonb NOT NULL DEFAULT '[]'` **mandatory**3. Actor: `p_actor_id` must equal `auth.uid()`4. Error-code mapping (safe messages only)5. Explicit `is_admin()` guard recommended6. Retry: completed/confirming jobs cannot re-enter CAS; failed rows in completed job are not silently re-persisted without new job
---

## 8. Audit-preservation review

| Field | Current risk | Required model |
|---|---|---|
| `normalized_payload` | Not overwritten today (good) | **Immutable** after validate |
| `validation_errors` | **Overwritten by `markRow`** | Preview-only after validate |
| `validation_warnings` | Mostly preserved; skip appends OK | Preview + append-only warnings OK |
| Persistence failures | Written into `validation_errors` | **`persistence_errors` column** |
| `persistence_status` | OK | Keep |
| IDs / `assignment_id` | OK | Keep |

**`persistence_errors` mandatory.** Existing rows: default `[]` — safe forward migration. Historical jobs that lost preview errors to `markRow` **cannot be reconstructed** — accept as past data limitation; fix going forward.

---

## 9. CAS / function hardening

| Item | Current | Required |
|---|---|---|
| `begin_import_job_confirm` | SECURITY INVOKER, no search_path | Recreate with `SET search_path = public` |
| Grants | authenticated + service_role; revoke PUBLIC | Keep; add admin check inside optional but recommended |
| Semantics | validated→confirming; empty→app 409 | **Unchanged** |
| Schema quals | Uses `public.import_jobs` | Keep fully qualified |

Non-admin `authenticated` can **EXECUTE** but RLS should block UPDATE — still recommend `is_admin()` inside function as defense in depth.

---

## 10. Workstream C — Test coverage classification

### Existing evidence

| Area | Layer |
|---|---|
| Plates/dates/headers/parse | Unit |
| Authz helpers / no-delete | Unit |
| Confirm/partial/create-on/CAS race | **Missing** |
| Live JWT RLS | **Missing** |
| Local Docker DB | Unavailable (FU-002-06) |
| Remote schema (PACK-003) | Prior evidence only |

### Mandatory new tests (Apply)

| Test | Layer | Fixtures | Docker? | Remote? | Artifact | Blocking? |
|---|---|---|---|---|---|---|
| Report columns + row filter | Unit | Synthetic rows | No | No | Vitest | Yes |
| Formula injection `=`,`+`,`-`,`@` | Unit | Payload strings | No | No | Vitest | Yes |
| Rejected row export | Unit/Int | ERROR/CONFLICT rows | No | Optional | Vitest | Yes |
| Failed persist export | Unit/Int | failed status | No | Optional | Vitest | Yes |
| Download admin allow | Int/Live | Admin JWT | No | **Yes** | Log | Yes |
| Manager/viewer/unauth deny download | Live | Role JWTs | No | **Yes** | Log | Yes |
| Create-on OFF/ON | Int/Remote | Masters | No | Preferred | Test/log | Yes |
| Duplicate-master prevention | Int/DB | Unique conflict | No | Preferred | Test | Yes |
| Orphan-master rollback | DB/Remote | Force insert fail after create | No | **Yes** | DB query | Yes |
| Exact duplicate skip | Int | Existing assignment | No | Preferred | Counters | Yes |
| Overlap failure | Int | Overlap fixture | No | Preferred | Errors | Yes |
| Partial success + counters | Int | Mixed rows | No | Preferred | Summary | Yes |
| Audit preservation | Unit/Int | Preview then persist fail | No | Optional | Row JSON | Yes |
| Double confirm 409 | Int | Two confirms | No | Preferred | Response | Yes |
| Two concurrent confirms | Conc | Two clients | No | Preferred | Logs | Preferred (OQ-004-04) |
| Retry job-level / row-level | Int | Failed job rules | No | Preferred | Spec assert | Yes |
| RPC error mapping | Unit/Int | Mapped codes | No | Optional | Vitest | Yes |
| FU-002-01 RLS matrix | Live | 4 auth states | No | **Yes** | Smoke report | Yes |
| FU-002-03 bypass→409 | Int/Live | Direct insert | No | **Yes** | Evidence | Yes |
| FU-002-04 end/deactivate preserve | Unit/Int | Assignment row | No | Optional | Assert | Yes |

---

## 11. FU-002 evidence review

| ID | Requirement | Current evidence | Missing | PACK-004 can close? | Live remote? | Residual? |
|---|---|---|---|---|---|---|
| FU-002-01 | Automated RLS with real Auth/JWT | Helpers + PACK-001 policy list | Live admin/manager/viewer/unauth on masters, assignments, import_*, RPCs | Yes if smoke run | **Yes** | No if evidenced |
| FU-002-02 | Parallel-client race harness | GiST + domain | True multi-client | Best-effort | Preferred | **Yes** if unsigned harness |
| FU-002-03 | DB-bypass → 409 | Domain + exclusion | Bypass + mapper evidence | Yes | **Yes** preferred | No |
| FU-002-04 | End/deactivate preserve asserts | Product code | Automated asserts | Yes | Optional | No |
| FU-002-05 | SELECT FOR UPDATE review | In-place UPDATE only | Written review ± lock | Review yes | No | Implement optional |
| FU-002-06 | Local Docker unavailable | Env note | — | Doc only | No | Env note |

**Do not claim live evidence until executed.**

---

## 12–15. Open-decision recommendations

| OQ | Recommendation | Rationale |
|---|---|---|
| **OQ-004-01** | **ACCEPT DEFAULT** | Error-report download ≠ Phase 4 reports UI; TASK-009 stays deferred |
| **OQ-004-02** | **DATABASE RPC** | Supabase server client cannot honestly provide multi-statement TX; FU-003-03 requires RPC |
| **OQ-004-03** | **DOCUMENT CURRENT BEHAVIOR** | Cost/benefit of durable uploaded/parsed low; ADR-007 narrative update sufficient |
| **OQ-004-04** | **BEST-EFFORT WITH MANUAL EVIDENCE** | Implementation safety via CAS already exists; test env may limit automated dual-client; FU-002-02 remains **ACCEPTED RESIDUAL WITH SIGN-OFF** if harness incomplete |

---

## 16. Migration recommendation

**One forward migration** (preferred) bundling:

1. `alter table import_job_rows add column persistence_errors jsonb not null default '[]'::jsonb`
2. Recreate `begin_import_job_confirm` with `SET search_path = public` (+ optional `is_admin` guard); same CAS semantics
3. Create `persist_import_job_row(...)` INVOKER + search_path + grants
4. Comments; revoke PUBLIC on both functions

| Concern | Assessment |
|---|---|
| Existing data | Default `[]` safe |
| Rollback | Forward-fix: drop RPC; drop column; restore prior CAS function from PACK-003 SQL |
| Indexes | None required for persistence_errors |
| Separate migrations | Optional split only if Apply risk isolation desired — **not required** |

**Do not create migration in dry-run.**

---

## 17. API / UI impact

### API

- Add `downloadImportErrorReport`
- Change `confirmAssignmentImport` to call `persist_import_job_row` per eligible row
- Remove overwrite `markRow` path (or rewrite to set `persistence_errors` only)
- Keep confirm input `{ jobId, createNewMasters? }`
- Map RPC failures to AppError without SQL leakage

### UI (narrow)

- Download button when job has exportable rows
- States: unavailable (no error rows), loading, error, success (browser download)
- Disable download + confirm while pending; optional stronger confirm lock
- Accessible labels/`aria-busy`
- No reports dashboard

---

## 18. Security findings

| Finding | Severity | Stop? |
|---|---|---|
| Formula injection in generated XLSX if unescaped | High | **Yes** until neutralization tests pass |
| Raw DB `error.message` into row audit / UI today | Medium | **Yes** — must stop for persist + report |
| Non-admin EXECUTE on CAS RPC | Low/Med | Harden with `is_admin()` (recommended stop for Apply design) |
| Service-role in browser | — | Must remain absent |
| Filename injection | Low | Sanitize basename |
| Report DoS (large jobs) | Low | Cap rows to job max 2000; admin-only |
| Retention | Low | On-demand; no blob store default |
| Actor spoofing on RPC | Med | Require `p_actor_id = auth.uid()` |

---

## 19. Acceptance-gate classification

| Gate | Class |
|---|---|
| Error-report download works | **Blocker** |
| Formula safety verified | **Blocker** |
| Atomic persist + orphan rollback | **Blocker** |
| Partial success preserved | **Blocker** |
| Audit preservation | **Blocker** |
| Double-confirm 409 | **Blocker** |
| CAS search_path | **Blocker** |
| FU-002-01 live JWT matrix | **Mandatory but externally dependent** (remote Auth) |
| FU-002-03 bypass 409 | **Mandatory but externally dependent** |
| Concurrent confirm evidence | **Non-blocking residual** if best-effort documented (OQ-004-04) |
| FU-002-02 assignment race | **Non-blocking residual** |
| FU-002-06 Docker | **Non-blocking residual** (env) |
| Durable uploaded/parsed | **Optional polish** / doc |
| buffer as any / UI lock | **Optional polish** |
| Migration Local==Remote | **Blocker** if migration applied |
| test/lint/build/diff-check | **Blocker** |
| FU closed only with evidence | **Blocker** |

---

## 20. Mandatory corrections before Apply

1. Architect updates ADR-008 with RPC signature, actor rules, error-code map, mandatory `persistence_errors`2. Align `requirements.md` status vocabulary to DB (`ERROR`/`CONFLICT`)3. Lock OQ recommendations: 01 ACCEPT DEFAULT · 02 DATABASE RPC · 03 DOCUMENT CURRENT · 04 BEST-EFFORT4. Explicit Apply approval after corrections human-approved5. Builder Dry-Run → corrections → **then** Apply (no Apply on this dry-run alone)

---

## Risks

| Risk | Mitigation |
|---|---|
| Scope creep into reports UI | OQ-004-01 / RSK-017 |
| Claiming live RLS without run | Acceptance blockers |
| Orphan masters if Apply skips RPC | Binding OQ-004-02 |
| SQL leakage in reports | Safe message policy |
| RSK-009 Docker | Remote evidence substitute |

## Stop conditions (Apply)

- Any attempt to start Frotcom / PACK-005 / TASK-009 dashboard- New spreadsheet library- SECURITY DEFINER persist RPC that bypasses RLS- Closing FU without artifacts- Migration repair without approval
## Proposed implementation sequence

1. Architect ADR-008 + requirements corrections + human approval of OQs2. Write **one** migration (column + CAS + persist RPC)3. Wire confirm → RPC; fix audit writes; remove SQL leak paths4. `report.ts` + download action + narrow UI5. Unit tests (report/formula/audit)6. Integration/remote tests (confirm/partial/create-on/orphan)7. Live JWT RLS + bypass-409 evidence scripts8. Best-effort concurrent confirm evidence9. FU-002-05 review note10. Gates → Builder Report → Architect Review
## Dependency recommendation

**No new packages.** Reuse **exceljs@4.4.0**.

---

## Final dry-run recommendation

**READY_WITH_REQUIRED_CORRECTIONS**

PACK_004_DRY_RUN_READY_FOR_APPROVAL
