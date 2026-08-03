# PACK-005 — Evidence Closure (JWT RLS + Import Persistence Proof)

> Status: **PACK_005_ACCEPTED_WITH_FOLLOW_UPS**
> Baseline: **`dbe59da`** (`feat: complete PACK-004 import hardening`)
> Mode: **Evidence only** — no product features
> Architect recommendation: **ACCEPT_WITH_FOLLOW_UPS** (`ARCHITECT-REVIEW.md`)
> Formal acceptance: **`ACCEPTANCE-RECORD.md`**
> Evidence: `EVIDENCE-RUN-RESULTS.json` (37 · 36 PASS · 1 PARTIAL · 0 FAIL)
> Production-readiness: **locked MVP is production-ready with documented residuals**

## Objective

Gather and record **empirical evidence** for previously implemented and accepted behavior from PACK-001…004. Close open follow-ups **only** with executed evidence (or explicit residual sign-off allowed by existing contracts).

PACK-005 **did not** add product functionality.

## In scope (disposition at acceptance)

| ID | Claim class | Closure |
|---|---|---|
| FU-002-01 | Live JWT / RLS matrix | **CLOSED** |
| FU-002-02 | Parallel assignment race harness | **CLOSED** |
| FU-002-03 | Live DB-bypass → 409 `ASSIGNMENT_OVERLAP` | **CLOSED** |
| FU-002-04 | End/deactivate row-preservation asserts | **CLOSED** |
| FU-002-05 | ADR-006 correction locking review | **CLOSED_WITH_RESIDUAL** |
| FU-002-06 | Local Docker unavailability (RSK-009) | **CLOSED** |
| FU-003-02 | Confirm / partial / create-on DB suite | **CLOSED_WITH_RESIDUAL** (C14 unit) |
| FU-003-03 | Empirical orphan-rollback proof | **CLOSED** |
| OQ-004-04 | Concurrent confirm CAS | **CLOSED / SATISFIED** |

## Out of scope (held)

- Frotcom live integration / inventing endpoints
- n8n workflows
- Reports dashboard (TASK-009 / OQ-004-01)
- Excel/PDF exports (TASK-011)
- Any new business module or UI feature
- Migrations
- Product-code changes
- Production credential use / destructive production testing
- Service-role execution as proof of end-user RLS

## Accepted residuals

A. `correctAssignment` `FOR UPDATE` gap · B. C14 unit-only · C. local Docker/Supabase unavailable · D. retained non-prod Auth test identities

See `ACCEPTANCE-RECORD.md` for full wording.
