# PACK-005 Evidence Dry-Run

> Date: 2026-07-30
> Mode: **Feasibility / environment readiness only** — no evidence suite executed
> Baseline: `master` @ **`dbe59da`**
> Status: **PACK_005_EVIDENCE_DRY_RUN_COMPLETE**
> Recommendation: **READY_WITH_MISSING_ACCESS**

---

## 1. Preflight

| Check | Result |
|---|---|
| Branch | `master` |
| HEAD | `dbe59da` |
| Staged | **none** |
| Product / test / migration changes | **none** (empty `git status` on `src` `app` `tests` `supabase` packages) |
| Working tree | Documentation only: prior PACK-005 Architect prep + this dry-run |
| Migrations Local == Remote | **PASS** (five migrations including `20260730170000`) |
| PACK-005 product implementation | **Absent** |
| Frotcom product work | **Absent** (mocks under `src/lib/frotcom` only) |

**Preflight: PASS**

---

## 2. Repository-contract corrections

Plan largely matches the repository. Corrections / clarifications for Apply:

| Topic | Plan assumption | Actual contract | Action for Apply |
|---|---|---|---|
| Roles | admin / manager / viewer | Confirmed: `app_metadata.role` only (`docs/AUTH-ROLES.md`, `current_app_role()`). **No profile-table role source.** | Keep JWT claim path |
| Master soft-delete | “soft-delete” | Masters: `active = false` via `deactivate*`. Assignments: **end** sets `valid_until` — **no hard DELETE** (ADR-006). | Split J14 into master deactivate vs assignment end |
| Import read (manager/viewer) | Deny writes | RLS: `import_jobs` / `import_job_rows` are **admin-only for all ops** — manager/viewer cannot SELECT either | Keep J08; do not expect import read for non-admin |
| Create-missing flags | Driver/customer ON/OFF | App `confirmAssignmentImport` uses single `createNewMasters` → both `p_create_missing_driver` and `p_create_missing_customer` | Use **direct RPC** for independent orphan cases O01/O02; app path OK for paired ON/OFF |
| Exact duplicate code | skipped + EXACT_DUPLICATE | RPC returns `EXACT_DUPLICATE`; validation warning may be `EXACT_DUPLICATE_CANDIDATE` | Assert RPC/persistence codes, not preview-only codes |
| Double confirm | 409 IMPORT_ALREADY_CONFIRMED | CAS returns empty row → app maps to `IMPORT_ALREADY_CONFIRMED`; RPC also requires `p_user_id = auth.uid()` | Prove via app action **or** second CAS RPC as same admin JWT |
| Vehicle create | N/A | Import **never** creates vehicles | Fixtures must pre-create vehicles |
| begin_import grants | authenticated + service_role | Confirmed; service_role must not prove end-user RLS | Fixture setup only |
| Error codes | ASSIGNMENT_OVERLAP, DRIVER_NOT_FOUND, CUSTOMER_NOT_FOUND, PERSISTENCE_FAILED | Confirmed in RPC + `src/lib/assignments/errors.ts` | Keep |

**Verdict:** No REPOSITORY_RECONCILIATION_REQUIRED. Minor plan clarifications only (recorded here; EVIDENCE-PLAN remains valid with these notes).

---

## 3. Environment availability matrix

| Prerequisite | Classification | Notes (no secrets) |
|---|---|---|
| Node.js | AVAILABLE | v24.18.0 |
| npm / npx | AVAILABLE | npm 11.16.0 |
| Vitest | AVAILABLE | 3.2.7; `npm test` scripts present |
| PowerShell concurrency | AVAILABLE | PS 5.1; jobs/runspaces usable |
| Supabase CLI (via npx) | AVAILABLE | 2.110.0 |
| Supabase CLI (global) | MISSING | Not required if npx works |
| Linked non-prod project | AVAILABLE | `supabase/.temp/project-ref` + `linked-project.json` present |
| Remote DB connectivity (CLI) | AVAILABLE | `npx supabase migration list` connects; Local==Remote |
| SQL execution capability (CLI) | AVAILABLE_BUT_UNVERIFIED | `supabase db` / inspect present; not exercised mutably in dry-run |
| Docker CLI | AVAILABLE_BUT_UNVERIFIED | CLI 29.6.2 present |
| Docker daemon | MISSING / BLOCKED | `Docker Desktop is unable to start` |
| Local Supabase API (`:54321`) | MISSING | Not running |
| Workspace `.env` / `.env.local` | MISSING | No app-runtime env files in workspace |
| `.env.example` keys documented | AVAILABLE | URL, anon, service_role placeholders |
| Anon-key configuration (process) | MISSING | Not present in workspace env files |
| Service-role configuration (process) | MISSING | Not present in workspace env files |
| Database cleanup capability | AVAILABLE_BUT_UNVERIFIED | Depends on admin JWT or service-role for fixture delete once credentials supplied |
| Test-user identities (admin/manager/viewer) | MISSING | Not discoverable in repo; not verified in Auth |
| Unauthenticated test path | AVAILABLE | Anon client without session (once URL+anon exist) |
| Node test runner for unit (non-live) | AVAILABLE | Existing unit suite only; no live DB suite yet |
| Production credentials | NOT_REQUIRED | Forbidden |

