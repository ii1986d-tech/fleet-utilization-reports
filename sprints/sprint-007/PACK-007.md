# PACK-007 — Route logic & kilometer comparison

> Status: **ARCHITECT_DECISIONS_MADE**
> Date opened: **2026-08-05**
> Dependencies: **PACK-006 COMPLETE**, **DS-005 APPROVED**

## Goal

Compute and present kilometer comparisons for a reviewed transport order using predefined route corridors, Google Maps Directions, and deltas versus PDF-paid km.

## In scope

- Route corridor definition and matching
- Google Directions API integration (distance)
- KM comparison: **paid** (PDF) vs **actual** (Directions) vs **direct** (haversine)
- Caching of standard corridor distances (API cost control)
- Admin/manager compute/refresh; viewer read-only

## Out of scope

- Full multi-stop route optimization / TSP
- Live traffic-aware continuous re-routing
- Frotcom live telemetry (DS-001)
- PACK-008 export packaging

## Open questions

| ID | Status | Decision / notes |
|---|---|---|
| OQ-007-01 | **RESOLVED** | **Google Directions API** — simplest integration (static Maps already in PACK-006 ecosystem); $200/mo Google free credit covers early usage; well-documented; sufficient for distance (no truck-specific routing yet). Future: HERE/TomTom if truck constraints (weight/height/tolls/hazmat) required — separate pack. |
| OQ-007-02 | OPEN | Corridor definition (fixed corridors vs dynamic) — caching assumes standard corridors |
| OQ-007-03 | PARTIALLY SET | Methodology: paid (PDF) vs actual (Directions) vs direct (haversine); delta = paid − actual. Corridor matching detail still open. |
| OQ-007-04 | RESOLVED (recommended) | Standard-route cache: TTL **7 days**; key origin+destination; ~80% expected cost reduction. Confirm at Dry-Run if needed. |
| OQ-007-05 | **RESOLVED** | Cost ceiling **$50/month**; warning at **80% ($40)**; kill switch `MAPS_API_ENABLED=false`; fallback static Google Maps link (PACK-006); monitor requests + estimated cost/month. |

## Related

- `blueprint.md` · `requirements.md` · `docs/MAPS-API-SETUP.md`
- ADR-009 §25 · TASK-026 · FU-AI-001 (separate AI tuning)
