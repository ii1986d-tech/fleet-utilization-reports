# Pack Registry

> Updated 2026-07-30 — PACK-001 formal acceptance

| Pack | Version | Goal | Status | Sprint | Approved by | Evidence |
|---|---:|---|---|---|---|---|
| PACK-000 | 1 | Phase 0 discovery & project pack documentation | ACCEPTED | — | Architect (Phase 0) | Phase-0 tree / baseline `6486fa8` |
| PACK-001 | 1 | Phase 1 foundation: Next.js + Supabase auth/roles + master tables + migrations + test infra + mocks | **PACK_001_ACCEPTED** (+ **POST_ACCEPTANCE_CHECK_PASS**) | sprint-001 | Formal acceptance 2026-07-30 | Remote migrate+schema+RLS; post-acceptance test/lint/build; `PACK-VALIDATION.md`; impl `8a922df` |

Former follow-up **DATABASE_APPLY_REQUIRED_BEFORE_PACK-002**: **CLOSED** via approved remote Supabase validation (project-ref `ootsmrriuyesieblxudc`).

Local Docker/WSL limitation: environment note only — not an active PACK-001 blocker.

**PACK-002:** blocked until separate explicit start approval. Not prepared or implemented.

Allowed pack flow: DRAFT → PACK_READY → DRY_RUN → APPROVED → BUILDING → VALIDATING → REVIEW → ACCEPTED / REWORK.

## Pack sequence (from Anweisungen §19)

| Pack | Phase | Goal |
|---|---|---|
| PACK-001 | 1 | Project foundation |
| PACK-002 | 2 | Assignments CRUD |
| PACK-003 | 3 | Excel assignment import |
| PACK-004 | 4 | Daily reports UI on mocks |
| PACK-005 | 5 | Frotcom + n8n (after DS-001) |
| PACK-006 | 6 | Excel/PDF exports |
| PACK-007 | 7 | Optional management email |
| PACK-008 | 8 | Pilot validation |
