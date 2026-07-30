# PACK-002 Builder Dry-Run Report

> Date: 2026-07-30
> Baseline: PACK-001 checkpoint `20f2698`
> Architect package reviewed: `sprints/sprint-002/PACK-002.md` + ADR-005
> Product code / migrations / DB / commits: **unchanged** (dry-run only)

## Recommendation

**READY_WITH_REQUIRED_CORRECTIONS** (at dry-run time)

**Architect follow-up 2026-07-30:** corrections applied in ADR-005/006 + pack docs → status **PACK_002_CORRECTIONS_READY_FOR_APPROVAL**.

---

## 1. Codebase inspection summary

| Area | State | PACK-002 fit |
|---|---|---|
| Next.js App Router | `app/layout.tsx`, `app/page.tsx` shell only | Settings routes to add |
| Auth helpers | `src/lib/auth/roles.ts` — `canManageMasterData` already **admin-only** | Reuse; do not widen |
| Supabase clients | browser + server session + service-role (server-only) | Mutations via session client |
| Schema | 8 tables migrated; assignments + period CHECK exist | Reuse; no table recreate |
| RLS | Select for authenticated roles; write admin-only for masters/assignments | Keep; do not weaken |
| Tests | Vitest smoke + role helpers | Extend with assignment units/int |
| UI | No settings/auth UI yet | Greenfield screens OK |
| zod | Already in dependencies | Use for input validation |
| Frotcom | Mock-only | Untouched (out of scope) |

Working tree currently contains Architect pack docs (uncommitted) plus this dry-run record — **no product-file diffs**.

---

## 2. Requirements implementability (FR-002-01…12)

| FR | Verdict | Notes |
|---|---|---|
| 01–03 Masters CRUD | Implementable | Prefer **deactivate (`active=false`)** over hard DELETE |
| 04–05 Assignment create | Implementable | App rule ≥1 of driver/customer; DB allows both null today |
| 06 Period check | Implementable | Already enforced by `vehicle_assignments_valid_range` |
| 07 Overlap hard block | Implementable | App + **mandatory** DB guard (correction) |
| 08 End | Implementable | UPDATE `valid_until` only |
| 09 Correct | Implementable | Must pick one canonical pattern (correction) |
| 10 Authz | Implementable | Align UI with existing RLS; no policy weakening |
| 11 As-of query | Implementable | Pure function + SQL filter |
| 12 Error surfacing | Implementable | Structured error codes to UI |

---

## 3. Data model review

### Masters (`vehicles`, `drivers`, `customers`)

- Fields sufficient for Phase 2 lists/forms.
- Unique registration / optional Frotcom ids already indexed.
- **Historical integrity risk:** `vehicle_assignments.vehicle_id … ON DELETE CASCADE` — hard-deleting a vehicle **destroys assignment history**.
  **Required correction:** PACK-002 forbids hard DELETE of vehicles/drivers/customers in UI and server actions; use `active=false`. (Driver/customer FK is `ON DELETE SET NULL` — still prefer deactivate.)

### Assignments

| Concern | Finding |
|---|---|
| Start/end | `valid_from` NOT NULL; `valid_until` nullable = open-ended |
| Open-ended | Treat as `+∞` in overlap/as-of math |
| Updates | Allowed for correction; bump `updated_at` |
| Deletions | **Do not hard-delete** assignment rows in MVP; end via `valid_until` |
| Period integrity | DB CHECK already present |
| Overlap integrity | Not in DB yet — app alone is race-prone |

### As-of semantics (proposed)

Row matches `as_of` when:

`valid_from <= as_of AND (valid_until IS NULL OR valid_until >= as_of)`
(inclusive ends; matches ADR-005 inclusive ranges)

If multiple rows match (should be impossible under hard block), treat as data corruption → 409/conflict for writers; readers return error/log.

---

## 4. ADR-005 — overlap design

### Application validation

Pure helper (unit-tested):

```
overlaps(a, b) iff
  a.vehicle_id = b.vehicle_id
  AND a.valid_from <= coalesce(b.valid_until, +∞)
  AND b.valid_from <= coalesce(a.valid_until, +∞)
```

Adjacent OK: end `D`, start `D+1` → no overlap.
Same-day shared endpoint (end `D`, start `D`) → overlap (inclusive).

On create/update/end: load other rows for `vehicle_id` (exclude self id on update), reject if any overlap.

### Database guard — **mandatory for Apply**

Architect pack marked guard “optional/prefer”. Dry-run elevates to **required**:

