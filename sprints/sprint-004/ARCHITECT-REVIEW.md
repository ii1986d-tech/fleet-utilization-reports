# PACK-004 Architect Review

> Independent Architect Review · 2026-07-30> Baseline HEAD: `a68d8f9` (PACK-003 checkpoint)> Branch: `master`> Working tree: uncommitted PACK-004 Apply (no stage / no commit / no push)> Builder recommendation reviewed: `READY_WITH_RESIDUAL_EVIDENCE_GAPS`> **Architect recommendation: `ACCEPT_WITH_FOLLOW_UPS`**> **Status: `PACK_004_ARCHITECT_REVIEW_COMPLETE`**

Review mode: **documentation + code inspection only**. No product code, tests, migrations, package, or database changes were made by this review.

---

## 1. Repository preflight

| Check | Result |
|---|---|
| Branch | `master` |
| HEAD | `a68d8f9841b2759c5bdf2213317e76a7f0acfb59` (`a68d8f9`) |
| Staged files | **None** |
| Commit occurred | **No** (HEAD unchanged) |
| Push | **No** |
| Migration file | Present: `supabase/migrations/20260730170000_pack004_import_hardening.sql` |
| Remote migrations | Local == Remote for five migrations including `20260730170000` |
| PACK-005 / Frotcom product work | **Absent** from PACK-004 diff |

### Expected change set (PACK-004)

Product/impl: `actions.ts`, `constants.ts`, `parse.ts`, `validate.ts`, `report.ts`, import assignments UI, `app/api/import-jobs/[jobId]/error-report/route.ts`, migration, `tests/imports/report.test.ts`, sprint-004 package, ADR-008 + SoT planning/quality updates.

Unrelated implementation modules (new Frotcom live, reports dashboard, CSV pipeline): **not introduced**.

**Preflight verdict: PASS** — proceed.

---

## 2. Scope verdict

**PASS — in scope only.**

Confirmed present:

- Atomic per-row persistence RPC
- `persistence_errors` separation
- CAS `search_path` + admin asserts
- Error-report download (action + optional route + narrow UI)
- Confirm-flow RPC wiring + finalize counters
- Tests (unit) + SoT updates

Confirmed absent from this Apply:

- Frotcom live / PACK-005
- General reports dashboard
- CSV / XLS / XLSM accept paths (still rejected)
- Vehicle auto-creation in import RPC
- Broad redesign / unrelated refactors / new business modules

Pre-existing `src/lib/frotcom/*` mocks from earlier packs remain untouched by intent.

---

## 3. Architecture verdict

**PASS_WITH_RESIDUAL** against ADR-008 + sprint-004 package.

| Binding | Finding |
|---|---|
| One RPC / one stored row / one TX | Met — signature and body match D2 |
| No client normalized payload / master IDs as RPC params | Met — RPC reads `import_job_rows` |
| Actor `auth.uid()` | Met — CAS also requires `p_user_id = auth.uid()` |
| Admin in DB | Met — `is_admin()` in both RPCs |
| SECURITY INVOKER | Met |
| Fixed `search_path` | Met (`public`) |
| RLS not weakened | Met — migration does not alter policies |
| Exact duplicate → skipped | Met |
| Overlap → failed + `ASSIGNMENT_OVERLAP` | Met (`exclusion_violation` handler) |
| Per-row partial success | Met — app loop isolates RPC calls |
| Job finalization outside row RPC | Met |

Residuals: transport-failure finalize inconsistency (§9); empirical DB/live evidence gaps (§13–14).

Note: ADR-008 header still contains stale “Apply blocked / implementation not complete” text while the Status section reflects Apply delivery. Documentation accuracy gap only (not product defect).

---

## 4. Migration verdict

**PASS**

File: `20260730170000_pack004_import_hardening.sql`

| Criterion | Result |
|---|---|
| `persistence_errors jsonb not null default '[]'` | Pass |
| Deterministic vocab backfill | Pass |
| CHECKs = `valid\|invalid`, `pending\|persisted\|skipped\|failed` | Pass |
| validation_* columns untouched by migration | Pass |
| No destructive DROP of data tables | Pass |
| No RLS policy weakening | Pass |
| PUBLIC execute revoked; grants to authenticated + service_role | Pass |
| Fixed `search_path` on both functions | Pass |
| Schema-qualified `public.*` | Pass |
| Forward-safe; rollback notes in header comments | Pass |
| Local == Remote | Pass (independent verification this review) |

Classify: **PASS**

---

