# PACK-003 Builder Dry-Run Report

> Date: 2026-07-30
> Baseline: PACK-002 checkpoint **`21ab8aa`**
> Architect package: `sprints/sprint-003/PACK-003.md` + **ADR-007** (+ ADR-005/006)
> Product code / migrations / installs / commits: **unchanged** (dry-run only)

## Recommendation

**READY_WITH_REQUIRED_CORRECTIONS**

Architect must lock the corrections in §14 before Apply approval. Do **not** start Apply until those are written into ADR-007 / PACK-003 (or an explicit corrections addendum).

---

## 1. Scope verification

| In scope (confirmed) | Out of scope (confirmed) |
|---|---|
| `.xlsx` assignment import only | `.xls` / `.xlsm` / `.xlsb` / CSV / ODS |
| Upload → parse → validate → preview → confirm → persist → summary | Live Frotcom / DS-001 |
| `/settings/imports` + `/settings/imports/assignments` | General-purpose Excel importer |
| Reuse ADR-005/006 helpers + DB exclusion | Vehicle auto-create |
| `import_jobs` protocol + error report | Reporting redesign / PACK-004 |
| Admin-only | Unrelated master-data redesign |
| FU-002-01…06 **not** absorbed | PACK-006 exports |

**Verdict:** Scope is coherent and Phase-3-aligned. No scope creep detected in the Architect package.

---

## 2. Existing-code impact analysis

### Reuse (do not duplicate)

| Asset | Path | Use in PACK-003 |
|---|---|---|
| Periods | `src/lib/assignments/periods.ts` | `normalizePeriod` / assert range |
| Overlap | `src/lib/assignments/overlap.ts` | In-file + vs-DB overlap; exact-period compare for idempotent skip |
| Error mapper | `src/lib/assignments/errors.ts` | Extend codes; map exclusion → row CONFLICT / 409 |
| Auth | `src/lib/auth/session.ts` (`requireAdmin`) | All import actions |
| Roles | `src/lib/auth/roles.ts` | `canManageMasterData` |
| Masters | `src/lib/masters/actions.ts` + `schemas.ts` | Create driver/customer on confirm; list for match |
| Assignment insert pattern | `src/lib/assignments/actions.ts` | Mirror insert fields; **do not** call UI-oriented correct/end |
| Supabase server client | `src/lib/supabase/server.ts` | Session-scoped mutations |
| Types | `src/lib/supabase/types.ts` | `AssignmentSource` already includes `excel_import` |
| RLS | `import_jobs_admin` | Keep admin-only; no widening |
| Exclusion | `vehicle_assignments_vehicle_period_excl` | Final integrity on insert |

### API / UI contract breakage

- **None expected** for PACK-002 assignment APIs if import uses dedicated actions.
- Settings nav (`app/settings/layout.tsx`) gains Imports links — additive only.
- `AppError` union must grow — additive, exhaustive switch must be updated (typescript-exhaustive-switch).

### Proposed changed-file list (Apply — not now)

**Modify**

- `app/settings/layout.tsx` — nav links to imports
- `app/page.tsx` — optional link to imports (if home lists settings)
- `src/lib/assignments/errors.ts` — import lifecycle codes (see §7)
- `docs/AUTH-ROLES.md` — already has PACK-003 matrix; confirm after Apply
- `package.json` / lockfile — **only after** dependency approval
- Planning/quality evidence files after Apply (Builder Report, etc.)

**Create**

- `src/lib/imports/assignments/parse.ts`
- `src/lib/imports/assignments/normalize.ts`
- `src/lib/imports/assignments/validate.ts`
- `src/lib/imports/assignments/idempotency.ts` (exact-dup key)
- `src/lib/imports/assignments/errors.ts` (row codes) *or* fold into assignments/errors
- `src/lib/imports/assignments/actions.ts` (uploadPreview, remap, confirm, listJobs, downloadErrorReport)
- `src/lib/imports/assignments/report.ts` (generate error `.xlsx` from stored rows)
- `app/settings/imports/page.tsx` (hub)
- `app/settings/imports/assignments/page.tsx` (wizard UI)
- `tests/imports/*.test.ts`
- `tests/fixtures/imports/` — generate buffers in tests (prefer no committed binaries)
- `supabase/migrations/YYYYMMDDHHMMSS_import_jobs_protocol.sql` (**required** — see §9)

