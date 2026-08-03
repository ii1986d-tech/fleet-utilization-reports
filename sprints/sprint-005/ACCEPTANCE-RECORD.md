# PACK-005 Formal Acceptance Record

> Date: 2026-08-03
> Baseline (pre-checkpoint HEAD): **`dbe59da`** (`feat: complete PACK-004 import hardening`)
> Architect Review: **ACCEPT_WITH_FOLLOW_UPS** (`ARCHITECT-REVIEW.md`)
> Evidence: `EVIDENCE-RUN-RESULTS.json` (37 total · 36 PASS · 1 PARTIAL · 0 FAIL · 0 BLOCKED)
> Pack type: **Evidence-closure pack** (not a product-feature implementation pack)

## Formal status

**PACK_005_ACCEPTED_WITH_FOLLOW_UPS**

Checkpoint status: **PACK_005_CHECKPOINT_COMMITTED** (see `git log -1` on master after acceptance commit)

## Decision

Formally accept PACK-005 as an **evidence-closure** pack:

- implemented as evidence/architecture tooling and documentation only
- empirically executed against isolated non-production Supabase
- independently Architect-reviewed
- accepted with documented residuals
- **production-ready with documented residuals** for the locked MVP scope
- ready for / included in Git checkpoint

No product-behavior change, no product-code change, and no migration change are part of this acceptance.

## Production-readiness statement

**The locked MVP scope is production-ready with documented residuals.**

### Locked MVP includes

- authentication and role handling (`app_metadata.role`)
- master-data workflows
- assignments
- Excel assignment import
- preview
- validation
- confirmation
- atomic row persistence
- exact-duplicate handling
- overlap handling
- partial-success handling
- audit preservation
- error-report generation
- formula-injection protection
- live JWT/RLS evidence
- empirical remote database persistence and rollback evidence

### Explicitly excluded (not implemented by PACK-005; not claimed)

- Frotcom live integration
- n8n workflows
- reports dashboard
- export modules beyond the accepted import error report
- utilization mathematics UI
- any unapproved future module

## Gates (acceptance validation)

| Gate | Result |
|---|---|
| `npm test` | **63/63 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |
| Migration Local == Remote | **PASS** (5 migrations; unchanged) |
| Evidence JSON validity | **PASS** |
| Secret scan (tracked/staged set) | **PASS** |
| `p5ev_*` fixture cleanup | **PASS** (`COMPLETE_WITH_RETAINED_TEST_IDENTITIES`) |
| `.env.local` ignored | **PASS** |

## Delivered (evidence closure)

- Architect package under `sprints/sprint-005/`
- Access preparation + sanitized evidence tooling under `scripts/pack005-evidence/`
- Live JWT/RLS evidence (FU-002-01)
- Remote DB confirm suite (FU-003-02 core cases)
- Empirical orphan-rollback (FU-003-03)
- Overlap / end-deactivate / concurrency evidence
- Environment note (FU-002-06)
- Architect Review + formal acceptance + SoT reconciliation

## Follow-up closure decisions (IDs preserved; history not erased)

| ID | Prior status (origin) | Acceptance status | Evidence basis | Closure date |
|---|---|---|---|---|
| FU-002-01 | OPEN (PACK-002 / RSK-012) | **CLOSED** | Live JWT matrix J01–J16; `EVIDENCE-RUN-RESULTS.json` | 2026-08-03 |
| FU-002-02 | OPEN residual (PACK-002) | **CLOSED** | Concurrency harness successes=1 failures=1 | 2026-08-03 |
| FU-002-03 | OPEN (PACK-002) | **CLOSED** | Live DB-bypass → `ASSIGNMENT_OVERLAP` | 2026-08-03 |
| FU-002-04 | OPEN (PACK-002) | **CLOSED** | `valid_until` end + `active=false` preserve | 2026-08-03 |
| FU-002-05 | OPEN (PACK-002) | **CLOSED_WITH_RESIDUAL** | Overlap PASS; `FOR UPDATE` gap documented | 2026-08-03 |
| FU-002-06 | OPEN env note (PACK-002 / RSK-009) | **CLOSED** | Docker CLI available; daemon/local Supabase unavailable; remote OK | 2026-08-03 |
| FU-003-01 | **CLOSED** (PACK-004) | **CLOSED** (unchanged) | Error report + formula safety | 2026-07-30 |
| FU-003-02 | OPEN (PACK-003 / RSK-016) | **CLOSED_WITH_RESIDUAL** | C01–C13 remote PASS; C14 unit PARTIAL | 2026-08-03 |
| FU-003-03 | OPEN (PACK-003 / RSK-016) | **CLOSED** | O01–O03 remote orphan rollback | 2026-08-03 |
| OQ-004-04 | BEST-EFFORT (PACK-004) | **CLOSED / SATISFIED** | CAS winners=1; `finalStatus=confirming` expected for CAS probe | 2026-08-03 |

## Accepted residuals (must remain visible)

### A. correctAssignment locking residual (FU-002-05)

- `correctAssignment` does not use `FOR UPDATE`
- a TOCTOU window remains theoretically possible
- the authoritative GiST exclusion constraint still protects database integrity
- no corruption or duplicate assignment was observed
- accepted as a documented residual
- no immediate correction required by PACK-005 acceptance

### B. C14 transport-failure evidence residual (FU-003-02)

- remote forced transport failure was not injected
- behavior remains covered by existing unit tests (`confirm-transport.test.ts`)
- remote core confirmation, persistence, rollback and status behavior passed
- accepted as residual evidence, not a product defect

### C. Local environment residual (FU-002-06 / RSK-009)

- Docker CLI available
- Docker daemon unavailable
- local Supabase unavailable
- remote isolated non-production Supabase evidence completed successfully
- do **not** claim local database evidence

### D. Retained Auth test identities

- admin, manager and viewer PACK-005 test identities remain **intentionally retained**
- non-production environment only (project ref sanitized in evidence docs)
- credentials remain local/untracked (`.env.local`)
- ownership: project operator / Architect — future cleanup or deactivation responsibility after evidence tooling is no longer needed
- passwords, keys and complete identities must **not** appear in tracked records

## Explicit non-claims

- PACK-005 did **not** implement product features
- No migration was added or altered
- No Frotcom / n8n / reports dashboard / export modules were introduced
- C14 is **PARTIAL** (unit), not live remote transport injection
- Local Docker/Supabase database testing did **not** occur

## Out of scope confirmation

Frotcom + n8n remain blocked by DS-001 and are **not** assigned to an automatic next pack.
Reports dashboard (TASK-009) remains deferred (OQ-004-01).
Exports (TASK-011) remain future work.