## 5. RPC / atomicity verdict

**PASS_WITH_RESIDUAL** (design/SQL structure sound; automated DB suite absent)

`persist_assignment_import_row` covers: auth → job `FOR UPDATE` + confirming check → row `FOR UPDATE` → valid/pending gates → vehicle resolve/active → driver/customer resolve → optional creates → exact duplicate → insert → row persistence update → `persistence_errors` / IDs / `persisted_at`.

Mutable creates+insert+success update sit inside an inner `BEGIN … EXCEPTION … END` **subtransaction**. On `exclusion_violation` / `others`, PostgreSQL rolls back the subtransaction (creates + assignment insert), then the handler writes a safe failed row status. That matches ADR orphan intent while preserving failed audit (D4).

### Orphan-rollback verdict

**PROVEN_BY_IMPLEMENTATION**

Rationale: not “because it is an RPC,” but because the explicit PL/pgSQL exception block establishes a subtransaction; caught failures undo inserts before the handler’s failed-row update. Empirical automated DB proof remains missing → FU-003-03 stays open for closure evidence, but implementation safety is accepted as proven by SQL structure.

---

## 6. Authorization / RLS verdict

**PASS_WITH_RESIDUAL**

| Layer | Evidence |
|---|---|
| App `requireAdmin` | Present on upload/confirm/get/download |
| DB `auth.uid()` + `is_admin()` | Present in CAS + persist RPC |
| Client actor rejection | CAS: `p_user_id` must equal `auth.uid()`; persist has no actor param |
| PUBLIC execute | Revoked |
| Browser service-role | Not introduced |
| Prior RLS policies | Unchanged (admin write on imports/masters/assignments) |

| Evidence class | Status |
|---|---|
| Implementation/design | Pass |
| Automated (role helpers) | Unit only (`canManageMasterData`) |
| Live JWT | **NOT_EXECUTED** |

Non-admin persist path returns JSON `PERSISTENCE_FAILED` / “Admin role required” rather than raising `FORBIDDEN` (CAS raises). Safe (no write), but vocabulary inconsistency — follow-up polish, not stop condition.

**Do not close FU-002-01** without live JWT evidence.

---

## 7. Audit-preservation verdict

**PASS**

- RPC updates never touch `normalized_payload`, `validation_errors`, or `validation_warnings`
- No `source_payload` column exists (PACK-003 schema); display originals live inside `normalized_payload` and remain unchanged
- `persistence_errors` is separate; success/skip clears to `[]`; failures replace with safe `{code,message}` arrays
- Exception handlers use fixed safe messages — no `SQLERRM` / stack storage
- Former app-side `markRow` overwrite path is **removed** from confirm flow

---

## 8. Error-vocabulary verdict

**PASS_WITH_RESIDUAL**

| Layer | `validation_status` | `persistence_status` |
|---|---|---|
| DB CHECK / RPC | `valid` / `invalid` | `pending` / `persisted` / `skipped` / `failed` |
| Upload mapping | `toDbValidationStatus(...)` | always `pending` |
| UI | Displays DB values | Displays DB + `persistence_errors` |
| Report | Uses DB values | Include invalid / failed |

Inconsistencies (non-blocking):

1. **Internal validate.ts** still uses PACK-003 codes `OK|WARNING|ERROR|CONFLICT|NEW_MASTER` before DB mapping — acceptable if mapping remains mandatory at write boundary (it does).
2. **RPC non-admin deny** uses `PERSISTENCE_FAILED` instead of a dedicated auth code.
3. Invalid-row early RPC return reports `failed` in JSON **without** writing row `persistence_status=failed` (app never calls RPC for invalid; OK).

Exact duplicate → skipped + `EXACT_DUPLICATE`; overlap → failed + `ASSIGNMENT_OVERLAP`; unknown → `PERSISTENCE_FAILED` safe text: **met**.

---

## 9. Confirmation-flow verdict

**PASS_WITH_RESIDUAL**

Met:

- `begin_import_job_confirm` CAS used; empty → `IMPORT_ALREADY_CONFIRMED`
- Processes only `valid` + not (`persisted|skipped|failed`) → i.e. pending
- Failed not auto-retried
- Create flags explicit (`p_create_missing_*` from `createNewMasters`)
- Isolated per-row RPC; finalize outside RPC
- Happy-path counters from stored states; `completed` vs `completed_with_errors`

### Explicit pending-row transport-failure verdict

**REQUIRED_CODE_CORRECTION**

Observed path in `confirmAssignmentImport`:

1. Loop calls `supabase.rpc('persist_assignment_import_row', …)` and **ignores** `error` and return payload.
2. Finalize recount treats valid rows with `persistence_status = 'pending'` **as failed** for `failed_rows` and chooses `completed_with_errors`.
3. Job leaves `confirming` for a terminal status; CAS will not re-enter (`validated` only).
4. Stuck `pending` rows therefore:
   - remain `pending` in DB (not `failed`, no `persistence_errors`)
   - inflate `failed_rows` without matching row failure audit
   - are **not** included in the error report (include rule is invalid **or** `persistence_status=failed`)
   - cannot be reprocessed by another confirm without a new product action

This is **not** ACCEPTABLE_RESILIENT_BEHAVIOR and is more than a DOCUMENTATION_GAP. It is **not** treated as an immediate ACCEPTANCE_BLOCKER for the whole pack because the happy path and DB failure paths behave correctly; it **is** a mandatory correction / follow-up before treating confirm-flow evidence as complete (ties to FU-003-02).

---

## 10. Error-report verdict

**PASS_WITH_RESIDUAL**

| Criterion | Result |
|---|---|
| Server-side exceljs generation | Pass (`report.ts` + action + route) |
| exceljs 4.4.0 only | Pass (`package.json` dependency; no second lib) |
| Admin-only | Pass (`requireAdmin`) |
| On-demand / no permanent store | Pass |
| Sheet `ImportErrors` | Pass |
| 24 deterministic columns | Pass |
| Include invalid + failed; exclude persisted/skipped | Pass |
| Safe filename pattern | Pass |
| XLSX content headers on route | Pass |
| No client workbook content | Pass |
| No raw SQL in cells | Pass (unit-asserted) |

Residual: transport-stuck `pending` rows excluded from report (consequence of §9). Role-denial for download is design-covered (`requireAdmin`) but **not** live-JWT tested.

---

## 11. Formula-safety verdict

**PASS**

`escapeExcelFormula` trims only for detection, prefixes `'` when first non-whitespace is `= + - @`, applied to all exported cell strings (including error list parts). Whitespace-before-prefix unit-tested. Filename also passed through escape (generated names are safe). Apostrophe strategy yields text, not formulas.

Classify: **PASS**

---

## 12. API / UI verdict

**PASS**

Narrow download control only; shown when invalid/failed rows exist; `busy` / `disabled` / early-return duplicate-click guard; `aria-label` / `aria-busy`; loading label; errors via existing `AppError` alert. No reports dashboard. API returns `{code,message}` with safe app errors — no stack/SQL.

Optional polish residual: upload UI `catch` may surface `Error.message` (pre-existing pattern; low risk).

---

## 13. Test-evidence verdict

**PASS_WITH_RESIDUAL** — 52 tests are overwhelmingly **unit** (plus prior domain/parse). No database integration, remote DB automation, live JWT, or concurrency harness executed this Apply.

### Classification of PACK-004-relevant suites

| Suite | Class |
|---|---|
| `tests/imports/report.test.ts` (14) | unit |
| `tests/imports/domain.test.ts` / `parse.test.ts` | unit |
| `tests/assignments/*` | unit |
| `tests/smoke/*` | unit |
| Live JWT / concurrency / remote RPC | **not present / not executed** |

### Mandatory case coverage (honest)

| Area | Claimable evidence |
|---|---|
| Error report include/exclude/columns/filename/formula/`= + - @`/whitespace/SQL-ish absence | **unit PASS** |
| Admin vs manager/viewer helper deny | **unit PASS** |
| Admin download / manager/viewer/unauth deny live | **NOT_EXECUTED** |
| Atomic create OFF/ON, orphan rollback, overlap, duplicate skip, audit preserve | **SQL design + remote apply; no automated DB test** |
| Double confirm / partial success / counters / concurrent CAS | **code inspection; concurrent NOT_EXECUTED** |

Do **not** treat unit tests as remote or live evidence.

---

## 14. Follow-up review

### FU-003-01 — Downloadable error-report `.xlsx`

| Item | Assessment |
|---|---|
| Requirement | Formula-safe on-demand admin report from stored audit |
| Implementation | Present (report + action + route + UI) |
| Test evidence | Strong unit coverage |
| Missing | Live admin smoke / role JWT deny |
| Closure recommendation | **CLOSE** (Architect accepts unit + code inspection as sufficient for this FU; optional live smoke residual RSK note) |
| Residual | Low — admin-only internal tool; optional live smoke |