---

## 4. Access model review

| Question | Finding |
|---|---|
| Role source | JWT `app_metadata.role` only |
| Mapping | `parseRoleFromAppMetadata` + SQL `current_app_role()` / `is_admin()` / `is_authenticated_role()` |
| `auth.uid()` | Required by CAS (`p_user_id` must match) and persist RPC actor / `created_by` |
| Reusable non-prod users | **Not verified** — none documented in repo |
| Temporary users | Possible via Supabase Dashboard or Admin API with service role (human-supplied); must set `app_metadata.role` |
| Cleanup users | Possible via Dashboard/Admin API; fixtures cleaned by namespaced deletes |
| Email confirm / MFA | Unknown for target project — **must verify before Apply**; if confirm required, pre-confirm test users |
| Service role as RLS proof | **Forbidden** — setup/inspect only |

**Access requirements before mandatory evidence execution**

1. Non-production Supabase URL + anon key available to the evidence runner (env not committed)
2. Service role available **only** for fixture bootstrap/inspect/cleanup (optional if admin JWT can seed all fixtures)
3. Three Auth users with roles `admin`, `manager`, `viewer` (confirmed, no blocking MFA for scripted sign-in)
4. Confirmation that linked project is the approved **development** project (not production)
5. Cleanup rights for `p5ev_*` rows

---

## 5. FU feasibility matrix

| ID | Claim (short) | Class | Env needed | Access now | Missing | Safest method | Fixtures | Cleanup | Artifact | Est. | Feasibility |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FU-002-01 | Live JWT RLS allow/deny | Mandatory | Remote Auth+DB | Linked DB CLI | Anon/env, 3 users | Supabase JS as each user JWT | `p5ev_*` masters/assignments/jobs | Reverse-delete namespace | EVIDENCE-LOG | 2–4h | **BLOCKED** (access) |
| FU-002-02 | Parallel assignment race | Optional residual | DB + 2 clients | Partial | Anon+admin JWT | 2 parallel inserts | Overlapping periods | Delete assignments | EVIDENCE-LOG | 30–60m | **PARTIALLY_READY** |
| FU-002-03 | Bypass → 409 OVERLAP | Mandatory | DB + admin app/RPC | CLI link | Admin JWT / anon | Seed + overlapping insert via PostgREST/app | Vehicle+assignment | Delete | EVIDENCE-LOG | 30–60m | **PARTIALLY_READY** |
| FU-002-04 | End/deactivate preserve | Mandatory | DB + admin | CLI link | Admin JWT | `endAssignment` / deactivate + SELECT | One assignment + one master | Keep ended or delete namespace | EVIDENCE-LOG | 20–40m | **PARTIALLY_READY** |
| FU-002-05 | Correction locking review | Mandatory review | Repo only | AVAILABLE | — | Code/SQL inspection note | None | N/A | EVIDENCE-LOG review | 30–60m | **READY** |
| FU-002-06 | Docker env note | Document | Workstation | AVAILABLE | — | Record Docker Desktop unable to start | None | N/A | EVIDENCE-LOG | 5–10m | **READY** |
| FU-003-02 | Confirm DB suite | Mandatory | Non-prod DB | CLI link | Admin JWT (+ anon) | Direct RPC + app confirm combo | Jobs/rows/vehicles/masters | Namespace purge | EVIDENCE-LOG | 3–6h | **PARTIALLY_READY** |
| FU-003-03 | Orphan rollback empirical | Mandatory | Non-prod DB | CLI link | Admin JWT | Create-on + forced overlap | Unique names + overlap seed | Verify no orphans + purge | EVIDENCE-LOG | 1–2h | **PARTIALLY_READY** |
| OQ-004-04 | Concurrent confirm CAS | Desirable BEST-EFFORT | Admin JWT ×2 | Partial | Users/env | Dual confirm race | One validated job | Job cleanup | EVIDENCE-LOG | 30–60m | **PARTIALLY_READY** |

