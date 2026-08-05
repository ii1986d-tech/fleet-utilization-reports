# PACK-007 — Blueprint (draft)

> Status: **ARCHITECT_PREPARATION**

## High-level data flow

```
Reviewed Order (PACK-006)
        │
        ▼
Corridor matching
        │
        ├─► Cache lookup (standard corridor / OD key)
        │         │ miss
        ▼         ▼
   Maps API call (Directions / Distance Matrix)
        │
        ├─► on failure: safe error + keep paid km; optional static Maps link fallback
        ▼
KM delta calculation (paid vs real/calculated vs direct)
        │
        ▼
UI display (+ optional persist)
```

## Caching

- Cache standard corridor distances server-side before any Maps call.
- Invalidate when corridor definitions change (TBD with OQ-007-04).
- Goal: reduce Maps API cost under OQ-007-05 ceiling.

## Error handling

- Maps quota / network / invalid geocode → controlled failure; no silent overwrite of paid km.
- If Directions unavailable: fall back to existing **static Maps link** (PACK-006) for navigation context only (not a substitute distance unless Architect decides otherwise).

## Secrets

- Maps API key: server-only; never `NEXT_PUBLIC_*`.
