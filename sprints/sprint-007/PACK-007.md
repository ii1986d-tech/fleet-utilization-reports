# PACK-007 — Route logic & kilometer comparison

> Status: **ARCHITECT_PREPARATION**  
> Date opened: **2026-08-05**  
> Dependencies: **PACK-006 COMPLETE**, **DS-005 APPROVED**

## Goal

Compute and present kilometer comparisons for a reviewed transport order using predefined route corridors, Google Maps (static / directions), and deltas versus PDF-paid km.

## In scope

- Route corridor definition and matching
- Maps API integration (distance / directions)
- KM comparison: **paid** (PDF) vs **real/calculated** (Maps/corridor) vs **direct**
- Caching of standard corridor distances (API cost control)
- Admin/manager compute/refresh; viewer read-only

## Out of scope

- Full multi-stop route optimization / TSP
- Live traffic-aware continuous re-routing
- Frotcom live telemetry (DS-001)
- PACK-008 export packaging

## Open questions

| ID | Question |
|---|---|
| OQ-007-01 | Maps API provider (Google Maps Directions API vs alternatives) |
| OQ-007-02 | Corridor definition (fixed corridors vs dynamic) |
| OQ-007-03 | KM comparison methodology (paid vs real vs direct) |
| OQ-007-04 | Caching strategy for standard corridors |
| OQ-007-05 | Cost ceiling for Maps API calls |

## Related

- `blueprint.md` · `requirements.md`
- ADR-009 §25 · TASK-026 · FU-AI-001 (separate AI tuning)
