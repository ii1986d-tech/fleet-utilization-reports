# PACK-007 — Requirements (draft)

> Status: **ARCHITECT_DECISIONS_MADE**
> IDs provisional until Dry-Run / formal review.

## Functional requirements

| ID | Requirement |
|---|---|
| FR-007-01 | Define route corridors (origin, destination, waypoints). Corridors are defined by admin/manager. Corridors may be **standard** (cached) or **custom** (live API). |
| FR-007-02 | Match reviewed order to corridor by origin + destination. If no corridor matches, use direct route (haversine / non-corridor path). |
| FR-007-03 | Call **Google Directions API** for route distance. Cache standard corridors. Fall back to static Maps link on error. |
| FR-007-04 | Calculate KM delta: **paid** from PDF extraction (PACK-006); **actual** from Google Directions; **direct** via haversine; **delta** = paid − actual. |
| FR-007-05 | Display paid KM, actual KM, direct KM, and delta (paid − actual). Highlight if delta > **10%**. |
| FR-007-06 | Cache standard corridor distances: TTL **7 days**; key origin + destination; manual invalidation (admin clear). |
| FR-007-07 | Handle Maps API errors: timeout → retry once then fallback; quota exceeded → static Maps link; other errors → log + static Maps link. |

## Non-goals

- Full route optimization / live traffic routing.
- Truck-specific routing (HERE/TomTom) — future pack if needed.
- Replacing Frotcom odometer truth (DS-001).