### FU-003-02 — Confirm / partial / create-on automated tests

| Item | Assessment |
|---|---|
| Requirement | Automated confirm-path evidence |
| Implementation | Confirm rewritten to RPC |
| Test evidence | **Insufficient** (no confirm integration suite) |
| Missing | DB/integration tests; transport-failure correction |
| Closure recommendation | **KEEP OPEN** |
| Residual | Medium — includes §9 mandatory correction |

### FU-003-03 — Atomic per-row create+insert

| Item | Assessment |
|---|---|
| Requirement | One TX; orphan rollback |
| Implementation | **PROVEN_BY_IMPLEMENTATION** (subtransaction) |
| Test evidence | No automated orphan proof |
| Missing | DB test forcing insert failure after create |
| Closure recommendation | **KEEP OPEN** until empirical proof |
| Residual | Medium (implementation believed safe; evidence incomplete) |

### FU-002-01 — Live JWT RLS

**KEEP OPEN** — NOT_EXECUTED.

### FU-002-02 — Parallel race harness

**KEEP OPEN** — accepted residual / OQ-004-04 best-effort not executed.

### FU-002-03 — Live bypass → 409

**KEEP OPEN** — not executed.

### FU-002-04 — End/deactivate preserve asserts

**KEEP OPEN** — not newly evidenced this pack.

### FU-002-05 — FOR UPDATE / locking review

**KEEP OPEN** — import row uses `FOR UPDATE`; assignment correction path not newly hardened/proven.

### FU-002-06 — Local Docker note

**KEEP OPEN** as environment note (no change required).

**FU IDs not renumbered. None auto-closed by Builder. Architect closes only FU-003-01.**

---

## 15. Acceptance-gate matrix

| Gate | Classification |
|---|---|
| Error-report download | **PASS** |
| Formula safety | **PASS** |
| Atomic persistence (RPC present + structure) | **PASS_WITH_RESIDUAL** |
| Orphan-master rollback | **PASS_WITH_RESIDUAL** (proven by SQL; empirical open) |
| Audit preservation | **PASS** |
| Safe error mapping | **PASS** |
| CAS behavior (implementation) | **PASS** |
| search_path hardening | **PASS** |
| RLS/auth design | **PASS** |
| Live JWT RLS evidence | **NOT_EXECUTED** |
| Concurrent CAS evidence | **NOT_EXECUTED** |
| Migration verification | **PASS** |
| Tests (52/52 unit) | **PASS_WITH_RESIDUAL** |
| Lint | **PASS** (Builder evidence; not re-run as code change) |
| Build | **PASS** (Builder evidence) |
| git diff --check | **PASS** (Builder evidence) |
| Correct FU handling | **PASS** (IDs preserved; honest residuals) |
| Transport pending/finalize consistency | **FAIL** (required correction; not pack-wide blocker) |

---

## 16. Security verdict

**PASS_WITH_RESIDUAL** — **no security stop condition** for acceptance-with-follow-ups.

Reviewed:

- Formula injection mitigated
- Filename generated server-side (UUID/timestamp)
- No raw SQL/stack in audit/report/API happy paths
- No new service-role browser exposure
- No SECURITY DEFINER on persist/CAS
- Fixed search_path
- No client actor / payload RPC params
- RLS policies not weakened
- Grants minimal (authenticated + service_role)

Residuals: unauthenticated/manager live matrix not executed; report generation rate-limit absent (acceptable for small admin tool); transport-stuck rows omit failure audit (§9).

---

## 17. Documentation / traceability verdict

**PASS_WITH_RESIDUAL**

- PACK-004 **not** marked accepted — correct
- Builder did not auto-close FUs — correct
- Quality matrix distinguishes unit vs live gaps — largely accurate
- ADR-008 header still stale vs Status section — **doc correction recommended**
- PACK-005/Frotcom absent — correct
- project-state / EXECUTION-STATE reflect review-ready Apply — update to Architect Review complete in SoT companion edits

---

## 18. Mandatory corrections

Must be tracked (prefer fix in a small follow-up before treating confirm evidence complete):

1. **Confirm transport failure handling** — on RPC `error`, mark the targeted row `failed` with safe `PERSISTENCE_FAILED` **or** leave job non-terminal / retriable; do not count silent `pending` as `failed_rows` without row audit; ensure such rows appear in error report if treated as failures.
2. **Empirical orphan-rollback test** (closes FU-003-03) — force assignment failure after create; assert no orphan driver/customer.
3. **Confirm/partial/create-on automated tests** (closes FU-003-02).
4. **Live JWT RLS matrix** when environment permits (FU-002-01) — do not claim closed until executed.

