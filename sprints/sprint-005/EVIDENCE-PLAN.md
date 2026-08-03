# Evidence Plan — PACK-005

> Status: **PLANNED** — nothing executed
> Baseline: `dbe59da`
> Environments: non-production only

All cases below are **planned** until Apply executes them and `EVIDENCE-LOG.md` is updated.

---

## Shared prerequisites

| Need | Notes |
|---|---|
| Migration state | Local == Remote (incl. `20260730170000`) — verify before Apply |
| Supabase URL | Development project only |
| Anon key | Browser / user-JWT client paths |
| Service role | **Server inspection / fixture setup only** — never as end-user RLS proof |
| Test users | Distinct Auth users with `app_metadata.role` ∈ {admin, manager, viewer} |
| DB inspection | SQL select for counters, orphans, RLS denials |
| Namespace | Prefix fixtures e.g. `p5ev_*` plates/names; cleanup required |
| Concurrency runner | Optional second client/process for OQ-004-04 / FU-002-02 |
| Local Docker | Optional; FU-002-06 documents absence if unavailable |

### Evidence completable without remote (if local Supabase available)

- FU-003-02 confirm suite
- FU-003-03 orphan rollback
- FU-002-03/04 (DB-level)
- FU-002-05 review (docs/code inspection — no env)
- FU-002-06 documentation

### Evidence typically requiring Auth JWT users (remote or local Auth)

- FU-002-01 full live matrix
- App-layer 409 mapping portions of FU-002-03
- Admin confirm path portions of FU-003-02 if exercised via app actions

---

## A. Follow-up contracts (full)

### FU-002-01 — Live JWT RLS matrix

| Field | Value |
|---|---|
| Origin | PACK-002 / RSK-012 / TASK-012 |
| Claim | Real JWT identity enforces admin write allow + manager/viewer/unauth deny for protected tables and RPCs |
| Environment | Remote (or local) Auth + DB with RLS enabled |
| Actor/roles | admin, manager, viewer, unauthenticated |
| Setup | Create/ensure 3 Auth users with correct `app_metadata.role`; prepare disposable fixtures owned by admin |
| Evidence artifact | `EVIDENCE-LOG.md` section FU-002-01 + raw result notes (no secrets) |
| Pass | All mandatory scenarios pass expected allow/deny |
| Fail | Any unexpected allow for non-admin write, or admin unexpectedly denied on allowed path |
| Closure | **Mandatory** for production-ready claim |
| Release impact | Conditional blocker |
| Cleanup | Delete/deactivate `p5ev_*` fixtures; do not leave elevated test users undocumented |

#### Scenario matrix

| ID | JWT | Operation | Expected HTTP/DB | Stored effect | Capture |
|---|---|---|---|---|---|
| J01 | admin | SELECT vehicles/drivers/customers/assignments | Allow | Read only | status + row count |
| J02 | admin | INSERT/UPDATE/deactivate master (driver/customer/vehicle) | Allow | Row changed | before/after |
| J03 | admin | Assignment create / end / correct | Allow | Row changed; no hard delete | row still queryable on end |
| J04 | admin | import_jobs / import_job_rows SELECT+write | Allow | As designed | policy + action result |
| J05 | admin | `persist_assignment_import_row` / `begin_import_job_confirm` as admin JWT | Allow when preconditions met | Persist/CAS per ADR-008 | RPC JSON + row states |
| J06 | manager | SELECT masters/assignments | Allow | Read | |
| J07 | manager | Write masters/assignments (direct table or app action) | Deny / FORBIDDEN | No change | error code |
| J08 | manager | import_jobs / import_job_rows any | Deny | No change | |
| J09 | manager | RPC persist / begin_confirm | Deny (is_admin / RLS) | No persist | RPC/app error |
| J10 | viewer | Same as manager read/write matrix | Read allow; write deny | No write | |
| J11 | unauthenticated (anon, no session) | SELECT/WRITE protected tables | Deny | No change | |
| J12 | unauthenticated | RPC execute | Deny / auth required | No change | |
| J13 | any user JWT | Browser path must not use service_role | N/A | N/A | Confirm client uses anon key only |
| J14 | admin | Soft-delete / end assignment | Allow; row remains | `valid_until` or active flag; row SELECTABLE | |
| J15 | admin | Overlap assignment write | 409 / ASSIGNMENT_OVERLAP | No illegal second active overlap | |
| J16 | actor check | Persisted assignment `created_by` / confirm actor | Equals `auth.uid()` of admin | Identity match | uid compare |

