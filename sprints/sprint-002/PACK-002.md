# PACK-002 — Assignments CRUD (Phase 2)

> Architect preparation 2026-07-30 · Dry-run corrections 2026-07-30 · Apply 2026-07-30 · Accepted 2026-07-30
> Status: **PACK_002_ACCEPTED_WITH_FOLLOW_UPS**
> Depends on: **PACK_001_ACCEPTED** (`20f2698`)
> Implementation: complete — `BUILDER-REPORT.md` · Review: `ARCHITECT-REVIEW.md` · Acceptance: `ACCEPTANCE-RECORD.md`

---

## 1. Objectives

Deliver **manual, time-dependent vehicle assignment management** so admins can maintain vehicles, drivers, customers, and historical `vehicle_assignments` with period validation and **hard overlap detection** (app + **mandatory** DB guard).

Smallest testable outcome:

- Admin can create / in-place-correct / end assignments and maintain masters (no hard DELETE)
- Viewer/manager can **read** only
- Overlaps rejected with **HTTP 409 / `ASSIGNMENT_OVERLAP`** (app + DB)
- Concurrent overlapping writes cannot both succeed
- `npm test` / `lint` / `build` pass

---

## 2. Scope

### In scope

- Master-data UI/API for vehicles, drivers, customers (create/update/**deactivate**)
- Historical assignments: create, **in-place correct (ADR-006)**, **end** (`valid_until`)
- Period validation; mandatory overlap guard (ADR-005)
- Historical as-of query
- Tests listed in §8 (including concurrency / DB bypass / no hard-delete path)
- Docs: AUTH/roles; Builder Report after Apply

### Out of scope

- Excel import (PACK-003)
- Daily reports UI (PACK-004), live Frotcom (PACK-005)
- Hard DELETE product paths; exceptional DBA cleanup
- Manager write elevation; RLS weakening
- Option B (close+create) as the correction API — not used for “correct”

---

## 3. Functional requirements

| ID | Requirement |
|---|---|
| FR-002-01…03 | Admin list/create/update masters; deactivate via `active=false`; **no hard DELETE** |
| FR-002-04 | Admin create assignment (`source=manual`) |
| FR-002-05 | ≥1 of `driver_id` / `customer_id` |
| FR-002-06 | Reject `valid_until < valid_from` |
| FR-002-07 | Reject overlaps (app + mandatory DB); **409 `ASSIGNMENT_OVERLAP`** |
| FR-002-08 | End: set `valid_until`; preserve row |
| FR-002-09 | Correct: **ADR-006 Option A** in-place UPDATE in one transaction |
| FR-002-10 | Admin write only; manager/viewer read; dual enforcement API+RLS |
| FR-002-11 | As-of resolver for `(vehicle_id, as_of_date)` |
| FR-002-12 | Surface validation/overlap errors (no silent overwrite) |

### Lifecycle representation

| Kind | Active | Ended / inactive |
|---|---|---|
| Assignment | Open-ended or `valid_until` still covers “current”/as-of | `valid_until` set; row kept |
| Master | `active=true` | `active=false`; row kept |

---

## 4. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-002-01 | TypeScript strict |
| NFR-002-02 | Session-scoped Supabase client for mutations; no service-role in browser |
| NFR-002-03 | App validation **and mandatory** DB exclusion (ADR-005) |
| NFR-002-04 | Audit timestamps; `created_by` when available |
| NFR-002-05 | Functional settings UI |
| NFR-002-06 | test/lint/build; no secrets |
| NFR-002-07 | Forward-only migrations; apply at Apply phase only |

---

## 5. Architecture changes

### Unchanged

- ADR-001…004; PACK-001 tables; claim path `app_metadata.role`; existing RLS **write = admin only**

### Binding ADRs

- **ADR-005** — mandatory GiST exclusion on inclusive `daterange`; 409 `ASSIGNMENT_OVERLAP`
- **ADR-006** — no hard delete; correction = in-place transactional UPDATE; FK `vehicle_id` → `ON DELETE RESTRICT`

### Authorization (confirmed)

| Role | Masters | Assignments |
|---|---|---|
| admin | create/update/deactivate | create/correct/end |
| manager | read | read |
| viewer | read | read |
| other | deny | deny |

No new “authenticated write” policies. No weakening of PACK-001 RLS.

---

## 6. Files to modify / create (indicative Apply)

### Create

- `src/lib/assignments/{periods,overlap,asOf,errors,actions}.ts`
- `src/lib/masters/{vehicles,drivers,customers}.ts` (+ actions)
- `app/settings/**`, minimal login/middleware as needed
- `tests/assignments/*` (see §8)
- `supabase/migrations/YYYYMMDDHHMMSS_assignment_overlap_and_fk_restrict.sql` (**required at Apply**)

### Modify

- `types.ts`, `docs/AUTH-ROLES.md`, test matrix, backlog, reports after Apply

### Migration contents (Apply only — not now)

1. `btree_gist` + exclusion constraint (ADR-005)
2. Drop/re-add `vehicle_assignments.vehicle_id` FK as **`ON DELETE RESTRICT`**
3. Rollback fix: drop exclusion; restore prior FK only via explicit forward-fix (document in Builder Report)

---

## 7. Risks

| ID | Mitigation |
|---|---|
| RSK-004 / races | Mandatory exclusion + app checks |
| Cascade history wipe | RESTRICT FK + no product DELETE |
| Manager write expectation | UI + RLS unchanged |
| Remote apply | Approved project-ref; migration list verify |

---

## 8. Test matrix (PACK-002) — required

| ID | Scenario | Expect |
|---|---|---|
| T-002-01 | `valid_until < valid_from` | reject |
| T-002-02 | Open-ended blocks later overlap | reject / 409 |
| T-002-03 | Adjacent periods (`…-14` then `15-…`) | allow |
| T-002-04 | Intersecting periods | reject / 409 |
| T-002-05 | Identical periods | reject / 409 |
| T-002-06 | As-of historical resolve | correct row |
| T-002-07 | Mid-period driver/customer change (TM-08/09) | as-of differs |
| T-002-08 | Correction TX rolls back completely on conflict | no partial write |
| T-002-09 | Two concurrent overlapping writes | ≤1 success; loser 409/constraint |
| T-002-10 | Viewer cannot write | 403 / RLS deny |
| T-002-11 | Manager cannot write | 403 / RLS deny |
| T-002-12 | Admin approved writes | allow |
| T-002-13 | No hard-delete product path | no DELETE API/UI |
| T-002-14 | Close preserves row | row remains queryable |
| T-002-15 | API overlap → **409 `ASSIGNMENT_OVERLAP`** | mapped |
| T-002-16 | DB rejects overlap if app validation bypassed | constraint error → 409 |
| Gates | `npm test` / `lint` / `build` | PASS |

---

## 9. Acceptance criteria

- [ ] Corrections ADR-005/006 implemented as specified
- [ ] Mandatory overlap migration + FK RESTRICT applied on approved env
- [ ] No hard-delete product path; close/deactivate preserve history
- [ ] Correction = in-place transactional UPDATE only
- [ ] Admin-only writes; RLS unchanged in spirit (no broader writes)
- [ ] All §8 tests evidence recorded
- [ ] npm gates PASS
- [ ] Builder Report + Architect review
- [ ] PACK-003 not started

---

## 10. Builder handoff

See `HANDOFF.md`. Dry-run: `BUILDER-DRY-RUN.md`. Await human approval of corrections before Apply.

---

## 11. Validation strategy

Unit → migration apply (remote) → masters → assignment actions → RLS/concurrency tests → UI smoke → npm gates. Prefix DB fixtures `FUR001_P002_TEST_`; prefer BEGIN…ROLLBACK.

---

## 12. Rollback strategy

- Revert Apply commits
- Forward-fix: drop exclusion; do not drop tables; FK restore only if documented
- No destructive history purge

---

## 13. Migration impact

| Item | Impact |
|---|---|
| PACK-001 tables | Reuse |
| New migration | Exclusion + FK RESTRICT (**mandatory**) |
| Backfill | Resolve any overlapping rows before constraint |
| RLS | No write widening |

---

## Pack metadata

| Field | Value |
|---|---|
| Pack | PACK-002 v1 |
| Correction workflow | **ADR-006 Option A — safe in-place update** |
| DB overlap guard | **Mandatory** GiST exclusion (ADR-005) |
| Baseline | `20f2698` |
| Builder | **PACK_002_ACCEPTED_WITH_FOLLOW_UPS** — checkpoint ready |