- Prefer PostgreSQL **exclusion constraint** using `daterange(valid_from, COALESCE(valid_until, 'infinity'::date), '[]')` + `gist` on `vehicle_id`.
- Alternative: `BEFORE INSERT OR UPDATE` trigger raising unique-style exception.
- Pre-check: zero overlapping rows before applying migration (dev remote should be empty/clean).

### Race prevention

1. App check (UX)
2. DB exclusion/trigger (authoritative)
3. Catch constraint violation → map to overlap conflict response

### Conflict API response

- Code: `ASSIGNMENT_OVERLAP`
- HTTP: **409 Conflict**
- Body: conflicting assignment id(s), vehicle_id, ranges (no secrets)

---

## 5. Authorization / RLS

| Role | Masters / assignments | Dry-run verdict |
|---|---|---|
| admin | R/W via existing `*_write` / `assignments_write` | Keep |
| manager | R only | Keep — **no write elevation** |
| viewer | R only | Keep |
| unauth / invalid | deny | Keep |

**Do not** alter PACK-001 RLS to broaden writes. UI must hide mutate controls unless `canManageMasterData(role)` (admin).

Server actions still rely on RLS; never use service-role for normal CRUD.

---

## 6. API / server-action contracts (proposed)

Transport: Next.js **server actions** (primary) or Route Handlers returning JSON. Same error taxonomy:

| Situation | HTTP | App code |
|---|---|---|
| Invalid input (zod / FR-002-05/06) | 400 | `VALIDATION_ERROR` |
| Unauthenticated | 401 | `UNAUTHENTICATED` |
| Authenticated but not admin (mutate) | 403 | `FORBIDDEN` |
| Entity missing | 404 | `NOT_FOUND` |
| Overlap (app or DB) | 409 | `ASSIGNMENT_OVERLAP` |
| Unexpected DB/service failure | 500 | `INTERNAL_ERROR` |

Success: 200/201 with entity payload. End/correct return updated row(s).

---

## 7. Migration requirements

| Item | Decision |
|---|---|
| New migration | **Required:** overlap exclusion/trigger only |
| Touch PACK-001 tables | No recreate/drop |
| RLS migration | Not required unless tests prove gap |
| Backfill | None if no overlapping rows; otherwise resolve manually before constraint |
| Remote apply | `supabase db push` to approved linked project-ref; verify `migration list` |
| Rollback | Forward-fix migration dropping guard only |
| Local Docker | Still env note; remote remains acceptable apply path |

---

## 8. UI requirements (functional, not polished)

Screens under settings-style routes:

1. Vehicles list + create/edit (active toggle)
2. Drivers list + create/edit
3. Customers list + create/edit
4. Assignments list (filter by vehicle) + create/edit/end

States required:

- Loading / empty / validation errors / overlap conflict banner / success toast or inline / forbidden message for non-admin
- Date inputs for `valid_from` / `valid_until`
- Dialog or confirm for **End assignment**
- No Excel upload UI

Also needed for usability: minimal **auth session** path (login/sign-out or documented Supabase session) so RLS-backed mutations work — can be minimal, not a design system.

---

## 9. Test matrix gaps

| Layer | Covered by pack T-002-* | Gaps to add |
|---|---|---|
| Unit | periods, overlap, as-of, ≥1 party | Adjacent-day cases; inclusive same-day; end-date shrink that creates overlap |
| API/actions | implied | Explicit 400/401/403/404/409 mapping tests |
| Integration | create/end/correct | DB constraint rejects when app bypassed |
| RLS | viewer/manager deny write | Reaffirm masters write deny; unauth deny |
| Migration | missing | Apply on clean DB; reject overlapping fixture then clean |
| UI | missing | Smoke: admin form submit; non-admin controls absent (Playwright optional later; at least component/manual checklist) |

TM-08/09/10 foundations: in scope. TM-11+ Excel: out of scope.

---

## 10. Complete file plan

### Existing product files to modify

- `app/page.tsx` — link to settings (minimal)
- `src/lib/auth/roles.ts` — optional alias `canManageAssignments` (= admin); **do not** grant manager
- `src/lib/supabase/types.ts` — row types for masters/assignments
- `docs/AUTH-ROLES.md` — settings write = admin only
- `quality/TEST-MATRIX.md` — evidence after Apply
- `planning/WORK-BACKLOG.md` — TASK-007 status during Apply

### New product files

