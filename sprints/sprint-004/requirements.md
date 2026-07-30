# Requirements — PACK-004 (corrected)

> Baseline `a68d8f9` · ADR-008 **ACCEPTED (design binding)** · OQ-004-01…04 **RESOLVED**> Apply blocked until explicit authorization

## Locked OQs

| OQ | Resolution |
|---|---|
| OQ-004-01 | **ACCEPT DEFAULT** — no reports dashboard; narrow import error-report only |
| OQ-004-02 | **DATABASE RPC** — `persist_assignment_import_row` |
| OQ-004-03 | **DOCUMENT CURRENT BEHAVIOR** — direct `validated` OK; no migration for uploaded/parsed |
| OQ-004-04 | **BEST-EFFORT WITH MANUAL EVIDENCE** — CAS mandatory; race harness preferred |

## REQ-P4-ERR — Error report (FU-003-01)

| Item | Binding |
|---|---|
| Library | exceljs **4.4.0** only |
| Generation | On demand from `import_jobs` + `import_job_rows` |
| Action | `downloadImportErrorReport({ jobId })` |
| UI | `/settings/imports/assignments` download control |
| Auth | Admin-only |
| Sheet | `ImportErrors` (one) |
| Filename | `import-errors-{jobId8}-{yyyyMMddHHmmss}.xlsx` |
| Include | `validation_status = invalid` OR `persistence_status = failed` |
| Exclude | `persisted` rows (default); pure successful skips excluded |
| Formula | Prefix `'` if first non-whitespace is `= + - @` |
| Leakage | Stable code + safe message only |

Columns: see ADR-008 D9 (24 columns, deterministic order).

## REQ-P4-ATOM — Atomic persist (FU-003-03)

RPC: `persist_assignment_import_row(p_job_id, p_import_row_id, p_create_missing_driver default false, p_create_missing_customer default false)`

- Actor from `auth.uid()` only- SECURITY INVOKER + fixed `search_path` + `is_admin()` inside function- No client payloads- Orphan-master rollback mandatory- Vehicles never created
## REQ-P4-VOCAB — Status vocabulary

| Field | Values |
|---|---|
| `validation_status` | `valid` \| `invalid` |
| `persistence_status` | `pending` \| `persisted` \| `skipped` \| `failed` |

Migration backfills from PACK-003 values (`OK`/`WARNING`/`NEW_MASTER`→`valid`; `ERROR`/`CONFLICT`→`invalid`; `imported`→`persisted`; `not_attempted`→`pending`).

Exact duplicate → **skipped** (not failed). Overlap → **failed** + `ASSIGNMENT_OVERLAP`.

## REQ-P4-AUDIT — persistence_errors

- Column `persistence_errors jsonb not null default '[]'` **mandatory**- validation_errors / warnings immutable after validate- Each persist attempt **replaces** persistence_errors for that row- No automatic failed-row retry in PACK-004
## REQ-P4-SQLSAFE — No raw SQL leakage

Mapper to stable codes; unknown → `PERSISTENCE_FAILED`.

## REQ-P4-TEST / RLS / P002

See `acceptance.md`. Live JWT evidence mandatory where access available; FU IDs unchanged.

## Non-goals

Frotcom · PACK-005 · reports UI · CSV/XLS/XLSM · vehicle auto-create · automatic retry
