# PACK-006 — Builder Report

> Date: **2026-08-05**
> Pack: PACK-006 — PDF transport-order extraction + field confirmation (mock path Apply)
> Status: **CLOSEOUT COMPLETE — READY_FOR_COMMIT** (staging prepared; push not performed)

## Scope delivered

Implementation covers Dry-Run INC-01…11 intent under `TRANSPORT_ORDER_PROVIDER=mock` until post-commit provider configuration:

- Private PDF upload / Storage path registration
- Mock extraction + immutable snapshot materialization
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
| Remote apply | Not claimed in this report |

## Quality gates

| Gate | Result |
|---|---|
| Tests | **93/93 PASS** |
| Lint | **PASS** |
| Typecheck | **PASS** |
| Build | **PASS** |
| Preflight | **PACK006_PREFLIGHT_PASS** |
| Live DB evidence | **11 / 1 skip / 0 fail** |
| Synthetic UAT | **19/19 PASS** |
| Manual browser smoke | **PASS** (human: I. Dimitrov, 2026-08-05) |

## Decisions

| Decision | Result |
|---|---|
| DS-005 | **APPROVED** — Gemini primary; Groq/Qwen/Manual fallbacks; real PDFs permitted; AVV not required |
| ASM-014 | Pragmatic durations set (7y/7y/7y/10y); yearly expire; legal hold; 30d backup lag; legal validation follow-up before production auto-purge |

## Out of scope / deferred

- Live Gemini/Groq/Qwen SDK wiring (post-commit configuration)
- PACK-007 corridors / km comparison
- PACK-008 export
- Frotcom (DS-001)
- Committing `references/private/**`

## Git

| Item | Value |
|---|---|
| Working tree at report time | Dirty — PACK-006 Apply + docs |
| Staging | Prepared for commit (no secrets / no `.env.local` / no `references/private/**`) |
| Commit | Not created in this report step |
| Push | Not performed |

## Recommendation

Proceed to **commit** after staging verification. Configure live providers only after commit, under DS-005 APPROVED constraints.
