# PACK-003 — Excel assignment import (Phase 3)

> Architect preparation 2026-07-30 · Dry-run corrections 2026-07-30
> Status: **PACK_003_ACCEPTED_WITH_FOLLOW_UPS** · Checkpoint: **PACK_003_CHECKPOINT_READY**
> Baseline: PACK-002 checkpoint **`21ab8aa`**
> Evidence: `ACCEPTANCE-RECORD.md` · `ARCHITECT-REVIEW.md` · `BUILDER-REPORT.md`

Binding: **ADR-007** (corrected) + ADR-005 + ADR-006

---

## 1. Objectives

Controlled Excel intake for `vehicle_assignments`: upload → parse → validate (server-stored preview) → confirm (CAS) → per-row persist → summary + error report. Partial success; no silent overwrite; admin-only; vehicles never auto-created.

---

## 2. Scope

### In scope

- `.xlsx` assignment import only (`exceljs` at Apply)
- Routes `/settings/imports`, `/settings/imports/assignments`
- Mandatory migration (`import_jobs` extend + `import_job_rows`)
- Tests listed in §12

### Out of scope

`.xls`/`.xlsm`/CSV · live Frotcom · PACK-004+ · vehicle auto-create · FU-002-* closure · general Excel importer · multi-sheet merge

---

## 3. Dependency (approved, install at Apply only)

| Item | Value |
|---|---|
| Package | **`exceljs`** |
| Purpose | Server-side `.xlsx` parse + error report generation |
| Client parse | **Forbidden** for authoritative path |
| Pinning | Lockfile at Apply |
| Formulas | Never executed by app (ADR-007 D13) |

---

## 4. File & worksheet rules

| Rule | Value |
|---|---|
| Max size | **5 MiB** (ASM-011 **RESOLVED**) |
| Max data rows | **2000** |
| Sheets | **Exactly one** non-empty worksheet; else reject |
| Trailing blanks | Ignored |
| Extension + OOXML signature | Both required |
| Encrypted / password | Reject |

---

## 5. Columns & normalization

Canonical keys + DE/EN aliases unchanged from prior pack (registration, driver, customer, valid_from, valid_until, notes).

**Plate (Kennzeichen):** trim → NFKC → upper → remove spaces/hyphens → letters+digits only; compare normalized; keep original in payload.

**Names:** trim, NFKC, case-insensitive match.

**Dates:** Excel native/serial, `YYYY-MM-DD`, `DD.MM.YYYY`, unambiguous `DD/MM/YYYY`; date-only; reject ambiguous; empty until → NULL.

**Create masters:** default **OFF**; optional enable before confirm; drivers/customers only.

---

## 6. Workflow & state machine

```text
uploaded → parsed → validated → confirming → completed
                                         └→ completed_with_errors
(any) → failed
```

- Preview persisted in `import_job_rows` at `validated`.
- Confirm: CAS `validated` → `confirming`; else **409 `IMPORT_ALREADY_CONFIRMED`**.
- Persist: **per-row** transactions.
- No return from completed* to confirming.

---

## 7. Migration design (Apply only — do not create now)

Filename (indicative): `YYYYMMDDHHMMSS_import_jobs_protocol.sql`

### 7.1 Alter `import_jobs`

Keep existing id PK. Add/align columns (rename via add+backfill if needed; prefer additive columns mapping Architect names):

| Column | Type | Notes |
|---|---|---|
| `status` | text NOT NULL | CHECK ∈ uploaded, parsed, validated, confirming, completed, completed_with_errors, failed |
| `source_filename` | text NOT NULL | Sanitized basename (map from / replace `file_name`) |
| `source_file_size` | integer NOT NULL | Bytes |
| `source_sha256` | text NOT NULL | Hex digest of upload bytes |
| `worksheet_name` | text NULL | Set when parsed |
| `total_rows` | integer NOT NULL DEFAULT 0 | |
| `valid_rows` | integer NOT NULL DEFAULT 0 | |
| `invalid_rows` | integer NOT NULL DEFAULT 0 | |
| `skipped_rows` | integer NOT NULL DEFAULT 0 | |
| `persisted_rows` | integer NOT NULL DEFAULT 0 | (replaces/supplements `imported_rows`) |
| `failed_rows` | integer NOT NULL DEFAULT 0 | Persist failures |
| `import_config_version` | text NOT NULL | e.g. `p003-v1` |
| `options` | jsonb NOT NULL DEFAULT `{}` | e.g. createNewMasters |
| `confirmed_at` | timestamptz NULL | |
| `confirmed_by` | uuid NULL | |
| `confirmation_started_at` | timestamptz NULL | |
| `created_by` | uuid NULL | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |
| `completed_at` | timestamptz NULL | Existing |
| `error_report_reference` | text NULL | Optional regenerable token |

