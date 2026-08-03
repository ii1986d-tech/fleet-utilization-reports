# Architect Review — PACK-005 Evidence Closure

> Date: 2026-08-03
> Baseline: `master` @ **`dbe59da`** (pre-acceptance checkpoint)
> Mode: Independent Architect Review (documentation only at review time)
> Evidence artifact: `EVIDENCE-RUN-RESULTS.json`
> Suite: `node scripts/pack005-evidence/run-evidence-suite.mjs` (exit 0; 36 PASS / 1 PARTIAL / 0 FAIL)
> Recommendation: **ACCEPT_WITH_FOLLOW_UPS**
> Review status: **PACK_005_ARCHITECT_REVIEW_COMPLETE**
> Formal acceptance (subsequent authorized step): **PACK_005_ACCEPTED_WITH_FOLLOW_UPS** — see `ACCEPTANCE-RECORD.md`

---

## 1. Preflight

| Check | Result |
|---|---|
| Branch / HEAD | `master` / `dbe59da` |
| Staged | none |
| Product / test / migration diffs | none |
| Migrations Local == Remote | PASS (5 migrations) |
| `.env.local` ignored | PASS |
| Non-production documented | PASS (`nonProduction: true`, project ref sanitized) |
| Secrets in tracked diff | none found |

**Preflight: PASS**

---

## 2. Evidence integrity

| Claim | Independent recount |
|---|---|
| Total cases | **37** |
| PASS | **36** |
| PARTIAL | **1** (`FU-003-02/C14`) |
| FAIL | **0** |
| BLOCKED | **0** |
| Defects array | empty |

Integrity checks:

- Planned cases are not falsely labelled as live when classification is `unit` / `manual` / `remote database` / `live JWT` / `concurrency` as recorded.
- C14 explicitly classified **`unit`** + **PARTIAL** (not live).
- RLS JWT cases use `signInRole` / anon clients; service role used for fixture setup/inspect/cleanup only (reviewed in `run-evidence-suite.mjs`).
- Results JSON contains redacted ids only; no passwords/JWTs/keys observed.

**Evidence-integrity verdict: PASS**

---

## 3. FU-002-01 live JWT/RLS — **PROVEN**

Executed with admin / manager / viewer / unauthenticated clients:

| Area | Cases | Result |
|---|---|---|
| Vehicle / assignment reads | J01a, J01b, J06, J10r | PASS |
| Driver writes | J02 allow admin; J07/J10w deny | PASS |
| import_jobs read/write | J04/J04w admin; J08 manager deny | PASS |
| Anonymous denial | J11 select deny; J12 insert deny | PASS |
| RPC denial | J09 manager persist RPC | PASS |
| Actor identity | J16 `created_by` = admin `auth.uid()` | PASS |

**Verdict: PROVEN** — sufficient to recommend **CLOSE** for FU-002-01.
Residual note: matrix is PostgREST/RLS + RPC oriented (not full Next.js server-action E2E); acceptable for the FU contract (real Auth JWT users).

---

## 4. FU-002-03 — recommend **CLOSE**

- Live admin JWT insert bypassed app pre-check; DB exclusion rejected overlap.
- Mapped stable code **ASSIGNMENT_OVERLAP**; no assignment persisted.
- Cleanup: none persisted.

Note: HTTP 409 is produced by the shared app error mapper when the same exclusion surfaces through server actions; live evidence proves the DB + mapping signal. Prior unit coverage of `mapDatabaseError` remains complementary.

---

## 5. FU-002-04 — recommend **CLOSE**

- Assignment end via `valid_until` — row remained queryable.
- Master deactivate via `active=false` — row remained queryable.
- No hard DELETE observed.
- Aligns with ADR-006.

---

## 6. FU-002-05 — **CLOSE_WITH_RESIDUAL**

| Item | Finding |
|---|---|
| Overlap rejection | PASS (remote DB / live JWT) |
| ASSIGNMENT_OVERLAP mapping | PASS |
| `correctAssignment` `FOR UPDATE` | **GAP_DOCUMENTED** (static + review) |
| Integrity under concurrency | GiST exclusion remains authoritative |

**Realistic risk:** medium-low TOCTOU on correction under concurrent admins; DB exclusion still prevents illegal overlapping commits.

**Code correction required now?** **No** — not a release blocker for locked MVP.

**Separate follow-up?** Retain as **documented residual** on FU-002-05 (do not renumber). Optional future hardening pack if concurrent correction becomes a production concern.

**Verdict: CLOSE_WITH_RESIDUAL**

---

## 7. FU-002-06 — recommend **CLOSE**

| Fact | Evidence |
|---|---|
| Docker CLI | AVAILABLE |
| Docker daemon | UNAVAILABLE |
| Local Supabase | UNAVAILABLE |
| Remote dev DB | AVAILABLE |

Satisfies environment-note contract (RSK-009). Does **not** claim local DB execution.

---

## 8. FU-003-03 — recommend **CLOSE**

O01 / O02 / O03 all **PASS**, classification **remote database**:

- Orphan driver/customer counts 0; assignments 0.
- `ASSIGNMENT_OVERLAP` + `persistence_status=failed`.
- `statusOk`, `payloadOk`, `warningKept` true.
- Empirical failure injection via existing exclusion (not SQL-structure-only).

---

## 9. FU-003-02 — **CLOSE_WITH_RESIDUAL**

