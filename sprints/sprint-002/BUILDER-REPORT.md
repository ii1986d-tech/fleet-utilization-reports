# Builder Report — Sprint 002 / PACK-002

> Apply 2026-07-30 · Baseline PACK-001 `20f2698`
> Formal acceptance 2026-07-30

## Status

**PACK_002_ACCEPTED_WITH_FOLLOW_UPS** · Checkpoint **PACK_002_CHECKPOINT_READY** (commit pending)

## Database gate (remote verified, read-only)

| Check | Result | Exact name / definition |
|---|---|---|
| Migration `20260730140000` | Local == Remote | listed on both |
| `db push --include-all --dry-run` | Remote database is up to date | no repair |
| Exclusion constraint | **PRESENT** | **`vehicle_assignments_vehicle_period_excl`** — `EXCLUDE USING gist (vehicle_id WITH =, daterange(valid_from, COALESCE(valid_until, 'infinity'::date), '[]') WITH &&)` |
| Vehicle FK | **ON DELETE RESTRICT** | **`vehicle_assignments_vehicle_id_fkey`** |
| Period CHECK (PACK-001) | intact | `vehicle_assignments_valid_range` |
| RLS enabled | true | vehicles, drivers, customers, vehicle_assignments |

### RLS policies (PACK-001 unchanged; admin-only writes)

| Table | Select policy | Write policy | Write predicate |
|---|---|---|---|
| vehicles | `vehicles_select` | `vehicles_write` | `is_admin()` |
| drivers | `drivers_select` | `drivers_write` | `is_admin()` |
| customers | `customers_select` | `customers_write` | `is_admin()` |
| vehicle_assignments | `assignments_select` | `assignments_write` | `is_admin()` |

## Implemented

- Domain: periods, overlap, as-of
- Masters APIs: list/create/update/deactivate
- Assignment APIs: list/create/`correctAssignment`/`endAssignment`/`getAssignmentAsOf`; hard DELETE forbidden
- UI: `/settings/*`, `/login`, as-of lookup
- Tests: domain, authz helpers, no-delete (20 tests)
- Overlap: app + DB → **409 `ASSIGNMENT_OVERLAP`**

## Gates

| Gate | Result |
|---|---|
| `npm test` | **20/20 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

## Accepted follow-ups

See `ACCEPTANCE-RECORD.md` / RSK-012 / TASK-012…016. PACK-003 not started.

## Recommendation

Checkpoint commit on explicit human approval.
