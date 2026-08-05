# PACK-007 — Requirements (draft)

> Status: **ARCHITECT_PREPARATION**  
> IDs are provisional until Architect review.

## Functional requirements (initial)

| ID | Requirement |
|---|---|
| FR-007-01 | System shall allow admin to define **4–5 predefined route corridors** (name, ordered waypoints or OD endpoints, active flag). |
| FR-007-02 | For a reviewed transport order, system shall attempt to **match** the order’s stops to a corridor (rule TBD: auto and/or manual select). |
| FR-007-03 | System shall obtain **calculated km** for the matched corridor path via Maps API (or cache). |
| FR-007-04 | System shall compute or obtain **direct km** between primary pickup and delivery (definition TBD). |
| FR-007-05 | UI shall display **PDF paid km**, **calculated km**, and **direct km**, plus signed **deltas** (paid − calculated, paid − direct, calculated − direct). |
| FR-007-06 | Viewer may **read** km comparison; only admin/manager may refresh/recompute or change corridor selection. |
| FR-007-07 | Standard corridor results shall be **cacheable** to limit Maps API cost; cache miss triggers one bounded API call. |
| FR-007-08 | Failures (Maps quota, no match) shall surface safe errors; no silent overwrite of paid km. |

## Non-goals (draft)

- Automatic fleet routing / live traffic optimization.
- Replacing Frotcom odometer truth (future DS-001).