**Do not touch**

- Frotcom modules, daily_reports UI, PACK-002 overlap migration body, RLS write predicates (except additive policies for new tables)

---

## 3. Dependency review

| Check | Result |
|---|---|
| Excel library already installed? | **No** (`package.json` has no `xlsx` / `exceljs` / SheetJS) |
| Server-side parse possible? | **Yes** — Node Buffer in server actions / route handlers; never in browser for authoritative parse |

### Proposed dependency (not installed)

| Package | Why | Risk |
|---|---|---|
| **`exceljs`** (^4.x) | MIT; read `.xlsx` values; write error report `.xlsx`; no VBA execution | Moderate supply-chain; pin version; review changelog at Apply |

**Alternatives rejected for MVP:** SheetJS community `xlsx` (license/bundle confusion); CSV parsers (out of scope).

**Stop condition:** Do **not** `npm install` until human explicitly approves **`exceljs`** (or names a substitute).

---

## 4. Import protocol review

### Current DB (`import_jobs`)

Exists: `file_name`, `status` (unconstrained text), counters `total/valid/invalid/imported`, `error_report_reference`, `created_by`, timestamps.
**Missing for ADR-007:** `skipped_rows`, preview snapshot, per-row audit, content hash, confirm lock, status enum check.

### Recommended state machine (correction)

```text
uploaded
  → failed_validation     (file-level fail; terminal)
  → preview_ready         (rows stored; awaiting confirm)  [replaces validated/previewed sprawl]
  → confirming            (CAS lock)
  → completed             (all importable rows ok / skips only)
  → completed_with_errors (partial: some imported, some ERROR/CONFLICT/fail-at-persist)
  → failed                (confirm crashed before any durable row outcome; rare)
  → cancelled             (optional; admin abandons preview_ready)
```

**Drop or merge** Architect’s `uploaded → validated → previewed → importing` into fewer durable states to avoid orphan mid-states. Transient “parsing” is UI-only, not DB.

### Transitions & guards

| Event | From | To | Guard |
|---|---|---|---|
| upload+parse OK | — | `preview_ready` | admin; create job + `import_job_rows` |
| upload file fail | — | `failed_validation` | no assignment writes |
| confirm | `preview_ready` | `confirming` | **CAS** `UPDATE … WHERE status='preview_ready'` |
| confirm race | already `confirming`/`completed*` | — | **409 `IMPORT_ALREADY_CONFIRMED`** (or in-progress) |
| persist done | `confirming` | `completed` / `completed_with_errors` | set counters + `completed_at` |
| retry | `preview_ready` only | remap → rewrite rows; **or** new upload → new job | never re-confirm completed job |

### Double confirmation

Must be prevented by **status CAS** (and optionally `confirmed_at` / `confirmed_by`). Second confirm → 409, zero new inserts.

### Idempotent repeated imports

- **Job-level:** each upload = new `import_jobs` id (Architect OK).
- **Row-level:** exact dup key `(vehicle_id, valid_from, valid_until, driver_id, customer_id)` → SKIP warning; no insert.
- Optional: `content_sha256` on job for ops visibility — not a hard uniqueness constraint.

### Preview persistence

**Required correction:** Persist server-side row DTOs at preview (`import_job_rows`). Confirm must **not** trust client-sent row payloads as source of truth; may only send `jobId` + options (`createNewMasters: boolean`). Re-run overlap/dup checks at confirm against **current** DB.

---

## 5. Data mapping review

| Field | Architect | Dry-run note |
|---|---|---|
| Kennzeichen | aliases OK | **Missing:** plate normalization (uppercase? strip spaces/hyphens?) — **required correction** |
| Fahrer / Auftraggeber | trim + case-insensitive | OK; Unicode fold — specify NFKC |
| Gültig ab/bis | ISO + DE + Excel serial | OK; reject ambiguous `D.M.YY` without zero-pad if needed |
| Bemerkung | optional | Cap length to DB/notes (e.g. 2000) — truncate WARNING |
| Empty cells | until → NULL | OK |
| Duplicate headers | not specified | **Required:** file-level ERROR |
| Duplicate data rows in file | not specified | Treat as in-file overlap or exact-dup of each other — **required correction** |
| Inactive masters | blocking | OK |
| Unknown vehicle | ERROR; never create | OK |
| Create-on-confirm | optional toggle | **Required:** default **OFF** (safer) unless Architect explicitly wants ON |