---

## 6. Live JWT/RLS execution readiness

**Overall: NOT READY TO EXECUTE** — missing workspace anon/URL env and verified role users.

### How JWTs will be obtained (Apply plan)

| Identity | Obtain | Client |
|---|---|---|
| admin / manager / viewer | `signInWithPassword` (or magic link if required) against non-prod Auth using anon key | `@supabase/supabase-js` evidence runner |
| unauthenticated | Anon key, no `signIn` | Same client, no session |

### Matrix feasibility (contracts OK; execution blocked on access)

| Case | Op | Expect | Side effect | Inspect | Cleanup |
|---|---|---|---|---|---|
| J01 admin SELECT masters/assignments | select | allow | none | count ≥0 | — |
| J02 admin write masters | insert/update/deactivate | allow | row change | before/after | delete/deactivate `p5ev_*` |
| J03 admin assignment create/end/correct | write | allow | row; end keeps row | SELECT by id | namespace |
| J04 admin import_* | all | allow | job/row rows | select | delete jobs/rows |
| J05 admin RPC CAS/persist | rpc | allow when preconditions | status/persist | RPC JSON + SQL | namespace |
| J06 manager SELECT masters/assignments | select | allow | none | | |
| J07 manager write masters/assignments | insert | deny | none | error + unchanged | |
| J08 manager import_* | select/write | deny | none | | |
| J09 manager RPC | rpc | deny / failed admin | none | | |
| J10 viewer | same as manager matrix | read allow / write deny | none | | |
| J11–J12 anon | select/write/rpc | deny | none | | |
| J13 | static review | anon key in client paths | — | grep `NEXT_PUBLIC_` / server-only service | |
| J14 | end + deactivate | allow; row remains | `valid_until` / `active=false` | SELECT | |
| J15 | overlap write | 409 ASSIGNMENT_OVERLAP | no second overlap | | |
| J16 | `created_by` / confirmed_by | = admin `auth.uid()` | identity | compare uuids (not emails in log) | |

**Service-role exclusion:** any PASS for J* must use user JWT (or anon). Service role only for seeding if admin cannot insert.

---

## 7. Database-confirm suite readiness

**Overall: PARTIALLY_READY** — remote schema reachable via CLI; user-JWT confirm path blocked until credentials/users exist.

### Layer mapping

| Layer | Proves |
|---|---|
| Direct RPC (`persist_assignment_import_row`, `begin_import_job_confirm`) as **admin JWT** | DB atomicity, vocab, overlap/skip, create-on, orphan, actor checks |
| App server action `confirmAssignmentImport` | CAS empty→409, counters finalize, transport-failure finalize, single `createNewMasters` wiring |
| SQL inspect (service role or admin) | Counters, orphans, validation_* immutability |
| Unit tests (already present) | Transport helper only — **not** FU-003-02 closure |

### Case → contract map

| Case | Primary surface | Expected persistence / job | Error code | Cleanup |
|---|---|---|---|---|
| C01 valid persist | RPC or confirm action | `persisted`; assignment exists | — | delete assignment+row+job |
| C02 partial | confirm action multi-row | `completed_with_errors` | mixed | namespace |
| C03 create OFF | RPC flags false / app false | `failed` | DRIVER/CUSTOMER_NOT_FOUND | |
| C04 create ON | RPC/app true | new master + persisted | — | delete masters created |
| C05 reuse | create ON with existing norm name | no extra master | — | |
| C06 exact dup | RPC | `skipped` | EXACT_DUPLICATE | |
| C07 overlap | RPC | `failed` | ASSIGNMENT_OVERLAP | |
| C08 invalid | confirm skips invalid | no assignment | — | |
| C09 reprocess | second persist | protected / no double assign | — | |
| C10 double confirm | second `confirmAssignmentImport` | 409 IMPORT_ALREADY_CONFIRMED | IMPORT_ALREADY_CONFIRMED | |
| C11 counters | finalize inspect | match stored states; pending≠failed | — | |
| C12 completed | all good rows | `completed` | — | |
| C13 completed_with_errors | ≥1 failed valid | `completed_with_errors` | — | |
| C14 transport failure | optional / already unit-covered | row `failed` PERSISTENCE_FAILED | PERSISTENCE_FAILED | optional |

