# Architect Review — PACK-003

> Formal review 2026-07-30 · Baseline PACK-002 `21ab8aa`
> Reviewed against ADR-007 (corrected), ADR-005/006, pack package, Builder Report
> Product code / migrations / packages **not** modified during review

## Recommendation

**ACCEPT_WITH_FOLLOW_UPS**

## Verdicts

| Area | Verdict |
|---|---|
| Scope | **PASS** — `.xlsx` assignment import only; no Frotcom/PACK-004/vehicle auto-create/CSV |
| Architecture | **PASS WITH FOLLOW-UPS** — ADR-005/006/007 intent met; a few binding UX/audit gaps |
| Dependency | **PASS** — exceljs **4.4.0** only; server-side parse; no second library |
| Migration | **PASS** — protocol + `import_job_rows` + admin RLS + CAS RPC (`SECURITY INVOKER`) |
| Security / RLS | **PASS WITH FOLLOW-UPS** — admin `requireAdmin` + RLS; live JWT smoke missing |
| API | **PASS** — AppError codes include 400/401/403/404/409/413/422/500 |
| UI | **PASS WITH FOLLOW-UPS** — core states present; no error-report download |
| Tests | **PASS WITH FOLLOW-UPS** — 38 automated; many §12 scenarios unit/partial only |
| Gates | **PASS** — independent 38/38, lint, build, `git diff --check` |

---

## 1. Scope compliance — PASS

In scope present: upload/parse/validate/server preview/confirm/per-row persist/summary/admin UI.

Absent as required: `.xls`/`.xlsm`/CSV, vehicle auto-create, live Frotcom, general importer, PACK-004.

---

## 2. Dependency — PASS

| Check | Evidence |
|---|---|
| Version | `exceljs@4.4.0` (`package.json` / lockfile / `require('exceljs/package.json').version`) |
| Imports | `src/lib/imports/assignments/parse.ts`, `tests/imports/parse.test.ts` only |
| Client | UI does not import exceljs; actions are `"use server"` |
| Formulas | Required fields reject formulas; cached result nulled when formula present |

**Finding F-003-01 (Low):** `workbook.xlsx.load(buffer as any)` — typing escape; no security impact. *Follow-up polish.*

---

## 3. Migration — PASS

File: `supabase/migrations/20260730153000_import_jobs_protocol.sql`

| Item | Result |
|---|---|
| Protocol columns | Present (source_*, counters, confirm fields, options, config version) |
| Status CHECK | uploaded…failed as specified |
| `import_job_rows` | UNIQUE (job, row); CASCADE job FK; SET NULL assignment/driver/customer |
| RLS | `import_job_rows_admin` admin-only; existing `import_jobs_admin` retained |
| CAS RPC | `begin_import_job_confirm` — **SECURITY INVOKER** (good); grants to authenticated/service_role |
| Search path | Not pinned on function — **F-003-02 Low** hardening follow-up |
| Remote | Builder evidence: Local==Remote; dry-run up to date (accepted) |

No PACK-001/002 policy weakening observed.

---

## 4. State machine & CAS — PASS WITH NOTES

| Check | Result |
|---|---|
| CAS `validated`→`confirming` | Atomic UPDATE…WHERE status='validated' |
| Concurrent loser | App maps empty RPC result → **409 IMPORT_ALREADY_CONFIRMED** |
| No reopen completed | Enforced by CAS predicate |

**Finding F-003-03 (Medium / doc drift):** Upload inserts jobs directly as `status='validated'`, skipping durable `uploaded`/`parsed` transitions. Allowed statuses exist in DB CHECK but intermediate states are unused. *Accepted residual / document as implemented shortcut OR implement later.*

---

## 5. Server-stored preview — PASS

Confirm schema: `{ jobId, createNewMasters? }` only. Rows loaded from `import_job_rows`. Client cannot supply assignment rows.

---

## 6–8. File / headers / dates / plates / masters — PASS

Parse enforces extension, magic, size, row cap, single non-empty sheet. Headers aliases + duplicate reject. Dates ISO/DE/unambiguous slash + serial. Plate normalize matches ADR-007. Create masters default OFF; vehicles never created.

**Finding F-003-04 (Medium):** Driver/customer create and assignment insert are **separate** statements (not one DB transaction). Orphan master possible if insert fails after create. *Required follow-up:* wrap per-row create+insert in one TX/RPC.

---

## 9. Idempotency — PASS

`source_sha256` + `import_config_version` (`p003-v1`) stored. Exact assignment skip at confirm. Double confirm → 409.

---

## 10. Per-row persistence — PASS WITH FOLLOW-UP

Loop isolates row outcomes; exclusion mapped via `mapDatabaseError`. Terminal `completed` vs `completed_with_errors` set from counters.

See F-003-04 for master+assignment atomicity.

**Finding F-003-05 (Low):** Persist failure `markRow` may overwrite `validation_errors` with persist-only errors (preview errors can be lost). Prefer append. *Follow-up.*