**Service-role exclusion:** Fixture setup may use service role. **Pass criteria for RLS claim must use user JWTs (anon + user session).**

---

### FU-002-02 — Parallel assignment race harness

| Field | Value |
|---|---|
| Origin | PACK-002 / RSK-012 / TASK-013 |
| Claim | Two parallel overlapping assignment writes → ≤1 success; loser constraint/409 |
| Environment | DB with exclusion constraint; two parallel clients |
| Closure | **Optional residual** (accepted residual risk) |
| Release impact | No blocker if residual signed |
| Pass | ≤1 insert success; loser fails cleanly |
| Fail | Two overlapping rows both committed |

---

### FU-002-03 — Live DB-bypass → 409 ASSIGNMENT_OVERLAP

| Field | Value |
|---|---|
| Origin | PACK-002 / TASK-014 |
| Claim | Bypassing app pre-check still hits GiST exclusion; app maps to HTTP 409 `ASSIGNMENT_OVERLAP` where app path used |
| Environment | Local or remote DB + admin app path |
| Setup | Existing assignment; attempt overlapping insert via raw SQL (admin JWT or constrained path) **and** via app create |
| Pass | Constraint rejects; app path returns 409 `ASSIGNMENT_OVERLAP` |
| Fail | Overlap stored, or wrong/leaky error |
| Closure | **Mandatory** for production-ready claim |
| Cleanup | Remove test assignments |

---

### FU-002-04 — End/deactivate row preservation

| Field | Value |
|---|---|
| Origin | PACK-002 / TASK-015 |
| Claim | End/deactivate does not hard-DELETE; row remains queryable |
| Environment | Local or remote DB + admin |
| Setup | Create assignment; call end/deactivate path |
| Pass | Row still SELECTABLE; historical fields intact |
| Fail | Row missing / hard DELETE observed |
| Closure | **Mandatory** |
| Cleanup | Leave ended row or soft-clean namespace |

---

### FU-002-05 — ADR-006 correction locking review

| Field | Value |
|---|---|
| Origin | PACK-002 / TASK-016 |
| Claim | Correction path locking reviewed against ADR-006; gap documented or targeted fix authorized |
| Environment | Code/SQL inspection; optional concurrent correct test |
| Setup | Read `correctAssignment` + related SQL |
| Pass | Written review in EVIDENCE-LOG; either PROVEN / GAP_DOCUMENTED / FIX_AUTHORIZED |
| Fail | Silent assumption without record |
| Closure | **Mandatory review**; code change only if authorized after gap |
| Note | Import RPC already uses `FOR UPDATE` on job/row; this FU targets **assignment correction** path |

---

### FU-002-06 — Local Docker unavailability

| Field | Value |
|---|---|
| Origin | PACK-002 / RSK-009 |
| Claim | Environment limitation documented; remote validation remains substitute |
| Environment | Builder workstation |
| Pass | Note recorded: Docker/WSL available **or** unavailable with remote substitute used |
| Closure | **Document** (not a product defect) |
| Release impact | No blocker |

---

### FU-003-02 — Database confirmation suite

| Field | Value |
|---|---|
| Origin | PACK-003 / RSK-016 / TASK-018 |
| Claim | Real confirm flow matches ADR-008 vocab, counters, CAS, create-on, duplicate/overlap, finalize |
| Environment | **Prefer both** local Supabase and remote development DB; minimum one non-prod DB |
| Actor | Admin JWT (or admin session via app actions); inspection via SQL |
| Closure | **Mandatory** for production-ready claim |
| Cleanup | Delete `p5ev_*` jobs/rows/assignments/masters created for suite |

#### Cases

