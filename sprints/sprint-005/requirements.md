# Requirements — PACK-005 (Evidence Closure)

> Baseline `dbe59da` · Status **PACK_005_ARCHITECT_READY** · Apply blocked
> Product scope: **NONE** · Migration expectation: **NONE**

## REQ-P5-OBJ — Sole objective

Produce empirical evidence for accepted PACK-001…004 behavior. No new product features.

## REQ-P5-FU — Follow-up contract (summary)

Detailed contracts: `EVIDENCE-PLAN.md`. IDs **must not** be renumbered.

| ID | Origin | Exact claim to prove | Mandatory? |
|---|---|---|---|
| FU-002-01 | PACK-002 / RSK-012 / TASK-012 | Under real Auth JWT: admin allow writes; manager/viewer/unauth deny writes; RLS + app gates hold for masters, assignments, import_*, RPC | Yes (prod claim) |
| FU-002-02 | PACK-002 / RSK-012 / TASK-013 | Parallel overlapping assignment writes: ≤1 success; loser 409/constraint | Optional residual |
| FU-002-03 | PACK-002 / RSK-012 / TASK-014 | DB-bypass insert violating exclusion → app/API surfaces 409 `ASSIGNMENT_OVERLAP` | Yes (prod claim) |
| FU-002-04 | PACK-002 / RSK-012 / TASK-015 | End/deactivate leaves row queryable (no hard DELETE) | Yes |
| FU-002-05 | PACK-002 / RSK-012 / TASK-016 | ADR-006 correction path locking reviewed; gaps documented or targeted fix authorized | Yes (review) |
| FU-002-06 | PACK-002 / RSK-009 | Local Docker/WSL unavailability documented as env residual | Document only |
| FU-003-02 | PACK-003 / RSK-016 / TASK-018 | Confirm/partial/create-on/counters/finalize suite against real DB | Yes (prod claim) |
| FU-003-03 | PACK-003 / RSK-016 / TASK-019 | Empirical orphan driver/customer rollback on assignment persist failure | Yes (prod claim) |
| OQ-004-04 | PACK-004 | Best-effort concurrent confirm CAS evidence | Desirable |

### ID clarification (binding)

- **FU-002-06** = local Docker environment note (RSK-009), **not** concurrency.
- Concurrent assignment race = **FU-002-02** (accepted residual).
- Concurrent import confirm CAS = **OQ-004-04** / RSK-015 (BEST-EFFORT).

## REQ-P5-ENV — Environments

| Evidence cluster | Preferred | Acceptable substitute |
|---|---|---|
| Live JWT / RLS | Remote approved isolated development Supabase + Auth users | Local Supabase Auth if available |
| Confirm DB suite | Remote development DB **or** local Supabase | Both preferred when available |
| Orphan rollback | Same DB as confirm suite | Must be non-production |
| Concurrency | Remote or local with parallel clients | May remain residual per OQ-004-04 |

**Forbidden:** production credentials; destructive production testing; service-role as end-user RLS proof.

## REQ-P5-ROLES — Actual repository roles

From `docs/AUTH-ROLES.md` + `src/lib/auth/roles.ts`:

| Role | Claim path | Masters/assignments write | Import write | Reports read (future) |
|---|---|---|---|---|
| `admin` | `app_metadata.role` | Yes | Yes | Yes |
| `manager` | `app_metadata.role` | No (read) | No | Yes |
| `viewer` | `app_metadata.role` | No (read) | No | Yes |
| Unauthenticated | — | Deny | Deny | Deny |

No other product roles exist.

## REQ-P5-DEFECT — Defect-discovery policy

If evidence testing reveals a defect:

1. **Stop** the affected evidence case.
2. Record exact reproduction in `EVIDENCE-LOG.md` (`failed`).
3. Classify severity and scope.
4. **Do not** silently fix product code.
5. **Do not** create migrations.
6. Return to Architect for **targeted correction authorization**.
7. Continue only independent, safe evidence cases.

PACK-005 is evidence-first, not an unrestricted repair pack.

## REQ-P5-ART — Evidence artifacts

| Artifact | Rule |
|---|---|
| `EVIDENCE-LOG.md` | Status ∈ {planned, executed, passed, failed, blocked, not_executed} |
| Planned ≠ executed | No planned test may be recorded as executed |
| Closure | FU closes only on `passed` (or explicit residual sign-off allowed by contract) |

## Non-goals

Frotcom · n8n · reports UI · exports · vehicle auto-create · new migrations · silent product fixes · closing FU without evidence
