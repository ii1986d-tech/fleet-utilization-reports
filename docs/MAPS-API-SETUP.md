# Google Maps / Directions API setup (PACK-007)

> Server-only keys. Never commit secrets. Never use `NEXT_PUBLIC_*` for Maps keys.  
> Related: `sprints/sprint-007/PACK-007.md` · OQ-007-01 / OQ-007-05

## 1. Create a Google Cloud project + API key

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project for FUR-001.
3. Enable billing on the project (required for Maps Platform API keys).
4. APIs & Services → Library → enable **Directions API** (and only what PACK-007 needs).
5. APIs & Services → Credentials → Create credentials → **API key**.

## 2. Restrict the API key

1. Application restrictions: prefer **IP** restriction for server keys (or referrer only if a browser key is ever required — PACK-007 should use server-side calls).
2. API restrictions: restrict to **Directions API** only (do not leave unrestricted).
3. Store the key only in local/server secret env (e.g. `.env.local` / host secret manager).

## 3. Cost ceiling ($50/month)

| Control | Value |
|---|---|
| Monthly budget | **$50** |
| Warning threshold | **80%** ($40) |
| Kill switch | `MAPS_API_ENABLED=false` |
| Fallback | Static Google Maps link (PACK-006 behavior) |

Also configure Google Cloud **budget alerts** at ~$40 and $50 for the billing account so ops is notified outside the app.

## 4. App env placeholders (names only)

```bash
# Server-only — never NEXT_PUBLIC_*
MAPS_API_KEY=
MAPS_API_ENABLED=false
MAPS_API_MONTHLY_BUDGET=50
MAPS_API_WARNING_THRESHOLD=80
```

Default `MAPS_API_ENABLED=false` until keys, billing, and cost monitoring are ready.

## 5. Security notes (binding)

1. API key must be **server-only** — never `NEXT_PUBLIC_*`.
2. Restrict key to **Directions API** only.
3. Restrict by **IP** (or referrer if unavoidable) when the platform allows.
4. Never commit the key to Git; never paste into chat/tickets.
5. On leak: rotate key in Cloud Console immediately; set kill switch.

## 6. Operational monitoring

- Track Directions request count per month.
- Track estimated cost per month.
- Alert at 80% of $50; disable via kill switch if needed.

## 7. Implementation status

| Part | Scope | Status |
|---|---|---|
| Part 1 | Client + caching + cost tracking | **IMPLEMENTED** |
| Part 2 | KM delta + manual override | **IMPLEMENTED** |
| Part 3 | UI + corridor selection | **IMPLEMENTED** |

### PACK-008 (export)

| Item | Status |
|---|---|
| Excel + PDF export | **IMPLEMENTED** |
| Live AI in PACK-008 | **None** (export uses stored order + KM data only) |

- API key: **NOT YET CONFIGURED** (user will add later in local/server secrets).
- Module path: `src/lib/maps/` (`client`, `cache`, `cost-tracker`, `route-service`, `km-delta-service`, `haversine`).
- Table: `transport_order_km_comparison` (migration `20260806010000_pack007_km_comparison.sql`).
- API: `POST|GET|PATCH /api/transport-orders/[orderId]/km-delta`.
- Tests use mock `fetch` / injectable route + memory store — no live Directions calls in CI.
- Keep `MAPS_API_ENABLED=false` until billing, key restrictions, and budget alerts are ready.

## 8. Manual override (FR-007-08 / FR-007-09)

| Override | Field | Behavior |
|---|---|---|
| Maps link | `manual_route_url` | Overrides auto-generated `route_url` when set |
| Paid KM | `paid_km_manual` | Overrides PDF-extracted `paid_km` when set |
| Actual KM | `actual_km_manual` | Overrides Maps-calculated `actual_km` when set |

- Manual values **always take precedence** over calculated/extracted values (OQ-007-07 recommendation).
- `source` becomes `'manual'` when any override is set.
- Effective route URL = `manual_route_url` if set, else auto `route_url`.
- Admin/manager can set overrides via `PATCH`; viewer can **read** including manuals but cannot edit.
- Safe audit log code only (`km_manual_override`) — no business payloads in logs.

## 9. UI (Part 3)

| Surface | Path |
|---|---|
| Order KM panel | `/settings/orders/[orderId]` — corridor select, Calculate KM, manual overrides |
| Corridor admin | `/settings/corridors` — list / create / deactivate (admin write) |
| Corridor API | `GET|POST /api/route-corridors`, `PATCH /api/route-corridors/[id]` |
| KM API | `POST|GET|PATCH /api/transport-orders/[orderId]/km-delta` (POST accepts `corridorId`) |

- Table: `route_corridors` (migration `20260806020000_pack007_route_corridors.sql`).
- Viewer: read-only for KM + corridors; admin/manager may calculate and set overrides; corridor CRUD is **admin only**.
