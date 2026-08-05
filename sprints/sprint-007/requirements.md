# PACK-007 — Requirements (draft)

> Status: **ARCHITECT_PREPARATION**  
> IDs provisional until Architect review.

## Functional requirements

| ID | Requirement |
|---|---|
| FR-007-01 | Define route corridors (origin, destination, waypoints). |
| FR-007-02 | Match reviewed order to a corridor. |
| FR-007-03 | Call Maps API for route distance (or serve from cache). |
| FR-007-04 | Calculate KM delta (paid vs real/calculated vs direct). |
| FR-007-05 | Display KM comparison in UI. |
| FR-007-06 | Cache standard corridor distances. |
| FR-007-07 | Handle Maps API errors gracefully (no silent overwrite of paid km; static Maps link fallback where appropriate). |

## Non-goals (draft)

- Full route optimization / live traffic routing.
- Replacing Frotcom odometer truth (DS-001).
