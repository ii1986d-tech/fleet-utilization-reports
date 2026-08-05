# PACK-007 — Blueprint (draft)

> Status: **ARCHITECT_DECISIONS_MADE**

## High-level data flow

```
Reviewed Order (PACK-006)
        │
        ▼
Extract stops (origin, destination)
        │
        ▼
Corridor matching
        │
        ├─► Cache lookup (standard corridor / origin+destination)
        │         │ miss
        ▼         ▼
Google Directions API call
        │
        ├─► on failure: retry once (timeout) → static Maps link fallback
        ▼
Distance calculation
        │
        ▼
KM delta (paid vs actual vs direct)
        │
        ▼
Display in UI (+ optional persist)
```

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

Static Maps link = existing PACK-006 navigation context; not a substitute distance unless Architect later decides otherwise.

## Cost tracking

- Track number of API requests per month.
- Track estimated cost per month.
- Alert at **80%** of **$50** budget ($40).
- Kill switch disables further API calls.

## Secrets

- Maps API key: server-only; never `NEXT_PUBLIC_*`; never commit.
