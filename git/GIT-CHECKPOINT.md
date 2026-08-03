# Git Checkpoint

> PACK-005 formally accepted with follow-ups — checkpoint **committed** on master

## PACK-005 (current)

- Sprint: sprint-005 / PACK-005
- Baseline (PACK-004 checkpoint): `dbe59da`
- Pack status: **PACK_005_ACCEPTED_WITH_FOLLOW_UPS**
- Checkpoint status: **PACK_005_CHECKPOINT_COMMITTED**
- Pack type: **Evidence closure** (JWT RLS + Import Persistence Proof) — not a product-feature pack
- Architect Review: `sprints/sprint-005/ARCHITECT-REVIEW.md` → ACCEPT_WITH_FOLLOW_UPS
- Acceptance: `sprints/sprint-005/ACCEPTANCE-RECORD.md`
- Evidence: `sprints/sprint-005/EVIDENCE-RUN-RESULTS.json` (37 · 36 PASS · 1 PARTIAL · 0 FAIL)
- Tooling: `scripts/pack005-evidence/` (`.env.local` ignored / untracked)
- Validation environment: remote isolated non-production Supabase
- Local Docker/WSL: environment note only (RSK-009 / FU-002-06 **CLOSED**)
- Migrations: none in PACK-005; Local == Remote unchanged (5 migrations)
- Product code: unchanged

### Gates

| Gate | Result |
|---|---|
| `npm test` | **63/63 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |
| Migration Local == Remote | **PASS** |
| Secret scan | **PASS** |
| `p5ev_*` cleanup | **PASS** (Auth test identities retained) |

### Integrity / evidence highlights

- Live JWT RLS matrix proven (admin/manager/viewer/anon)
- Remote confirm suite C01–C13 PASS; C14 PARTIAL (unit residual)
- Empirical orphan-rollback O01–O03 PASS
- Overlap / end-deactivate / concurrency evidence recorded
- No Frotcom / n8n / reports UI / exports introduced

### Checkpoint commit

- Message: `test: complete PACK-005 evidence closure`
- Hash: see `git log -1 --oneline` on master after acceptance commit

### Follow-ups after PACK-005 acceptance

| ID | Status |
|---|---|
| FU-002-01…04, FU-002-06 | **CLOSED** |
| FU-002-05 | **CLOSED_WITH_RESIDUAL** |
| FU-003-01 | **CLOSED** (PACK-004) |
| FU-003-02 | **CLOSED_WITH_RESIDUAL** |
| FU-003-03 | **CLOSED** |
| OQ-004-04 | **CLOSED / SATISFIED** |

### Accepted residuals (must remain visible)

A. `correctAssignment` missing `FOR UPDATE` (GiST exclusion authoritative)
B. C14 transport-failure remote inject not performed (unit coverage)
C. Local Docker daemon / local Supabase unavailable
D. Non-prod Auth test identities intentionally retained (credentials untracked)

---

## PACK-004 (preserved)

- Checkpoint commit: **`dbe59da`**
- Pack status: **PACK_004_ACCEPTED_WITH_FOLLOW_UPS**
- Migration: `20260730170000_pack004_import_hardening.sql`

---

## PACK-003 (preserved)

- Checkpoint commit: **`a68d8f9`**
- Pack status: **PACK_003_ACCEPTED_WITH_FOLLOW_UPS**
- Migration: `20260730153000_import_jobs_protocol.sql`

---

## PACK-002 (preserved)

- Checkpoint commit: **`21ab8aa`**
- Pack status: **PACK_002_ACCEPTED_WITH_FOLLOW_UPS**
- Migration: `20260730140000_assignment_overlap_guard.sql`

---

## PACK-001 (preserved)

- Checkpoint commit: **`20f2698`**
- Pack status: **PACK_001_ACCEPTED**
- Post-acceptance: **PACK_001_POST_ACCEPTANCE_CHECK_PASS**
