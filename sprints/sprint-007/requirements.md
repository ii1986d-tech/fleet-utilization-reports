# PACK-007 — Requirements (draft)

> Status: **ARCHITECT_DECISIONS_MADE**
> IDs provisional until Dry-Run / formal review.
> Scope expanded 2026-08-06: FR-007-08 / FR-007-09 / FR-007-10

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
| FR-007-08 | **Manual Google Maps link input.** Dispatcher (admin/manager) can manually insert a Google Maps link. The manual link overrides the automatically generated link. Use case: AI extraction recognized address incorrectly; dispatcher knows the correct route. Stored in `transport_order_km_comparison.manual_route_url`. Viewer can see the manual link but cannot edit it. Audit: manual link changes are logged. |
| FR-007-09 | **Manual KM input.** Dispatcher (admin/manager) can manually input KM values. Manual KM overrides automatically calculated KM. Fields that can be manually set: `paid_km` (if PDF extraction was wrong), `actual_km` (if dispatcher knows the actual distance). Use case: AI extraction recognized KM incorrectly, or dispatcher drove a different route. Stored in `transport_order_km_comparison` with `source='manual'`. Viewer can see manual values but cannot edit them. Audit: manual KM changes are logged. |
| FR-007-10 | **Predefined route corridors as selectable options.** Admin can define 4–5 predefined route corridors shown as options in the UI. Dispatcher selects the matching corridor for the order; selection affects KM calculation. Stored in table `route_corridors` with fields: `id`, `name`, `origin`, `destination`, `waypoints`, `description`, `active`. Admin can create, edit, deactivate corridors. Viewer can see corridors but cannot edit them. |

## Non-goals

- Full route optimization / live traffic routing.
- Truck-specific routing (HERE/TomTom) — future pack if needed.
- Replacing Frotcom odometer truth (DS-001).
- PDF/Excel export of order + KM data — **PACK-008**.
