# PACK-007 — Blueprint (draft)

> Status: **ARCHITECT_PREPARATION**  
> Not an Apply pack. No product code until Dry-Run / approval.

## High-level data flow

```
Reviewed Working Order (PACK-006)
        │
        ▼
Corridor matching (4–5 predefined corridors)
        │
        ├─► Cache lookup (corridor / OD key)
        │         │ miss
        ▼         ▼
   Maps API call (Directions / Distance Matrix)
        │
        ▼
KM values: paid (from order) · calculated (corridor/Maps) · direct
        │
        ▼
KM delta presentation (+ optional persist on order)
```

## Caching strategy (cost control)

- Cache standard corridor legs and frequent origin–destination pairs server-side.
- Prefer cache hit before any Maps API call.
- TTL / invalidation TBD in Architect (corridor definition change must invalidate).
- Never log full Maps request/response bodies with addresses beyond safe correlation IDs.

## Dependencies

- PACK-006 confirmed stops + paid kilometers on working order.
- Server-only Maps API key (never `NEXT_PUBLIC_*`).
- DS-005 already covers AI; Maps is a separate vendor/terms decision if required.
