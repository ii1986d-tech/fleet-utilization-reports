# PACK-004 Formal Acceptance Record

> Date: 2026-07-30> Baseline: PACK-003 checkpoint `a68d8f9`> Architect Review: ACCEPT_WITH_FOLLOW_UPS (`ARCHITECT-REVIEW.md`)> Focused correction review: COMPLETE (transport-failure §9 accepted)

## Formal status

**PACK_004_ACCEPTED_WITH_FOLLOW_UPS**

Checkpoint status: **PACK_004_CHECKPOINT_COMMITTED** (see `git log -1` on master)

## Decision

Accept PACK-004 with documented follow-ups. Mandatory transport-failure correction accepted. No acceptance blocker. Formal acceptance updates documentation and Git checkpoint only; product behavior is not changed by this acceptance step.

## Gates (acceptance validation)

| Gate | Result |
|---|---|
| `npm test` | **63/63 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |
| Migration Local == Remote | **PASS** (`20260730170000` included) |

## Delivered

- Migration `20260730170000_pack004_import_hardening.sql` (remote applied; Local == Remote)
- `persist_assignment_import_row` SECURITY INVOKER RPC + CAS `search_path` hardening
- `persistence_errors` separation; validation_* preserved
- Confirm-flow RPC wiring + transport-failure finalize correction
- On-demand formula-safe error-report download (exceljs 4.4.0)
- Narrow UI + `GET /api/import-jobs/[jobId]/error-report`
- Unit/mocked tests including transport correction suite

## Follow-ups (must remain visible; IDs preserved)

| ID | Status | Notes |
|---|---|---|
| FU-003-01 | **CLOSED** | Error report + formula safety (Architect) |
| FU-003-02 | **OPEN** | Confirm/partial/create-on automated DB suite incomplete |
| FU-003-03 | **OPEN** | Empirical orphan-rollback DB proof incomplete (SQL structure accepted) |
| FU-002-01 | **OPEN** | Live JWT RLS NOT_EXECUTED |
| FU-002-02 | **OPEN** | Concurrency harness residual / OQ-004-04 |
| FU-002-03 | **OPEN** | Live bypass → 409 incomplete |
| FU-002-04 | **OPEN** | End/deactivate preserve asserts incomplete |
| FU-002-05 | **OPEN** | Correction locking review incomplete |
| FU-002-06 | **OPEN** | Local Docker env note |

## Explicit non-claims

- Live JWT evidence: **NOT_EXECUTED**
- Empirical DB orphan-rollback automation: **OPEN**
- Concurrent CAS multi-client harness: **NOT_EXECUTED** (where applicable)
- Unit/mocked tests are **not** live or remote DB evidence

## Out of scope confirmation

PACK-005 / Frotcom was **not** started and remains blocked pending separate explicit approval.
Reports dashboard (TASK-009) remains deferred (OQ-004-01).