**Recommended combo:** seed fixtures with admin JWT (or service role) → drive confirm via **app action** for C02/C10/C11–C13 → use **direct RPC** for precise C03–C07 and FU-003-03.

---

## 8. Orphan-rollback design verdict

**Verdict: SAFE_WITH_REQUIRED_ACCESS**

| Requirement | Design |
|---|---|
| Trigger | Pre-seed overlapping assignment on same vehicle/period; call `persist_assignment_import_row` with **create-missing ON** and unique `p5ev_*` driver/customer names |
| Mechanism | Existing GiST `exclusion_violation` inside RPC subtransaction after master INSERT |
| Proves | Driver/customer inserts roll back; no assignment survives; row `failed` + `ASSIGNMENT_OVERLAP`; `validation_*` unchanged |
| O01/O02 independence | Direct RPC with only driver or only customer create flag true |
| O03 | Both flags true |
| O04 unexpected others | Not required if O01–O03 pass; do not add failing migrations |
| Forbidden | Production data, killing DB, permanent bad migrations, leaving orphans |

Requires admin JWT (or authenticated admin session) on non-prod DB. Not executable in this dry-run.

---

## 9. Concurrency design verdict

| Item | FU-002-02 | OQ-004-04 |
|---|---|---|
| Mandatory? | **No** (accepted residual) | **No** (BEST-EFFORT) |
| Runner | PowerShell jobs / Node `Promise.all` | Same |
| Clients | 2 | 2 |
| Auth | Same or two admin JWTs | Same admin JWT twice preferred |
| Sync | Barrier then simultaneous write/confirm | Barrier then dual confirm |
| Winner / loser | ≤1 insert; loser exclusion/409 | One CAS success; other empty/409 IMPORT_ALREADY_CONFIRMED |
| Invariants | No overlapping committed pair | No double persist; counters consistent; ≤1 confirming transition |
| Repeat | 3–5 runs | 3–5 runs |
| Flakiness | Document flake rate; residual OK | Residual OK |
| Cleanup | Delete `p5ev_*` assignments/jobs | Same |

**Verdict:** Design OK; optional; blocked on same access as JWT matrix.

---

## 10. Fixture and cleanup plan

### Namespace

`p5ev_<runId>_<entity>`
Example: `p5ev_20260730a_vehicle_1`, driver full_name / customer name / notes containing the same prefix.

`runId`: short date+suffix from Apply start (e.g. `20260730a`).

### Entities

| Entity | Create via | Unique key |
|---|---|---|
| Users | Dashboard/Admin API (human) | documented test emails (not committed secrets) |
| Vehicles | admin insert | plate `P5EV-<runId>-N` |
| Drivers | admin insert | `p5ev_<runId>_driver_*` |
| Customers | admin insert | `p5ev_<runId>_customer_*` |
| Assignments | admin insert / RPC | vehicle+period |
| Import jobs/rows | admin insert or upload path | `source_filename` / notes contain prefix |

### Cleanup order (reverse dependency)

1. `import_job_rows` → `import_jobs`
2. `vehicle_assignments` with prefix notes or known ids
3. `drivers` / `customers` / `vehicles` matching prefix
4. Verify zero remaining `p5ev_<runId>_%`
5. Test users: retain reusable or delete per human policy

**Rules:** non-prod only; no collision with business plates; no unbounded accumulation; cleanup verification SELECT must return 0.

---

## 11. Evidence-capture plan

Each executed case (Apply only) records in `EVIDENCE-LOG.md`:

| Field | Rule |
|---|---|
| timestamp | ISO UTC |
| environment | `remote-dev` / `local` |
| project id | non-secret project ref only |
| identity | role name + user id prefix (not password/JWT) |
| case ID | e.g. `FU-003-03/O01` |
| expected / actual | allow/deny, status, code |
| DB side effect | counts / ids of `p5ev_*` only |
| cleanup | verified / failed |
| result | PASS / FAIL / BLOCKED |
| sanitized output | codes + messages; **no** secrets/JWTs/passwords/conn strings/PII |

---

## 12. Proposed tooling (do not create yet)

**Smallest safe approach**

1. **Prefer** a temporary evidence runner under e.g. `scripts/pack005-evidence/` (Apply phase):
   - Node + `@supabase/supabase-js`
   - Reads env from process / local untracked `.env.evidence` (gitignored)
   - **Not** imported by Next app; not in app bundle
   - May be retained as evidence tooling or deleted after pack — decide at Apply