- `src/lib/assignments/periods.ts`
- `src/lib/assignments/overlap.ts`
- `src/lib/assignments/asOf.ts`
- `src/lib/assignments/errors.ts`
- `src/lib/assignments/actions.ts` (server actions)
- `src/lib/masters/vehicles.ts` / `drivers.ts` / `customers.ts` (+ actions)
- `app/settings/layout.tsx` (+ auth gate)
- `app/settings/vehicles/page.tsx` (+ form components as needed)
- `app/settings/drivers/page.tsx`
- `app/settings/customers/page.tsx`
- `app/settings/assignments/page.tsx`
- Minimal `app/login/page.tsx` and/or `middleware.ts` for session refresh (if required for cookies)

### Migrations

- `supabase/migrations/YYYYMMDDHHMMSS_assignment_overlap_guard.sql` (**required**)

### Tests

- `tests/assignments/periods.test.ts`
- `tests/assignments/overlap.test.ts`
- `tests/assignments/asOf.test.ts`
- `tests/assignments/actions.errors.test.ts` (unit of mappers)
- Optional `tests/assignments/rls.integration.test.ts` (remote BEGIN/ROLLBACK, prefix `FUR001_P002_TEST_`)

### Documentation (Apply phase)

- `sprints/sprint-002/BUILDER-REPORT.md`
- `sprints/sprint-002/ARCHITECT-REVIEW.md` (Architect)
- Checkpoint updates after accept

### Do not touch

- Frotcom live paths, PACK-003 Excel, PACK-001 migration bodies (except additive new file), launcher package

---

## 11. Safest implementation sequence + gates

1. **Domain pure functions** (periods/overlap/as-of) + unit tests → `npm test`
2. **Overlap migration** draft + dry-run SQL review → `db push` to approved remote → `migration list` match
3. **Masters server actions** (no hard delete) + RLS smoke → test/lint
4. **Assignment actions** (create/end/correct) with app+DB overlap → unit + int tests
5. **Settings UI** read paths for all roles; mutate UI admin-only → manual smoke
6. **Minimal auth session** wiring if missing → smoke login as admin/viewer
7. Full gates: `npm test` / `lint` / `build`
8. Builder Report → Architect review

Stop and escalate if migration cannot apply (overlapping data or remote permissions).

---

## 12. Blockers / decisions / risks / follow-ups

### Blockers (before Apply)

None technical **if** required corrections are accepted. Human Apply approval still required.

### Decisions required (bind before/at Apply approval)

1. **DB overlap guard mandatory** (exclusion preferred) — dry-run correction
2. **No hard DELETE** for masters/assignments in PACK-002 — dry-run correction
3. **Correct pattern:** prefer in-place UPDATE when range still non-overlapping; else close (`valid_until`) + insert successor in one transaction — dry-run correction
4. Auth UX: email magic-link vs password — ops choice; not a Decision Stop

### Manageable risks

- R-002-01 races → DB guard
- R-002-03 manager write expectation → UI+RLS
- RSK-010 remote/local drift → migration list verify
- Local Docker still missing → use approved remote for migration apply

### Later-pack follow-ups

- PACK-003 Excel must call same overlap helpers + respect DB guard
- PACK-004 reports consume as-of resolver
- FK RESTRICT on `vehicle_id` is **in PACK-002 Apply** (ADR-006), not deferred

---

## Required corrections (binding for Apply)

1. Elevate overlap DB guard from optional → **required**.
2. Forbid hard DELETE of vehicles/drivers/customers/assignments in PACK-002; use end/deactivate.
3. Lock correction semantics to a single method.
4. Do not weaken or broaden PACK-001 RLS write policies.

### Architect resolution (2026-07-30)

| # | Resolution |
|---|---|
| 1 | **ADR-005:** mandatory GiST exclusion `daterange(..., '[]')`; app UX + DB final; **409 `ASSIGNMENT_OVERLAP`** |
| 2 | **ADR-006:** no product hard DELETE; end/deactivate; FK `vehicle_id` → `ON DELETE RESTRICT` at Apply |
| 3 | **ADR-006 Option A only:** safe in-place UPDATE in one TX (Option B not used for “correct”) |
| 4 | Confirmed: admin write only; no RLS write widening |

---

## Final recommendation

**READY_WITH_REQUIRED_CORRECTIONS** at dry-run → after Architect resolution: **ready for implementation approval** (Apply still needs separate human authorize). Status: **PACK_002_CORRECTIONS_READY_FOR_APPROVAL**.