---

## 6. Partial-success semantics

| Rule | Verdict |
|---|---|
| Invalid rows don’t block valid | Binding ADR-007 D2 — OK |
| Rejected never persisted | OK |
| Summary vs DB drift | Counters must be written **from persist outcomes**, not preview guesses |
| Repeated confirm | CAS — OK if implemented |
| Persist mid-failure | Per-row outcome recorded |

### Transaction granularity — **REQUIRED CORRECTION**

Architect text says both “Transactional batch” and “continue on per-row failure” — **contradictory** if interpreted as one TX that aborts all.

**Recommend (justify vs ADR-007):**

1. **Job CAS** to `confirming` (single short TX).
2. **Per-row persistence unit:** for each importable row: create masters if needed (same unit) → insert assignment → on exclusion/unique failure mark CONFLICT/ERROR → **commit that unit** (separate TX or SAVEPOINT released per row).
3. Finalize job counters + terminal status in one TX.

**Reject:** single all-or-nothing TX for all inserts (violates partial success).
**Reject:** client-driven multi-confirm of “only failed rows” in MVP (retry = new file or new job).

---

## 7. Overlap and concurrency

| Scenario | Expected behavior |
|---|---|
| Preview OK, then another assignment inserted before confirm | Confirm re-check → CONFLICT; row not imported; others proceed |
| Intra-file overlaps | All involved rows CONFLICT at preview; none importable |
| Exact DB duplicate | SKIP warning |
| Two clients confirm same job | One CAS wins; loser **409 `IMPORT_ALREADY_CONFIRMED`** (or `IMPORT_IN_PROGRESS`) |
| One row fails at DB exclusion | Row CONFLICT/ERROR; siblings continue |

### HTTP / row mapping — **REQUIRED CORRECTION** (align catalog)

Current `AppError` has no import-specific codes and **no 422**. Prefer consistency with PACK-002:

| Situation | Code | HTTP |
|---|---|---:|
| Bad file / headers / size | `VALIDATION_ERROR` or `IMPORT_FILE_INVALID` | 400 |
| Unauthenticated | `UNAUTHENTICATED` | 401 |
| Non-admin | `FORBIDDEN` | 403 |
| Unknown job id | `NOT_FOUND` | 404 |
| Job already confirmed / in progress | **`IMPORT_ALREADY_CONFIRMED`** | **409** |
| DB exclusion on a row during confirm | Row-level CONFLICT; job may still 200 with summary — **not** whole-request 409 unless every row failed only due to overlap and API chooses otherwise | Prefer **200 + summary** for partial confirm |
| Service failure after CAS | `INTERNAL_ERROR`; job `failed` or stuck `confirming` needs recovery rule | 500 |

**Do not** use HTTP 422 for per-row preview errors — preview returns **200** with row statuses.
Whole-request ASSIGNMENT_OVERLAP 409 remains for single-assignment APIs (PACK-002), not for multi-row import confirm.

ADR-006: import performs **INSERT only** (plus optional master create). No silent close+create. Corrections stay in settings UI.

---

## 8. Authorization and security

| Control | Status |
|---|---|
| Admin-only upload/preview/confirm/download | Specified — OK |
| `requireAdmin` + `import_jobs_admin` | OK — do not widen |
| Extension allowlist `.xlsx` | OK |
| MIME sniff + magic (PK zip / OOXML) | **Missing — required** |
| Reject `.xlsm` even if renamed | Extension + content-type + zip probe |
| Filename sanitize | Basename only; strip path; max length — **required** |
| Formula cells | **Missing — required:** use evaluated/cached **value** only; never execute; if formula-only with no cached value → row ERROR |
| Oversized / zip-bomb | Enforce 5 MiB **and** row cap; library timeout/abort — **required** |
| Retention | DB rows; no local durable file — OK |
| Error report generation | On download from DB — OK |