| Case | Result |
|---|---|
| C01 persisted | PASS |
| C03 DRIVER_NOT_FOUND | PASS |
| C04 create-missing | PASS |
| C05 reuse | PASS |
| C06 EXACT_DUPLICATE | PASS |
| C07 ASSIGNMENT_OVERLAP | PASS |
| C08 invalid blocked | PASS |
| C09 already processed | PASS |
| C10 CAS double-confirm | PASS |
| C02–C13 partial + completed_with_errors + counters | PASS |
| C12 completed | PASS |
| **C14 transport-failure remote inject** | **PARTIAL (unit)** |

**C14 analysis:**

- Not mandatory to force an artificial remote transport failure for FU-003-02 closure.
- Core confirm/persist/finalize/create-on/duplicate/overlap/counters proven on remote DB.
- Transport finalize correction already accepted in PACK-004 with dedicated unit suite (`confirm-transport.test.ts`, 11 tests).
- Forcing transport failure would be artificial and low incremental value.

**Verdict: CLOSE_WITH_RESIDUAL** (C14 unit residual accepted).

---

## 10. Concurrency

| Item | Result | Contract |
|---|---|---|
| FU-002-02 | PASS (`successes=1`, `failures=1`) | Accepted residual class — recommend **CLOSE** (evidence obtained) or retain as closed residual |
| OQ-004-04 | PASS (`winners=1`, `finalStatus=confirming`) | BEST-EFFORT — recommend **CLOSE** / satisfied |

`finalStatus=confirming` expected for isolated CAS-only probe; fixtures cleaned afterward (cleanup PASS + independent verify).

**Concurrency verdict: PASS (BEST-EFFORT / residual contracts respected)**

---

## 11. Cleanup

Suite CLEANUP PASS (drivers/customers/vehicles/assignments = 0).
Independent `verify-cleanup.mjs` also reports **0** for import_jobs and broad `p5ev_%`.

Auth test users: **intentionally retained** for repeatable evidence (`ACCESS-VERIFICATION.md`).

**Cleanup verdict: COMPLETE_WITH_RETAINED_TEST_IDENTITIES**

---

## 12. Security

| Check | Result |
|---|---|
| Secrets in tracked artifacts | none observed |
| Complete JWTs | none |
| Service key exposure | none |
| Production data | not used |
| Service role role | fixtures/inspect/cleanup only |
| `.env.local` ignored | PASS |
| Raw SQL leakage in evidence | not present as user-facing codes (stable codes only) |

**Security verdict: PASS**

---

## 13. Validation gates

| Gate | Result |
|---|---|
| `npm test` | **PASS** (63/63) |
| `npm run lint` | **PASS** (0 errors; tooling warning fixed in verify-cleanup) |
| `npm run build` | **PASS** |
| `git diff --check` | PASS (no trailing-whitespace hits in review pass) |
| JSON validity | PASS (`EVIDENCE-RUN-RESULTS.json`) |
| Migration Local == Remote | **PASS** |
| Secret scan | PASS |
| p5ev_* cleanup verify | **PASS** |

---

## 14. Follow-up recommendations (Architect)

| ID | Original requirement | Evidence | Strength | Result | Residual risk | Closure recommendation |
|---|---|---|---|---|---|---|
| FU-002-01 | Live JWT RLS | J01–J12, J09, J16 | live JWT | PASS | Low (no full browser E2E) | **CLOSE** |
| FU-002-02 | Parallel race harness | concurrency 1/1 | concurrency | PASS | Low | **CLOSE** |
| FU-002-03 | DB-bypass → ASSIGNMENT_OVERLAP | live insert reject | live JWT + DB | PASS | Low | **CLOSE** |
| FU-002-04 | End/deactivate preserve | live JWT | live JWT | PASS | Low | **CLOSE** |
| FU-002-05 | FOR UPDATE hardening | overlap PASS + gap documented | remote DB + static | PASS + residual | Med-low TOCTOU | **CLOSE_WITH_RESIDUAL** |
| FU-002-06 | Docker env note | manual | manual | PASS | Low (env) | **CLOSE** |
| FU-003-02 | Confirm suite | C01–C13 remote; C14 unit | remote DB + unit | PASS + PARTIAL | Low | **CLOSE_WITH_RESIDUAL** |
| FU-003-03 | Orphan rollback | O01–O03 | remote DB | PASS | Low | **CLOSE** |
| OQ-004-04 | BEST-EFFORT CAS | winners=1 | concurrency | PASS | Low | **SATISFIED / CLOSE** |

Formal FU status flips were applied at **PACK-005 acceptance** (`ACCEPTANCE-RECORD.md`, 2026-08-03) exactly as recommended below.

---

## 15. Production-readiness (locked MVP scope)

Locked scope after PACK-001…004: auth, masters, assignments, Excel import (no reports UI, no Frotcom, no exports).

Considering:

- Live JWT RLS proven
- Remote persist / orphan rollback proven
- C14 unit residual acceptable
- FOR UPDATE gap residual acceptable (constraint-backed)
- Local Docker unavailable (documented; remote substitute used)
- Concurrency BEST-EFFORT satisfied

**Verdict: production-ready with documented residuals** for the locked MVP slice.

---

## 16. Mandatory corrections

**None.** No `TARGETED_CORRECTION_REQUIRED`.

---

## 17. Recommendation

**ACCEPT_WITH_FOLLOW_UPS**

Follow-ups at acceptance time should be recorded as:

- Closed: FU-002-01, FU-002-02, FU-002-03, FU-002-04, FU-002-06, FU-003-03, OQ-004-04 (satisfied)
- Closed with residual: FU-002-05 (FOR UPDATE gap), FU-003-02 (C14 unit residual)

Formal acceptance + git checkpoint were authorized and completed after this review (`ACCEPTANCE-RECORD.md`; commit message `test: complete PACK-005 evidence closure`).
