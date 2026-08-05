# PACK-007 — Route logic & kilometer comparison

> Status: **ARCHITECT_PREPARATION**  
> Date opened: **2026-08-05**  
> Depends on: PACK-006 COMPLETE (reviewed transport order with stops)

## Goal

Compute and present kilometer comparisons for a reviewed transport order using a small set of **predefined route corridors**, Google Maps (static / directions), and deltas versus PDF-paid km.

## In scope

- 4–5 predefined corridor definitions (ops-maintained)
- Corridor matching from reviewed order stops (PACK-006 working order)
- Maps API integration (Directions and/or Distance Matrix; static Maps link reuse where applicable)
- KM comparison display: **PDF paid km** vs **corridor/calculated km** vs **direct (as-the-crow-flies or straight driving) km**
- Caching of corridor/standard-leg results to control Maps API cost
- Admin/manager visibility; viewer read-only (align with PACK-006 roles)

## Out of scope

- Full multi-stop route optimization / TSP
- Live traffic-aware continuous re-routing
- Frotcom live telemetry (DS-001)
- PACK-008 export packaging (consumes results later)

## Open architectural decisions (next)

1. Maps product choice + billing/quota model (Directions vs Distance Matrix; key storage server-only).
2. Corridor matching rule (exact stop pair, geofence, manual selection).
3. What “direct km” means (haversine vs Maps shortest).
4. Persist vs compute-on-read for km deltas; retention vs ASM-014.

## Related

- `blueprint.md` · `requirements.md`
- Prior: ADR-009 §25 (Maps link / km store; routing deferred here)
- Backlog: TASK-026