**ADR-007 gaps to close:** MIME/magic validation; formula value policy; zip-bomb/row DoS; filename sanitization; confirm CAS; default create-on-confirm.

---

## 9. Migration analysis

**Decision: migration REQUIRED for Apply** (auditability + idempotent confirm cannot be honest on current columns alone).

### Proposed additive migration (do not create now)

**A. Alter `import_jobs`**

- `status` CHECK against locked enum (§4)
- `skipped_rows integer not null default 0`
- `content_sha256 text null`
- `options jsonb` (e.g. `{ "createNewMasters": false }`)
- `confirmed_at`, `confirmed_by` nullable
- Index on `(created_at desc)`

**B. Create `import_job_rows`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `job_id` | uuid FK → import_jobs ON DELETE CASCADE | |
| `row_number` | int | Excel sheet row |
| `status` | text | OK / WARNING / ERROR / CONFLICT / NEW_MASTER / SKIPPED / IMPORTED / FAILED_PERSIST |
| `payload` | jsonb | normalized raw + resolved ids |
| `error_code` | text null | |
| `message` | text null | |
| Unique `(job_id, row_number)` | | |

**RLS:** `import_job_rows_admin` FOR ALL USING/WITH CHECK `is_admin()` — mirror jobs.
**Retention:** follow ASM-005; no automatic purge in PACK-003.
**Rollback:** forward-fix drop `import_job_rows`; drop new columns/checks.

Without migration: only possible with opaque JSON in `error_report_reference` — **rejected** as insufficient for double-confirm safety and count integrity.

---

## 10. UI dry-run (`/settings/imports/assignments`)

| State | Requirements |
|---|---|
| empty | CTA upload; link to template/help columns |
| file selected | show name/size; enable Upload |
| uploading / parsing | disable inputs; progress text |
| blocking file error | alert; retry = new file |
| validation complete / preview | table ≤200 rows; filter by status; full counts |
| warnings / row errors / conflicts | visible badges; no silent pass |
| NEW_MASTER | checkbox create-on-confirm (default OFF) |
| confirming | disable confirm; spinner |
| partial success | summary + download errors |
| complete success | summary |
| server failure | message + retry guidance |
| already confirmed | read-only protocol view |
| forbidden | non-admin |

**a11y:** `role="alert"` for errors; table headers; keyboard focus on confirm; don’t rely on color alone for CONFLICT vs ERROR.

---

## 11. Test plan review

| Scenario | In Architect T-003-*? | Classification |
|---|---|---|
| Valid `.xlsx` import | T-003-01 | Required during implementation |
| Unsupported extension | T-003-09 | Required during implementation |
| Oversized file | T-003-09 | Required during implementation |
| Missing required headers | implied | Required during implementation |
| Alias headers | implied | Required during implementation |
| Duplicate headers | **missing** | **Required during implementation** (blocker if omitted from pack) |
| Excel serial dates | implied §3 | Required during implementation |
| Invalid dates | implied | Required during implementation |
| Unknown / inactive vehicle | T-003-05/07 | Required during implementation |
| Create driver/customer on confirm | T-003-06 | Required during implementation |
| Create toggle OFF leaves NEW_MASTER unimported | **missing** | Required during implementation |
| Exact duplicate skip | T-003-04 | Required during implementation |
| Intra-file overlap | T-003-10 | Required during implementation |
| DB overlap at confirm race | partial T-003-03 | Required during implementation |
| Partial success | T-003-02 | Required during implementation |
| Double confirmation | **missing** | **Blocker before Apply** (must be in pack acceptance) |
| Viewer/manager denied | T-003-08 | Required during implementation |
| Malformed workbook | **missing** | Required during implementation |
| Formula cells | **missing** | Required during implementation |
| Summary count accuracy | **missing** | Required during implementation |
| Per-row persist isolation | **missing** | Required during implementation |
| FU-002 closure | N/A | Follow-up after acceptance (explicitly out) |

---

## 12. Architect-package quality — ambiguities