Indexes: `(created_at DESC)`; `(status)`; `(source_sha256)`.

RLS: keep admin-only (`import_jobs_admin`); no broad writes.

### 7.2 Create `import_job_rows`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `import_job_id` | uuid NOT NULL | FK → `import_jobs(id)` **ON DELETE CASCADE** |
| `source_row_number` | integer NOT NULL | |
| `normalized_payload` | jsonb NOT NULL | Raw + normalized fields + display originals |
| `validation_status` | text NOT NULL | OK / WARNING / ERROR / CONFLICT / NEW_MASTER |
| `validation_errors` | jsonb NOT NULL DEFAULT `[]` | |
| `validation_warnings` | jsonb NOT NULL DEFAULT `[]` | |
| `duplicate_key` | text NULL | Row-level idempotency key |
| `persistence_status` | text NOT NULL DEFAULT `pending` | pending / imported / skipped / failed / not_attempted |
| `assignment_id` | uuid NULL | FK → vehicle_assignments **ON DELETE SET NULL** |
| `driver_id` | uuid NULL | SET NULL |
| `customer_id` | uuid NULL | SET NULL |
| `persisted_at` | timestamptz NULL | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

Constraints:

- UNIQUE (`import_job_id`, `source_row_number`)
- Index (`import_job_id`, `validation_status`)
- Index (`duplicate_key`) where not null

RLS: `import_job_rows_admin` FOR ALL USING/WITH CHECK `is_admin()`.

Retention: ASM-005; no auto-purge in PACK-003.
Rollback: forward-fix drop table + drop added columns/checks.

---

## 8. Error contracts

| HTTP | Code |
|---:|---|
| 400 | VALIDATION_ERROR / IMPORT_FILE_INVALID |
| 401 | UNAUTHENTICATED |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND |
| 409 | ASSIGNMENT_OVERLAP / IMPORT_ALREADY_CONFIRMED |
| 413 | IMPORT_FILE_TOO_LARGE |
| 422 | IMPORT_VALIDATION_FAILED |
| 500 | INTERNAL_ERROR |

Shape: `{ code, message, httpStatus, details? }`. Row details in `import_job_rows` + summary.

---

## 9. Counter invariants

Validate: `total_rows = valid_rows + invalid_rows`
Confirm: `valid_rows = persisted_rows + skipped_rows + failed_rows`
Always from DB row states.

---

## 10. UX states

empty · file selected · uploading · parsing · validated preview · warnings · file error · row errors · confirming · partial success · complete success · failed · already confirmed · forbidden · retry (new upload or remap while `validated`)

---

## 11. Indicative Apply files

- `src/lib/imports/assignments/{parse,normalize,plates,dates,validate,idempotency,actions,report,errors}.ts`
- `app/settings/imports/**`
- `tests/imports/**`
- Migration as §7
- `package.json` + lockfile (`exceljs`)

Reuse: `periods`, `overlap`, `requireAdmin`, masters create helpers.

---

## 12. Mandatory tests (implementation)

All items from dry-run §11 correction list, including: valid import; unsupported/renamed file; oversize; multi non-empty sheets; headers/aliases/duplicates; serial/DE/ISO dates; ambiguous reject; formula required reject; unknown/inactive vehicle; create default OFF / explicit ON; duplicate master prevention; exact skip; intra-file + DB overlap; partial success; per-row failure isolation; summary accuracy; CAS + double confirm 409; concurrent confirm single winner; viewer/manager deny; admin allow; malformed workbook; server preview used; client-tampered ignored; no vehicle auto-create; no hard-delete.

Maps TM-11, TM-12, TM-13.

---

## 13. Acceptance criteria

- [ ] ADR-007 corrections implemented
- [ ] `exceljs` installed only at Apply; server-only parse
- [ ] Migration applied; admin RLS on jobs + rows
- [ ] CAS confirm; per-row persist; server preview
- [ ] Create masters default OFF; no vehicle create
- [ ] Counters invariant; error contracts
- [ ] Mandatory tests + gates PASS
- [ ] FU-002-01…06 still open on RSK-012
- [ ] PACK-004 not started

---

## 14. Apply gate

**Apply is blocked** until:

1. Human approval of **PACK_003_CORRECTIONS_READY_FOR_APPROVAL**
2. Explicit **Apply** authorization

Dry-run: `BUILDER-DRY-RUN.md`. Corrections: this document + ADR-007.

---

## Pack metadata

| Field | Value |
|---|---|
| Pack | PACK-003 v1 (corrected) |
| Baseline | `21ab8aa` |
| exceljs | Approved for Apply |
| ASM-011 | RESOLVED (5 MiB / 2000 rows / one sheet) |
| Builder | Await approval — no Apply |