---

## 11. API — PASS

`AppError` extended with IMPORT_* codes and correct HTTP mapping. Preview returns structured job/rows; confirm returns summary.

---

## 12. Security — PASS WITH FOLLOW-UPS

Admin-only actions + RLS. No service-role in browser. Filename sanitized basename.

| Gap | Classification |
|---|---|
| No live JWT RLS Auth smoke | **Accepted residual risk** + **required follow-up** (align FU-002-01 / RSK-012) |
| Multi-client confirm race harness | **Accepted residual risk** (CAS RPC is intended boundary; RSK-015) |

Neither is an acceptance **blocker** given admin RLS + CAS SQL.

---

## 13. UI — PASS WITH FOLLOW-UPS

`/settings/imports` hub + `/settings/imports/assignments` cover empty/selected/upload/preview/confirm/done/error/retry; create-masters checkbox default OFF; counters shown.

**Finding F-003-06 (High → follow-up, not blocker):** **No downloadable error-report `.xlsx`** despite Anweisungen §7.2 / PACK-003 objectives / blueprint `report.ts`. Errors are visible in UI table. *Required follow-up FU-003-01 before treating TASK-008 as fully closed.*

**Finding F-003-07 (Low):** Confirm button not disabled after click beyond `useTransition` pending; CAS still protects. *Optional UI lock polish.*

---

## 14. Test review

| Evidence class | Coverage |
|---|---|
| Unit | Plates, dates, headers, overlap helpers, error HTTP, parse happy/unhappy paths |
| Integration (live Auth/DB confirm) | **Missing** for most §12 confirm/CAS/partial/master-create scenarios |
| Live remote schema | Migration list / policies verified in Apply evidence |

Independent Architect re-run: **38/38 PASS**.

| Gap | Classification |
|---|---|
| Missing multi-client race harness | Accepted residual risk |
| Missing live JWT RLS | Accepted residual risk / required follow-up |
| Missing automated confirm/partial/create-on paths | **Required follow-up** FU-003-02 |
| Missing error-report generation test | Tied to FU-003-01 |

---

## 15. Validation gates (Architect-independent)

| Gate | Result |
|---|---|
| `npm test` | **38/38 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |
| exceljs version | **4.4.0** |

---

## 16. Documentation / FU-002

PACK-003 not marked ACCEPTED before this review. FU-002-01…06 remain on RSK-012 / TASK-012…016 — **not absorbed**.

---

## Findings summary

| ID | Severity | Component | Ref | Impact | Next |
|---|---|---|---|---|---|
| F-003-01 | Low | parse.ts `as any` | NFR typing | None | Polish |
| F-003-02 | Low | CAS function search_path | Hardening | None | Follow-up |
| F-003-03 | Medium | Job status skips uploaded/parsed | ADR-007 D15 | Doc/impl drift | Document or implement |
| F-003-04 | Medium | Master create + insert not one TX | ADR-007 create rules | Orphan masters | Required follow-up |
| F-003-05 | Low | markRow overwrites errors | Audit | Audit loss | Follow-up |
| F-003-06 | High* | No error XLSX download | §7.2 / pack | Incomplete FR | **Required follow-up FU-003-01** |
| F-003-07 | Low | Confirm UI lock | UX | Race mitigated by CAS | Optional |

\*High vs Anweisungen download requirement; mitigated by on-screen row errors → accept with mandatory follow-up rather than rework.

---

## Residual-risk classification

| Item | Class |
|---|---|
| Live JWT RLS smoke | Accepted residual + required follow-up |
| Multi-client confirm harness | Accepted residual (CAS present) |
| Error report download | **Required follow-up** (FU-003-01) |
| Broader confirm/partial automated tests | Required follow-up (FU-003-02) |
| Per-row master+assignment TX | Required follow-up (FU-003-03) |
| Local Docker unavailable | Environment note (RSK-009) |

---

## Acceptance evidence

- exceljs 4.4.0 server-only
- Migration `20260730153000` applied; histories match; dry-run up to date
- CAS RPC + IMPORT_ALREADY_CONFIRMED
- Server-stored preview; confirm jobId-only
- Per-row persist; ADR-005 helpers + exclusion
- Admin-only; RLS not widened
- Gates 38/38 + lint + build

## Formal acceptance outcome

- Status: **PACK_003_ACCEPTED_WITH_FOLLOW_UPS** (2026-07-30)
- Checkpoint: **PACK_003_CHECKPOINT_READY** (commit not created)
- Record: `ACCEPTANCE-RECORD.md`
- FU-003-01…03 tracked (RSK-016); FU-002-01…06 remain on RSK-012
- Do **not** start PACK-004 until separate start approval

## Final Architect status

**PACK_003_ARCHITECT_REVIEW_ACCEPTED_WITH_FOLLOW_UPS** → formal acceptance **PACK_003_ACCEPTED_WITH_FOLLOW_UPS**
