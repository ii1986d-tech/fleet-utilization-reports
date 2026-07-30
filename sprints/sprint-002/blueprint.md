# Sprint 002 Blueprint — PACK-002

> Updated 2026-07-30 after dry-run corrections

## Pack status

**PACK_002_CORRECTIONS_READY_FOR_APPROVAL** — implementation not approved yet

## Planned Apply changes

- Assignment domain: periods, overlap, as-of, errors, server actions
- Masters helpers + deactivate-only
- Settings UI + minimal auth session
- **Required migration:** GiST exclusion (ADR-005) + `vehicle_id` FK `ON DELETE RESTRICT` (ADR-006)
- Tests per `PACK-002.md` §8

## Design locks

| Topic | Lock |
|---|---|
| Overlap DB guard | Mandatory exclusion `'[]'` + infinity |
| Correction | **In-place UPDATE in one TX** (ADR-006 A) |
| End | Set `valid_until` only |
| Delete | Forbidden in product |
| Authz | Admin write; manager/viewer read; RLS unchanged |

## Rollback

Forward-fix drop exclusion; do not drop PACK-001 tables.