| Case | Claim | Local | Remote | Expected |
|---|---|---|---|---|
| C01 | Valid row persistence | Y | Y | `persisted`; assignment exists; validation_* unchanged |
| C02 | Partial success | Y | Y | Some persisted, some failed; job `completed_with_errors`; counters from stored states |
| C03 | Create-missing OFF | Y | Y | Missing driver/customer → `failed` DRIVER/CUSTOMER_NOT_FOUND; no master create |
| C04 | Create-missing ON | Y | Y | New active master created; assignment persisted |
| C05 | Normalized master reuse | Y | Y | Existing normalized name reused; no duplicate master |
| C06 | Exact duplicate → skipped | Y | Y | `skipped` + EXACT_DUPLICATE; no second assignment |
| C07 | Overlap → failed | Y | Y | `failed` + ASSIGNMENT_OVERLAP; no illegal assignment |
| C08 | Invalid row not persisted | Y | Y | invalid rows never become assignments |
| C09 | Processed row not reprocessed | Y | Y | Second persist attempt protected |
| C10 | Double confirm protection | Y | Y | Second confirm → 409 `IMPORT_ALREADY_CONFIRMED` (or equivalent) |
| C11 | Counters from stored states | Y | Y | success/failed/skipped match row persistence_status; pending never counted as failed |
| C12 | Job `completed` | Y | Y | All attempted valid rows succeeded/skipped cleanly |
| C13 | Job `completed_with_errors` | Y | Y | At least one failed persist with completed_with_errors |
| C14 | Transport-failure persisted failure path | Y* | Y* | Where realistically injectable: row `failed` + safe PERSISTENCE_FAILED; no silent pending finalize (*unit already covers; DB inject optional) |

---

### FU-003-03 — Empirical orphan-rollback proof

| Field | Value |
|---|---|
| Origin | PACK-003 / RSK-016 / TASK-019 |
| Claim | Newly created driver and/or customer roll back if assignment persistence fails inside RPC subtransaction; no orphan masters; no surviving assignment; import row safe failed state; validation_* unchanged |
| Environment | Non-prod DB (local and/or remote) |
| Closure | **Mandatory** — SQL structure alone is **not** empirical proof |
| Cleanup | Ensure no leftover `p5ev_*` masters/assignments |

#### Safest failure injection (preferred)

Use **existing exclusion constraint** after create-on:

1. Seed vehicle + overlapping existing assignment.
2. Confirm row with **create-missing driver ON** (unique new `p5ev_*` driver name) and period that overlaps.
3. RPC enters subtransaction, creates driver, then `INSERT` hits `exclusion_violation`.
4. Expect: **no** new driver row; **no** new assignment; import row `failed` + `ASSIGNMENT_OVERLAP`; `validation_status` / `validation_errors` unchanged.

| Case | Injection | Expect |
|---|---|---|
| O01 | Create driver ON + overlap | Driver rolled back; assignment absent; row failed OVERLAP |
| O02 | Create customer ON + overlap | Customer rolled back; assignment absent; row failed OVERLAP |
| O03 | Create both ON + overlap | Both rolled back; assignment absent |
| O04 | Unexpected exception path | Prefer controlled fixture if available without schema change; else document **blocked/not_executed** with reason — do **not** invent migrations. Overlap cases O01–O03 are the primary mandatory empirical proof. |

**Do not** claim PASS from reading PL/pgSQL alone.

---

### OQ-004-04 / concurrent confirm CAS (related; not FU-002-06)

| Field | Value |
|---|---|
| Origin | PACK-004 / RSK-015 / OQ-004-04 BEST-EFFORT |
| Claim | Two confirm attempts on same job: only one obtains confirming transition; other deterministic rejection; no duplicate row processing; counters consistent; no duplicate assignments |
| Closure | **Desirable** — may remain open residual with sign-off |
| Release impact | No hard blocker if BEST-EFFORT residual documented |
| Setup | Job in `validated`; two nearly simultaneous confirm calls (admin JWT) |
| Pass | One confirming winner; loser 409/IMPORT_ALREADY_CONFIRMED (or documented equivalent); single processing; consistent counters |
| Fail | Double processing / duplicate assignments / inconsistent counters |

---

## B. Execution order (recommended)

1. FU-002-06 document env
2. FU-002-05 locking review (docs/code; no env)
3. FU-002-04 row preservation (DB)
4. FU-002-03 bypass → 409 (DB + app)
5. FU-003-03 orphan rollback (DB) — before broad confirm suite pollution
6. FU-003-02 confirm suite (DB)
7. FU-002-01 live JWT matrix (Auth)
8. OQ-004-04 concurrent CAS (optional/best-effort)
9. FU-002-02 assignment race (optional residual)

### Parallelizable

- FU-002-05 review ∥ FU-002-06 docs
- After fixtures isolated: FU-002-04 ∥ parts of FU-002-03
- JWT matrix after users exist can run in parallel with remaining optional concurrency

### Dependencies

- Auth test users before FU-002-01
- Migration equality before DB suites
- Create-on fixtures before FU-003-03
- Do not run destructive cleanup until case evidence captured
