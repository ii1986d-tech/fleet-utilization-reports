# Architect Review — PACK-002

> Formal review 2026-07-30 · Baseline PACK-001 `20f2698`
> Reviewed against pack package, ADR-005/006, Builder Report, SoT planning/traceability
> Product code and migration **not** modified during review

## Recommendation

**ACCEPT_WITH_FOLLOW_UPS**

## Verdicts

| Area | Verdict |
|---|---|
| Scope | **PASS** — Phase 2 only; no Excel/PACK-003, no live Frotcom/DS-001, no unrelated redesign |
| Architecture | **PASS** — ADR-005 exclusion + ADR-006 in-place correct/end/deactivate; app UX check + DB final boundary |
| Security / RLS | **PASS** — `requireAdmin` + unchanged PACK-001 admin-write policies; no write widening |
| Migration | **PASS** — matches ADR-005/006; remote evidence recorded; no RLS mutation in migration |
| API contracts | **PASS** — `AppError` maps 400/401/403/404/409/500 consistently |
| Tests | **PASS WITH FOLLOW-UPS** — domain/authz/no-delete covered; several §8 scenarios lack live automation |
| Validation gates | **PASS** — independent `npm test` 20/20, lint, build, `git diff --check` |

## Scope compliance

In scope delivered: masters CRUD/deactivate, assignments create/correct/end/as-of, settings + login shell, overlap domain + mandatory DB guard, admin writes.

Confirmed **absent**: Excel import, PACK-003 start, live Frotcom, broad UI redesign, Option B close+create correction path.

## Architecture compliance

| Binding rule | Evidence |
|---|---|
| ADR-005 GiST exclusion | Migration + remote: `vehicle_assignments_vehicle_period_excl` with inclusive `'[]'` + `infinity` |
| ADR-005 409 `ASSIGNMENT_OVERLAP` | App pre-check + `mapDatabaseError` |
| ADR-006 in-place UPDATE | `correctAssignment` single-row UPDATE; no close+create API |
| ADR-006 end via `valid_until` | `endAssignment` |
| ADR-006 deactivate masters | `deactivate*` → `active=false` |
| ADR-006 FK RESTRICT | Remote: `vehicle_assignments_vehicle_id_fkey` ON DELETE RESTRICT |
| Adjacent allowed / overlap rejected | Domain tests + inclusive predicate |

**Material note (non-blocking):** ADR-006 recommends `SELECT … FOR UPDATE` inside an explicit multi-step transaction. Implementation uses read-then-single-UPDATE via Supabase (statement-atomic). Race integrity still rests on the mandatory exclusion constraint (ADR-005). Classify as residual risk / hardening follow-up, not rework.

## Historical integrity

- `deleteAssignment` always returns FORBIDDEN; UI has no hard-delete product path (probe only returns forbidden)
- End/correct UPDATE only; masters deactivate only
- Vehicle FK RESTRICT prevents cascade wipe of assignment history
- Driver/customer FKs remain SET NULL (PACK-001; unchanged by this migration)

## Authorization and RLS

Server: `requireAuthenticated` / `requireAdmin` (`canManageMasterData` = admin only).

Remote policies unchanged:

- Select: `vehicles_select`, `drivers_select`, `customers_select`, `assignments_select` → `is_authenticated_role()`
- Write: `vehicles_write`, `drivers_write`, `customers_write`, `assignments_write` → `is_admin()`

No new authenticated-write policy. Migration introduces **no** RLS changes.

## API contracts

`AppError` shape `{ code, message, httpStatus, details? }` with:

| Code | Status |
|---|---:|
| VALIDATION_ERROR | 400 |
| UNAUTHENTICATED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| ASSIGNMENT_OVERLAP | 409 |
| INTERNAL_ERROR | 500 |

## Migration review

File: `supabase/migrations/20260730140000_assignment_overlap_guard.sql`

- `btree_gist` + exclusion matches ADR-005 conceptual SQL
- Inclusive `daterange(..., '[]')` + `COALESCE(valid_until, 'infinity'::date)`
- FK re-add as `ON DELETE RESTRICT`
- Forward-safe; rollback via forward-fix drop exclusion (documented)
- **Doc mismatch (non-blocking):** pack indicative filename used `…_assignment_overlap_and_fk_restrict.sql`; actual filename differs; contents correct
- Remote: migration listed Local==Remote; dry-run up to date; constraint + FK definitions verified read-only

## Product implementation review

Domain periods/overlap/as-of present. Masters + assignment actions enforce auth and validation. UI covers loading/empty/forbidden/overlap/success/error banners; as-of lookup present. Correction is in-place only.

## Test review vs PACK-002 §8

| ID | Coverage in automated suite | Classification |
|---|---|---|
| T-002-01…05, T-002-06, T-002-15 | Covered (domain / mapper) | Satisfied |
| T-002-07 | Partial (as-of windows; not full TM mid-period party change fixture) | Required follow-up |
| T-002-08 | Code review: single UPDATE atomic; no dedicated integration TX test | Accepted residual risk |
| T-002-09 | No parallel-client harness; DB exclusion verified remotely | Accepted residual risk |
| T-002-10…12 | Role helper tests only; no live JWT RLS script | Accepted residual risk |
| T-002-13 | Covered (`deleteAssignment`) | Satisfied |
| T-002-14 | Code review only (end UPDATE); no automated preserve-row assert | Required follow-up |
| T-002-16 | Mapper unit test + remote constraint presence; no live bypass INSERT | Required follow-up |
| Master deactivate preserves row | Code review only | Required follow-up |

### Gap classification (requested)

| Gap | Classification |
|---|---|
| No fully automated RLS test with real Auth users | **Accepted residual risk** (+ required follow-up before high-assurance release) |
| No true parallel-client race harness | **Accepted residual risk** (DB exclusion is intended race boundary; verified present) |

Neither gap is an **acceptance blocker** for PACK-002 given remote constraint + policy verification and dual app/RLS design.

## Independent validation gates (Architect)

| Gate | Result |
|---|---|
| `npm test` | **20/20 PASS** (note: prompt said 19/19; Builder Report 20/20 is correct) |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** (CRLF warnings only) |

## Residual risks

1. Interactive JWT/RLS smoke not automated
2. No multi-process concurrency harness
3. No live “bypass app → DB exclusion → 409” integration test
4. Correction path lacks explicit `FOR UPDATE`
5. Local Docker/WSL still unavailable (environment note only)

## Required documentation updates (this review)

- Record this review outcome in STATE / registry / acceptance / briefing
- Mark follow-ups in risks / test matrix as residual (not silent code fixes)

## Proposed next checkpoint status

Formal acceptance recorded as **PACK_002_ACCEPTED_WITH_FOLLOW_UPS**.
Checkpoint proposal: **PACK_002_CHECKPOINT_READY** (commit pending explicit human approval).
Do **not** start PACK-003 until separate approval.

## Acceptance evidence summary

- ADR-005/006 implemented in code + migration
- Remote exclusion + RESTRICT FK + admin-only RLS names verified
- No product hard DELETE; deactivate/end preserve rows
- Gates PASS; Builder Report present; PACK-003 not started
- Follow-ups FU-002-01…06 remain visible (RSK-012 / TASK-012…016)

## Final Architect status

**PACK_002_ARCHITECT_REVIEW_ACCEPTED_WITH_FOLLOW_UPS**

## Formal acceptance (post-review)

**PACK_002_ACCEPTED_WITH_FOLLOW_UPS** — see `ACCEPTANCE-RECORD.md`