| Topic | Issue | Severity |
|---|---|---|
| ASM-011 | Limits still OPEN | Lock as ACCEPTED defaults for Apply |
| Transaction wording | Batch vs per-row conflict | **Mandatory correction** |
| Preview storage | Not explicit | **Mandatory correction** |
| Create-on-confirm default | Ambiguous | **Mandatory correction** |
| Kennzeichen normalize | Unspecified | **Mandatory correction** |
| Duplicate in-file rows | Unspecified | **Mandatory correction** |
| HTTP 422 | Listed in dry-run ask; not in AppError | Prefer no 422 — document |
| Status sprawl | uploaded/validated/previewed/importing | Simplify |
| `skipped_rows` | Mentioned vaguely | Migration column |
| Idempotency key | Clear for exact dup; plate normalize affects key | Tie to plate rules |
| File retention | OK (DB) | — |
| Formula handling | Missing | **Mandatory correction** |
| MIME/magic | Missing | **Mandatory correction** |
| exceljs approval | Missing | **Mandatory correction** (dependency gate) |

No contradiction with ADR-005/006 intent. FU-002-* correctly excluded.

---

## 13. Risks and stop conditions

| Stop / risk | Action |
|---|---|
| Dependency installed without approval | **STOP** |
| Migration skipped but confirm shipped | **STOP** — audit/CAS incomplete |
| Single all-or-nothing TX for all rows | **STOP** — violates ADR-007 |
| Vehicles auto-created | **STOP** |
| RLS write widened | **STOP** |
| FU-002 marked Done by this pack | **STOP** |
| Client-trusted row list on confirm | **STOP** |
| Local durable file store for uploads | **STOP** (Render ephemeral) |

New risks to record: RSK-013/014 already in register (Excel malware; name collision). Add dry-run finding: **RSK-015** confirm race / double submit without CAS.

---

## 14. Mandatory corrections before Apply

Architect (docs only) must update ADR-007 and/or PACK-003 to lock:

1. **Per-row persist units** + job CAS (not all-or-nothing batch TX).
2. **Migration required:** status check, `skipped_rows`, `import_job_rows`, confirm metadata; RLS admin-only.
3. **Preview persisted server-side;** confirm by `jobId` + options only; re-validate overlap/dup at confirm.
4. **AppError codes:** add `IMPORT_ALREADY_CONFIRMED` (409); optional `IMPORT_FILE_INVALID` (400); no 422 for row preview.
5. **Kennzeichen normalization** rule (recommend: trim, Unicode NFKC, uppercase, remove internal spaces).
6. **Create-new-masters default OFF.**
7. **Duplicate headers** = file-level fail; **duplicate identical data rows** = in-file exact-dup → one OK candidate + SKIP siblings or both CONFLICT — pick one and document.
8. **Formula policy:** cached/evaluated value only.
9. **MIME/extension/magic + size/row caps** binding; **ASM-011 → ACCEPTED** with 5 MiB / 2000 rows.
10. **Dependency:** explicit approve **`exceljs`** (or named alternative) before install.
11. Acceptance tests: double confirm, formula cells, count accuracy, create-toggle OFF.

## 15. Optional improvements

- Downloadable blank template `.xlsx`
- Content SHA display in protocol
- Progress for large confirms
- Employee-number match later (out of MVP)
- Manager read-only job list (ADR stretch — skip MVP)

## 16. Proposed implementation sequence (after corrections + Apply approval)

1. Human approve corrections + **exceljs**
2. Migration apply (remote) + verify RLS
3. Domain: normalize/parse/validate/idempotency + unit tests
4. Actions: preview/confirm/CAS/error report
5. UI wizard states
6. Integration tests (partial, overlap race, double confirm)
7. Gates test/lint/build → Builder Report → Architect review

---

## 17. Decisions summary

| Decision | Dry-run verdict |
|---|---|
| Dependency | **`exceljs` required** — await approval; do not install now |
| Migration | **Required** (§9) |
| Readiness | **READY_WITH_REQUIRED_CORRECTIONS** |
| FU-002-* | Untouched |

---

## Final Builder status

**PACK_003_DRY_RUN_READY_FOR_APPROVAL** (pending Architect corrections package, not Apply)

---

## Architect follow-up 2026-07-30

Corrections applied in `architecture/ADR-007.md` + `sprints/sprint-003/PACK-003.md` (and SoT mirrors).

Status: **PACK_003_CORRECTIONS_READY_FOR_APPROVAL** — Apply still blocked.
