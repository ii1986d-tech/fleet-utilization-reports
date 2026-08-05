# PACK-007 — Route logic & kilometer comparison

> Status: **ARCHITECT_DECISIONS_MADE**
> Date opened: **2026-08-05**
> Scope expanded: **2026-08-06** (FR-007-08 / FR-007-09 / FR-007-10)
> Dependencies: **PACK-006 COMPLETE**, **DS-005 APPROVED**

## Goal

Compute and present kilometer comparisons for a reviewed transport order using predefined route corridors, Google Maps Directions, and deltas versus PDF-paid km — with dispatcher overrides for Maps link and KM when extraction or routing is wrong.

## In scope

- Route corridor definition and matching
- Google Directions API integration (distance)
- KM comparison: **paid** (PDF) vs **actual** (Directions) vs **direct** (haversine)
- Caching of standard corridor distances (API cost control)
- Admin/manager compute/refresh; viewer read-only
- **FR-007-08:** Manual Google Maps link input (dispatcher override)
- **FR-007-09:** Manual KM input (dispatcher override for paid/actual)
- **FR-007-10:** Predefined route corridors as selectable options (4–5 corridors)

## Out of scope

- Full multi-stop route optimization / TSP
- Live traffic-aware continuous re-routing
- Frotcom live telemetry (DS-001)
- PACK-008 export packaging (PDF/Excel)

## Open questions

| ID | Status | Decision / notes |
|---|---|---|
| OQ-007-01 | **RESOLVED** | **Google Directions API** — simplest integration (static Maps already in PACK-006 ecosystem); $200/mo Google free credit covers early usage; well-documented; sufficient for distance (no truck-specific routing yet). Future: HERE/TomTom if truck constraints (weight/height/tolls/hazmat) required — separate pack. |
| OQ-007-02 | OPEN | Corridor definition (fixed corridors vs dynamic) — caching assumes standard corridors; see also FR-007-10 / OQ-007-06 |
| OQ-007-03 | PARTIALLY SET | Methodology: paid (PDF) vs actual (Directions) vs direct (haversine); delta = paid − actual. Corridor matching detail still open. |
| OQ-007-04 | RESOLVED (recommended) | Standard-route cache: TTL **7 days**; key origin+destination; ~80% expected cost reduction. Confirm at Dry-Run if needed. |
| OQ-007-05 | **RESOLVED** | Cost ceiling **$50/month**; warning at **80% ($40)**; kill switch `MAPS_API_ENABLED=false`; fallback static Google Maps link (PACK-006); monitor requests + estimated cost/month. |
| OQ-007-06 | **PENDING** | Corridor definition storage — options: Supabase table vs JSON file vs hardcoded. **Recommendation: Supabase table (`route_corridors`)**. |
| OQ-007-07 | **PENDING** | Manual override precedence — if both calculated and manual values exist, which wins? **Recommendation: manual values always take precedence.** |

## Related

- `blueprint.md` · `requirements.md` · `docs/MAPS-API-SETUP.md`
- ADR-009 §25 · TASK-026 · TASK-034…036 · FU-AI-001 (separate AI tuning)
- Export: TASK-027 / PACK-008