2. **Vitest** optional wrapper for assertions if runner returns structured results — keep separate from product unit tests or tag `evidence`
3. **SQL** via `npx supabase` for inspect/cleanup verification when JWT path insufficient
4. **PowerShell** for concurrency barriers only

**Do not** install new packages without approval — current `@supabase/supabase-js` + vitest suffice.

Pseudocode only (not created):

```text
loadEnv() -> url, anon, (optional service)
signIn(role) -> userClient
seedP5ev(runId)
runCase(...)
assert(...)
cleanup(runId)
appendEvidenceLog(...)
```

---

## 13. Stop conditions

Stop Apply / evidence execution if:

- Production project detected
- Migration Local ≠ Remote
- Cannot isolate `p5ev_*` from business data
- Missing cleanup rights
- Unexpected RLS bypass (non-admin write succeeds)
- Only service-role evidence available for user RLS claims
- Credentials appear in git / logs
- Destructive/production testing required
- Plan contradicts repository after re-check
- Product defect found → stop case, Architect correction auth (no silent fix)
- Required fixture cannot be isolated
- MFA/email-confirm blocks scripted auth with no approved workaround

---

## 14. Builder execution plan (when access granted)

| Phase | Work | Prerequisite | Duration | Safe stop | Artifact | Depends |
|---|---|---|---|---|---|---|
| 0 | Confirm non-prod project + env present | Human secrets (untracked) | 15m | Stop if prod/missing | env checklist | — |
| 1 | FU-002-06 Docker note | Workstation | 10m | Always | EVIDENCE-LOG | — |
| 2 | FU-002-05 locking review | Repo | 45m | Always | EVIDENCE-LOG | — |
| 3 | Fixture setup validation | Env + admin | 30m | Stop if cleanup fails | seed report | 0 |
| 4 | FU-003-03 orphan O01–O03 | Admin JWT + DB | 1–2h | Stop on FAIL/defect | EVIDENCE-LOG | 3 |
| 5 | FU-003-02 C01–C13 | Admin JWT + DB | 3–6h | After each case | EVIDENCE-LOG | 3–4 |
| 6 | FU-002-03 / FU-002-04 | Admin JWT | 1h | | EVIDENCE-LOG | 3 |
| 7 | FU-002-01 J01–J16 | All three users | 2–4h | Stop on unexpected allow | EVIDENCE-LOG | 0,3 |
| 8 | FU-002-02 optional | Admin | 1h | Residual OK | EVIDENCE-LOG | 3 |
| 9 | OQ-004-04 optional | Admin | 1h | Residual OK | EVIDENCE-LOG | 5 |
| 10 | Cleanup verification | Any | 30m | Must pass | zero `p5ev_*` | all |
| 11 | Evidence reconciliation | Logs | 30m | | SoT FU statuses | 10 |

**Executable now without new access:** Phase 1–2 only.
**Blocked until access:** Phases 3–10 mandatory paths.

---

## 15. What was / was not done

| Done | Not done |
|---|---|
| Dry-run feasibility record | Evidence suite execution |
| Env presence checks | Marking any FU passed/closed |
| Contract cross-check | Creating evidence runner files |
| Migration equality check | Package installs |
| | Stage / commit / push |
| | Frotcom / product / migration edits |

---

## 16. Validation (this dry-run)

| Check | Result |
|---|---|
| Preflight HEAD/branch | PASS |
| No product/test/migration diffs | PASS |
| Follow-up ID meanings | PASS (FU-002-06 Docker; race=FU-002-02; CAS=OQ-004-04) |
| Evidence still planned | PASS |
| Secrets printed | PASS (none) |

---

## Recommendation

**READY_WITH_MISSING_ACCESS**

Mandatory evidence design is sound and aligned with repository contracts, but execution of FU-002-01 / FU-003-02 / FU-003-03 (and related live cases) cannot start until non-prod anon/URL (and Auth test users) are available to the runner. FU-002-05 and FU-002-06 can proceed immediately under Apply.

## Status

**PACK_005_EVIDENCE_DRY_RUN_COMPLETE**

---

## Follow-on — Access preparation (2026-08-02)

Tooling and checklist created under `scripts/pack005-evidence/` and `ACCESS-REQUIREMENTS.md`.
Live suite still not executed. See access-preparation recommendation **READY_FOR_ACCESS_PROVISIONING**.
