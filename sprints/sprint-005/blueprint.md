# Blueprint — PACK-005 Evidence Closure

> Status: **PACK_005_ARCHITECT_READY** · Baseline `dbe59da` · Apply blocked

## Design intent

PACK-005 is a **verification pack**. Implementation already exists under PACK-001…004. Builder work under Apply is limited to:

1. Evidence harnesses / scripts / tests that exercise real Auth JWT and real DB
2. Recording results in `EVIDENCE-LOG.md` and pack TEST-MATRIX
3. Targeted correction **only** if Architect authorizes after a failed evidence case

## Architecture constraints (reuse; do not redesign)

| Layer | Contract |
|---|---|
| Roles | `admin` / `manager` / `viewer` via `app_metadata.role` |
| App gates | `requireAdmin` for writes/import; `requireAuthenticated` for reads |
| RLS | `is_admin()` writes; `is_authenticated_role()` selects on masters/assignments; import_* admin-only |
| Persist RPC | `persist_assignment_import_row` SECURITY INVOKER; `auth.uid()`; subtransaction orphan rollback |
| CAS | `begin_import_job_confirm`; double-confirm 409 |
| Overlap | GiST exclusion + app 409 `ASSIGNMENT_OVERLAP` |
| Soft end | No hard DELETE (ADR-006) |

## Workstreams

| WS | Content | Product code? |
|---|---|---|
| A | Live JWT RLS matrix (FU-002-01) | No |
| B | Assignment evidence (FU-002-03, FU-002-04, optional FU-002-02) | No |
| C | Correction locking review (FU-002-05) | Only if authorized fix |
| D | Env residual note (FU-002-06) | No |
| E | Confirm DB suite (FU-003-02) | No |
| F | Orphan rollback empirical (FU-003-03) | No |
| G | Best-effort concurrent CAS (OQ-004-04) | No |

## Fixture strategy

- Namespace: `p5ev_` prefix on plates/names/notes
- Prefer isolated vehicles/drivers/customers per case
- Cleanup after evidence capture
- Never use production data

## Orphan failure injection

Primary method: **create-missing ON + forced exclusion_violation** (overlap). Proves driver/customer inserts inside the RPC subtransaction roll back. No schema change. No production testing.

## Transport-failure path

Unit/mocked coverage already exists from PACK-004. DB injection is optional if a realistic non-destructive inject exists; do not weaken production error handling to make the test easier.

## Complexity

**Small–medium** — mostly environment + harness + disciplined logging.

## Estimated active effort

| Band | Assumption |
|---|---|
| 0.5–1 day | Auth users ready; remote DB access; local optional |
| 1–2 days | Auth user creation friction; env blocks; residual documentation |
| +targeted correction | Only if defect found (separate authorization) |

## Environmental risk

- Auth test users missing → FU-002-01 **blocked** (cannot claim production-ready)
- Local Docker absent → FU-002-06 residual; use remote
- Concurrent harness flaky → OQ-004-04 / FU-002-02 remain residual per contract
