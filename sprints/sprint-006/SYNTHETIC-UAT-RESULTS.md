# PACK-006 — Synthetic UAT results

> Status: **EXECUTED**
> Executed at: `2026-08-05T09:50:30Z` (approx; see `SYNTHETIC-UAT-RESULTS.json`)
> Target: local Supabase only
> Provider: **mock** only
> DS-005: **OPEN** (no live Gemini/xAI/Grok)
> ASM-014 retention duration: **OPEN**
> Machine evidence: `npm run pack006:synthetic-uat` → 19 passed / 0 failed / 0 blocked
> Artifact: `sprints/sprint-006/SYNTHETIC-UAT-RESULTS.json`

Original scenario definitions remain in `SYNTHETIC-UAT-PLAN.md` (updated Pass/Fail evidence columns).

## Verification channels (do not conflate)

| Channel | Count | Meaning |
|---|---|---|
| API / server (RPC + DB) | **18** | Live local Supabase JWT sessions; mock extract/materialize/persist |
| Unit product code | **1** | UAT-07 `validatePdfUpload` (same gate used by upload store) |
| Mixed (API + static UI source) | **1** | UAT-11 reorder RPC + keyboard/drag controls present in page source |
| Browser interactive UI | **0** | Not automated this run — **do not claim UI PASS from API alone** |

Static UI source checks (not browser interactive):

- Speichern / Bestätigen / Fehlt / **Nicht zutreffend** / Stoppreihenfolge bestätigen / Weiter / Move stop up|down / drag — present in `app/settings/orders/[orderId]/page.tsx`
- `beforeunload` unsaved-change warning — present
- Create synthetic order — present on list page
- Not applicable UI control — **present** (`data-action="not_applicable"`, label `Nicht zutreffend`)
- Browser interactive UI — **still not verified**

## Summary

| Metric | Value |
|---|---|
| Scenarios total | 19 |
| Passed | 19 |
| Failed | 0 |
| Blocked | 0 |
| Defects open | 0 |

## Defects

| ID | Severity | Scenario | Status |
|---|---|---|---|
| UAT-DEF-001 | low | UAT-13 | **RESOLVED** (static/source + unit/store tests). Detail UI adds `Nicht zutreffend` beside Bestätigen/Fehlt; confirmation when value present; viewer write controls disabled. Browser interactive verification not claimed. |

## Per-scenario evidence

| ID | Role | Channel | Verdict | Version | Error | Notes |
|---|---|---|---|---|---|---|
| UAT-01 | admin | api_server | PASS | 1→4 | — | extraction_completed + field_confirmed×n + stop_order_confirmed + review_completed |
| UAT-02 | manager | api_server | PASS | 1→4 | — | 2 PL share one delivery_stop_id |
| UAT-03 | admin | api_server | PASS | 1→4 | — | 4 stops, 2 legs, valid stop_ids |
| UAT-04 | manager | api_server | PASS | 1→4 | — | 3-PL synthetic persist fixture (mock provider label); null cargo preserved |
| UAT-05 | admin | api_server | PASS | 1→5 | ORDER_REVIEW_INCOMPLETE (early) | street missing_confirmed then complete |
| UAT-06 | manager | api_server | PASS | 1→4 | — | paid=787 Line Haul Units; freight=1018.71 Grand Total |
| UAT-07 | admin | unit_product_code | PASS | — | INVALID_PDF | 5 invalid variants; no DB order |
| UAT-08 | admin×2 | api_server | PASS | — | IDEMPOTENCY_KEY_REUSE_MISMATCH | reuse same PDF; conflict different PDF |
| UAT-09 | admin | api_server | PASS | 1→2 | ORDER_VERSION_CONFLICT | winner SYN-EDIT-WIN |
| UAT-10 | admin+manager | api_server | PASS | 1→2 | ORDER_VERSION_CONFLICT | exactly one winner |
| UAT-11 | manager | mixed | PASS | 1→3 | ORDER_VERSION_CONFLICT (stale) | stable stop_ids; PL FKs; keyboard+drag wired |
| UAT-12 | admin | api_server | PASS | 1→5 | — | trailer missing_confirmed |
| UAT-13 | manager | mixed | PASS | 1→5 | — | not_applicable via RPC; UI `Nicht zutreffend` present (UAT-DEF-001 resolved; browser not claimed) |
| UAT-14 | admin | api_server | PASS | 1→1 | ORDER_REVIEW_INCOMPLETE | conflict fixture via local privileged SQL |
| UAT-15 | admin | api_server | PASS | —→1 | EXTRACTION_FAILED | terminal fail; success only with new extract key |
| UAT-16 | admin | api_server | PASS | 1→1 | ORDER_REVIEW_INCOMPLETE | no review_completed; version unchanged |
| UAT-17 | viewer | api_server | PASS | 1→1 | FORBIDDEN | read ok; mutate/reorder/complete denied |
| UAT-18 | admin | api_server | PASS | 1→5 | — | edit + maps static link + review_completed×1 |
| UAT-19 | manager | api_server | PASS | 1→4 | — | actor_role=manager on review_completed |

Full step/audit arrays: `SYNTHETIC-UAT-RESULTS.json`.

## Constraints observed

- No `references/private/**`
- No Gemini / xAI / Grok / Maps routing APIs
- Local Supabase + mock provider only
- DS-005 and ASM-014 left OPEN
- Nothing staged, committed, or pushed by this UAT run

## How to re-run

```bash
npm run pack006:synthetic-uat
```

Requires `scripts/pack006-evidence/.env.local`, local Supabase up, provisioned admin/manager/viewer users, `PACK006_PREFLIGHT_PASS`.
