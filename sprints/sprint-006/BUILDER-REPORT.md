# PACK-006 — Builder Report

> Date: **2026-08-05**
> Pack: PACK-006 — PDF transport-order extraction + field confirmation
> Status: **COMPLETE** — implementation + closeout + provider wiring committed and pushed

## Scope delivered

Implementation covers Dry-Run INC-01…11 under default `TRANSPORT_ORDER_PROVIDER=mock`, plus live provider wiring (still mock-default):

- Private PDF upload / Storage path registration
- Mock extraction + immutable snapshot materialization
- Live adapters wired: Gemini, OpenAI-compatible (Grok/Groq/Qwen), Manual skeleton
- Working order + stops (`stop_id`) + partial loads / legs
- Field review states; admin/manager mutate; viewer RO
- Explicit Save; Bestätigen / Fehlt / Nicht zutreffend
- Stop reorder (drag + keyboard) + stop-order confirm
- Server Weiter / completion gate + audit events
- Aggregate CAS / idempotency paths exercised in evidence
- Static Maps link helper (no routing API)

## Schema / migration

| Item | Value |
|---|---|
| Migration | `supabase/migrations/20260804160000_pack006_transport_order_domain.sql` |
| Local apply | Applied for evidence / smoke (local Supabase) |

## Quality gates

| Gate | Result |
|---|---|
| Tests | **PASS** — closeout baseline 93/93; after provider wiring **146 passed / 30 skipped** |
| Lint | **PASS** |
| Typecheck | **PASS** |
| Build | **PASS** |
| Preflight | **PACK006_PREFLIGHT_PASS** |
| Live DB evidence | **11 / 1 skip / 0 fail** |
| Synthetic UAT | **19/19 PASS** |
| Manual browser smoke | **PASS** (human: I. Dimitrov, 2026-08-05) — 30/30 |

## Decisions

| Decision | Result |
|---|---|
| DS-005 | **APPROVED** — Gemini primary (free-tier pilot); Grok/Qwen/Manual fallbacks; Groq Tier 2 alt; real PDFs permitted; AVV not required |
| ASM-014 | **Duration SET** (7y/7y/7y/10y); yearly expire; legal hold; 30d backup lag; legal validation follow-up before production auto-purge |

## Out of scope / deferred

- PACK-007 corridors / km comparison (**NOT_STARTED**)
- PACK-008 export
- Frotcom (DS-001)
- Production auto-purge (ASM-014 legal follow-up)
- Committing `references/private/**`

## Git

| Item | Value |
|---|---|
| PACK-006 Apply | `08acb65` |
| Security audit safe fixes | `55eabf3` |
| FU-SEC docs | `01b0657` |
| Live AI provider wiring | `09fb2a6` |
| Gemini pilot prep + `GEMINI_MODEL_ID` | `f933de4` / `3bbd605` |
| Working tree at finalize | Docs-only closeout commit (no product code) |
| Push | Performed for the above commits; closeout docs follow |

## Recommendation

PACK-006 is **COMPLETE**. Next: Gemini free-tier pilot (ops) when authorized; then **PACK-007** (Routenlogik + KM-Vergleich) on product authorization.