Non-mandatory polish: RPC auth deny code vocabulary; ADR-008 header sync; upload UI catch message hygiene.

---

## 19. Residual risks

| ID | Risk | Severity |
|---|---|---|
| §9 transport pending | Job `completed_with_errors` with pending rows; misleading counters; no report line; no reconfirm | Medium |
| FU-003-03 evidence | Orphan safety untested empirically | Medium |
| FU-002-01 | Live RLS unproven | Medium |
| OQ-004-04 / FU-002-02 | Concurrent CAS unproven | Low–Medium (accepted residual path) |
| Internal validate vocab | Dual-layer codes until DB map | Low |

---

## 20. Final recommendation

**ACCEPT_WITH_FOLLOW_UPS**

Rationale:

- ADR-008 core design is implemented and migration-verified Remote==Local
- Formula-safe error report is adequate to **close FU-003-01**
- Orphan rollback is **PROVEN_BY_IMPLEMENTATION** but FU-003-03 remains open for empirical proof
- Evidence gaps (live JWT, concurrent CAS, confirm DB tests) and the transport-failure finalize defect are **follow-ups**, not grounds to reject the Apply wholesale
- Not `ACCEPT` (gaps remain). Not `REWORK_REQUIRED` for the whole pack (happy-path and SQL design meet binding intent). Not `BLOCKED`.

### FU closure actions from this review

| FU | Architect decision |
|---|---|
| FU-003-01 | **CLOSED** with evidence cited herein + unit suite |
| FU-003-02 | **OPEN** |
| FU-003-03 | **OPEN** |
| FU-002-01…06 | **OPEN** (independent) |

---

## Status

**PACK_004_ARCHITECT_REVIEW_COMPLETE**

---

## Addendum — Targeted transport-failure correction (2026-07-30)

> Builder Apply authorized for **mandatory §9 correction only**. This addendum records correction evidence for focused Architect Review. It does **not** reopen or reverse the prior `ACCEPT_WITH_FOLLOW_UPS` recommendation, does **not** close FU-003-02/03, and does **not** formally accept PACK-004.

### Root cause (confirmed)

`confirmAssignmentImport` ignored `persist_assignment_import_row` transport errors, left rows `pending`, counted pending as `failed_rows`, and finalized `completed_with_errors`.

### Behavior after correction

1. On RPC transport/null result: narrowly update same job row if still `valid` + `pending` → `failed` with safe `PERSISTENCE_FAILED` in `persistence_errors` only.
2. If that fallback update errors: mark job `failed`, return safe job-level `INTERNAL_ERROR`, **do not** finalize completed*.
3. Counters: `failed_rows` = stored valid `failed` only; pending never counted as failed.
4. Finalize refused while any valid `pending` remains → job `failed` + safe error.
5. Error report includes these rows via existing `persistence_status = failed` filter.

### Evidence

- Code: `src/lib/imports/assignments/confirm-persistence.ts`, `actions.ts`
- Tests: `tests/imports/confirm-transport.test.ts` (11) — suite total **63/63**
- Migration: **none** created/changed; Local == Remote unchanged
- Gates: test/lint/build PASS; `git diff --check` PASS after briefing whitespace fix

### FU status unchanged by this correction

FU-003-01 CLOSED · FU-003-02 OPEN · FU-003-03 OPEN · FU-002-* OPEN

---

## Focused Architect Review — transport-failure correction (2026-07-30)

> Scope: mandatory §9 correction only> Baseline HEAD: `a68d8f9` · Branch: `master` · Uncommitted Apply + correction> Product/tests/migrations: **not modified by this review**> Builder status reviewed: `PACK_004_TARGETED_CORRECTION_READY_FOR_REVIEW`> **Focused recommendation: `ACCEPT_WITH_FOLLOW_UPS`**> **Status: `PACK_004_FOCUSED_REVIEW_COMPLETE`**

### Preflight

| Check | Result |
|---|---|
| Branch / HEAD | `master` / `a68d8f9` |
| Staged | None observed for review scope |
| Migration changed by correction | **No** |
| Local == Remote | Unchanged (includes `20260730170000`) |
| PACK-005 / Frotcom | Not started |

### Root-cause verdict

**CONFIRMED / ADDRESSED**

Prior defect was real: ignored RPC transport errors → `pending` rows + `failed_rows` inflation + `completed_with_errors` + missing error-report lines. Correction removes that path.

