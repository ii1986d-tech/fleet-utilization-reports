# PACK-004 Builder Report — Apply

> Status: **PACK_004_IMPLEMENTATION_READY_FOR_REVIEW**> Baseline: `master` @ `a68d8f9`> Applied: 2026-07-30> Recommendation: **READY_WITH_RESIDUAL_EVIDENCE_GAPS**> No commit / no push

## Implementation summary

PACK-004 Apply delivered import hardening only:

1. Migration `20260730170000_pack004_import_hardening.sql` (remote applied; Local == Remote)
2. Atomic `persist_assignment_import_row` RPC + hardened `begin_import_job_confirm`
3. Confirm flow rewired to per-row RPC; counters from stored row states
4. `persistence_errors` column + app mapping; validation_* preserved
5. On-demand error-report XLSX (exceljs 4.4.0) + formula-injection escape
6. Narrow UI download control + `GET /api/import-jobs/[jobId]/error-report`
7. Unit/mocked coverage for report/formula/vocab/authz helpers

PACK-005 / Frotcom / reports dashboard: **not started**.

## Migration

| Item | Evidence |
|---|---|
| Name | `supabase/migrations/20260730170000_pack004_import_hardening.sql` |
| Contents | `persistence_errors`; vocab backfill; CHECK updates; CAS `search_path=public`; `persist_assignment_import_row`; grants revoke PUBLIC |
| Remote | Applied; `npx supabase migration list` shows five migrations Local==Remote including `20260730170000` |
| Repair | Not used |

## RPC

`persist_assignment_import_row(p_job_id uuid, p_import_row_id uuid, p_create_missing_driver boolean default false, p_create_missing_customer boolean default false)`

- SECURITY INVOKER · fixed `search_path = public` · admin via `is_admin()` / `auth.uid()`
- One stored row per call; authoritative payload from `import_job_rows`
- Exact duplicate → skipped; overlap → failed + `ASSIGNMENT_OVERLAP`
- Unknown → safe `PERSISTENCE_FAILED` (no raw SQL in row audit)

## API / UI

| Surface | Detail |
|---|---|
| Server action | `downloadImportErrorReport({ jobId })` |
| Route | `GET /api/import-jobs/[jobId]/error-report` |
| UI | `/settings/imports/assignments` — Download error report when invalid/failed rows exist; busy/disabled; aria-label |

## Tests added

`tests/imports/report.test.ts` (14) — formula escape `= + - @`; inclusion; columns; filename; workbook sheet; vocab; admin-only helper.

## Gate results (Apply)

| Gate | Result |
|---|---|
| `npm test` | **52/52 PASS** (unit) |
| `npm run lint` | PASS (recorded with gate run) |
| `npm run build` | PASS (recorded with gate run) |
| `git diff --check` | PASS |
| Migration Local==Remote | PASS (`20260730170000`) |
| Live JWT RLS | NOT EXECUTED (env limitation) |
| Concurrent CAS | NOT EXECUTED (env limitation) |

## Evidence classification (honest)

| Area | Class | Status |
|---|---|---|
| Error-report formula/columns/include | unit | PASS |
| Authz helper (admin vs manager/viewer) | unit | PASS |
| Download requireAdmin path | mocked via shared requireAdmin | not live JWT |
| Atomic RPC orphan rollback / create ON/OFF | remote DB function present | **no automated local/remote DB test executed this Apply** |
| Double-confirm CAS concurrent | best-effort | **not executed** (env limitation) |
| Live JWT RLS matrix FU-002-01 | live JWT | **not executed** |
| FU-002-02…06 | various | **not closed** — residual |

## FU closure recommendations (do not auto-close)

| FU | Recommendation |
|---|---|
| FU-003-01 | **Propose close** after Architect confirms unit + implementation evidence sufficient for error-report/formula; optional live admin download smoke |
| FU-003-02 | **Keep open** — confirm/partial/create-on lack remote DB automated tests |
| FU-003-03 | **Keep open** until orphan-rollback proven against DB (RPC designed for it; evidence gap) |
| FU-002-01…06 | **Keep open** — review independently; live JWT/concurrency gaps remain |

## Residual risks for Architect Review

1. No live JWT RLS evidence this Apply (FU-002-01)
2. No multi-client CAS concurrency capture (OQ-004-04 / FU-002-02)
3. Atomic persistence behaviors covered by SQL design + remote apply, not by automated DB integration suite
4. Transport-level RPC failure may leave a valid row `pending` (counted into `failed_rows` on finalize)

## Out of scope confirmation

- No PACK-005 / Frotcom work
- No reports dashboard
- No CSV/XLS/XLSM
- No vehicle auto-creation
- No stage / commit / push

## Recommendation

**READY_WITH_RESIDUAL_EVIDENCE_GAPS**

## Status

**PACK_004_IMPLEMENTATION_READY_FOR_REVIEW**

---

## Targeted correction — transport-failure finalize (2026-07-30)

> Status: **PACK_004_TARGETED_CORRECTION_READY_FOR_REVIEW**> Recommendation: **READY_FOR_FOCUSED_ARCHITECT_REVIEW**> Scope: mandatory Architect §9 finding only · no migration · no commit/push

### Root cause

Confirm loop ignored RPC transport errors; rows stayed `pending` while finalize counted them as failed and set `completed_with_errors`.

### Behavior chosen

| Case | Behavior |
|---|---|
| RPC transport/null result | Narrow update: same job + valid + pending → `failed` + safe `PERSISTENCE_FAILED` persistence_errors |
| Fallback update fails | Job → `failed`; safe `INTERNAL_ERROR`; no completed* finalize |
| Unexpected valid pending at recount | Job → `failed`; safe error; no inconsistent completed* |
| Counters | Equal stored valid persisted/skipped/failed; pending never counted as failed |
| Error report | Includes corrected failed rows (existing failed filter) |

### Files

- Created: `src/lib/imports/assignments/confirm-persistence.ts`
- Modified: `src/lib/imports/assignments/actions.ts`
- Tests: `tests/imports/confirm-transport.test.ts`
- Docs: BUILDER-REPORT (this section), ARCHITECT-REVIEW addendum, SoT status mirrors

### Migration

**Not required / not created / not changed.** Local == Remote still includes `20260730170000`.

### Gates

| Gate | Result |
|---|---|
| `npm test` | **63/63 PASS** |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |
| FU-003-02 / FU-003-03 | Remain **OPEN** |

### Residual

Confirm integration/live DB suite still incomplete (FU-003-02). Orphan empirical proof still open (FU-003-03). Live JWT / CAS still open (FU-002).

### Formal acceptance

**PACK_004_ACCEPTED_WITH_FOLLOW_UPS** — see `ACCEPTANCE-RECORD.md`. Checkpoint committed on master (`feat: complete PACK-004 import hardening`).
