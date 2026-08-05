# PACK-007 — Blueprint (draft)

> Status: **ARCHITECT_DECISIONS_MADE**
> Scope expanded 2026-08-06: manual override + corridor selection (FR-007-08…10)

## High-level data flow

```
Reviewed Order (PACK-006)
        │
        ▼
Extract stops (origin, destination)
        │
        ▼
Corridor selection (dispatcher chooses from 4–5 options
                    OR "direct route" if none match)
        │
        ▼
KM calculation (via selected corridor OR manual input)
        │
        ├─► Cache lookup (standard corridor / origin+destination)
        │         │ miss
        ▼         ▼
Google Directions API call
        │
        ├─► on failure: retry once (timeout) → static Maps link fallback
        ▼
KM delta comparison (paid vs actual vs direct)
        │
        ▼
Display in UI (+ optional persist)
```

## Manual override and corridor selection

### Manual override flow

Dispatcher (admin/manager) can override:

| Field | Storage / note |
|---|---|
| Google Maps link | `manual_route_url` |
| Paid KM | manual `paid_km` |
| Actual KM | manual `actual_km` |

- Manual values take precedence over calculated values (pending OQ-007-07 confirmation).
- Source indicator: `'manual'` vs `'api'` vs `'cache'` (and fallback as applicable).
- All manual changes are logged for audit.
- Viewer: read-only for manual fields.

### Corridor selection flow

- Dispatcher sees **4–5** predefined corridors in the UI.
- Dispatcher selects the matching corridor for the order.
- KM calculation uses the selected corridor.
- If no corridor matches, dispatcher can choose **"direct route"** (no corridor).
- Corridors stored in `route_corridors` (pending OQ-007-06 confirmation).

## Maps API integration

- Provider: **Google Directions API** (OQ-007-01).
- Server-only API key; never `NEXT_PUBLIC_*` (see `docs/MAPS-API-SETUP.md`).
- Kill switch: `MAPS_API_ENABLED=false` disables live Directions calls.

## Caching strategy

| Rule | Value |
|---|---|
| What | Standard corridors (frequently used routes) |
| TTL | **7 days** (routes rarely change) |
| Cache key | origin + destination |
| Non-standard routes | Live API call (no cache) |
| Expected cost reduction | ~**80%** |
| Invalidation | Manual (admin can clear cache) |

## Error handling

| Case | Behavior |
|---|---|
| API timeout | Retry **once**, then fall back to static Maps link |
| Quota exceeded | Fall back to static Maps link |
| Other API error | Log safe error (no request/response dumps), fall back to static Maps link |

Static Maps link = existing PACK-006 navigation context; not a substitute distance unless Architect later decides otherwise. Manual link (FR-007-08) overrides generated/static link when set.

## Cost tracking

- Track number of API requests per month.
- Track estimated cost per month.
- Alert at **80%** of **$50** budget ($40).
- Kill switch disables further API calls.

## Secrets

- Maps API key: server-only; never `NEXT_PUBLIC_*`; never commit.

## Export

- PDF/Excel packaging of order + KM comparison → **PACK-008** (out of PACK-007).