### Correction-design verdict

**PASS**

| Requirement | Finding |
|---|---|
| Transport miss → stored `failed` | `actions.ts` calls `recordTransportPersistenceFailure` when `rpcError \|\| rpcResult == null` |
| Filters: same row, same job, valid, pending | `.eq("id")`, `.eq("import_job_id")`, `.eq("validation_status","valid")`, `.eq("persistence_status","pending")` |
| Update fields only | `persistence_status`, `persistence_errors`, `updated_at` — no normalized_payload / validation_* / assignment_id / driver_id / customer_id |
| Safe `PERSISTENCE_FAILED` only | Fixed constant message; no `SQLERRM` / error.message persistence |
| Skip already terminal rows in loop | Continues past persisted/skipped/failed; no automatic retry |

### Fallback-failure verdict

**PASS**

If fallback returns `{ ok: false }`: `markImportJobFailed` → job status `failed` (supported model) → safe `INTERNAL_ERROR` API message → **no** `completed` / `completed_with_errors` finalize.If fallback returns `{ ok: true, updated: false }` and a valid pending row somehow remains: recount + `resolveConfirmTerminalStatus` aborts the same way. No unsupported states invented.

### Counter-invariant verdict

**PASS**

`countValidPersistenceStatuses` never treats pending as failed.`resolveConfirmTerminalStatus`: pending → refuse finalize; failed>0 → `completed_with_errors`; else `completed`.Finalize writes counters from those stored counts only.

### Error-report verdict

**PASS**

Failed transport rows become `persistence_status = failed` and are included by existing `shouldIncludeInErrorReport`. Unit evidence shows `PERSISTENCE_FAILED` + safe message; no transport internals.

### Idempotency / protection verdict

**PASS**

SQL filters prevent overwrite of persisted/skipped/invalid/non-pending. Loop skips failed (no auto-retry). CAS double-confirm path unchanged. Successful RPC rows remain final.

### Test-evidence verdict

**PASS_WITH_RESIDUAL** — 11 new tests are **unit** + **mocked** client-chain tests. Not DB integration / live DB / live JWT / concurrency.

| Claimed coverage | Actual evidence class | Adequate for §9? |
|---|---|---|
| Safe PERSISTENCE_FAILED payload | unit | Yes |
| Counter / pending abort / terminal rules | unit | Yes |
| Eligibility (job/valid/pending) | unit | Yes |
| Fallback update shape + filters | mocked | Yes |
| Fallback update error → ok:false | mocked | Yes |
| No-match → updated:false | mocked | Yes |
| Error-report include + codes | unit | Yes |
| Full `confirmAssignmentImport` transport→finalize path | **not executed as integration** | Design accepted by code inspection; residual for FU-003-02 |
| Validation evidence “unchanged” under live write | inferred from omitted update columns + report fixture | Acceptable for this correction; not live DB proof |

Do **not** treat these 11 tests as database or live evidence.

### Regression verdict

**PASS** (inspection)

Correction is localized to confirm finalize helpers + loop. No change to RPC SQL, CAS function, formula escape, auth design, or migration. Prior Architect FU decisions stand: FU-003-01 closed; FU-003-02/03 and FU-002-* remain open (no new closing evidence).

### Remaining evidence gaps

1. FU-003-02 — confirm/partial/create-on automated DB suite still open (transport unit coverage helps but does not close)2. FU-003-03 — empirical orphan rollback still open3. FU-002-01…06 — live JWT / concurrency / related residuals still open4. Optional: end-to-end mocked `confirmAssignmentImport` transport path (nice-to-have, not rework)

### Focused final recommendation

**ACCEPT_WITH_FOLLOW_UPS**

Rationale: the mandatory transport-failure finding is **corrected and accepted**; pack-level acceptance remains with follow-ups because FU-003-02/03 and FU-002-* stay open. Not `ACCEPT` (residuals). Not `REWORK_REQUIRED` (correction meets binding intent). Not `BLOCKED`.

### Status

**PACK_004_FOCUSED_REVIEW_COMPLETE**

### Formal acceptance (2026-07-30)

Human-authorized formal acceptance recorded in `ACCEPTANCE-RECORD.md`.

**PACK_004_ACCEPTED_WITH_FOLLOW_UPS**

Follow-ups remain: FU-003-02/03 OPEN; FU-002-01…06 OPEN; live JWT NOT_EXECUTED; empirical orphan DB proof OPEN; concurrency residual OPEN. PACK-005 / Frotcom not started.
