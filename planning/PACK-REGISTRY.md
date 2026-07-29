# Pack Registry

> Updated after DB apply follow-up attempt — 2026-07-29

| Pack | Version | Goal | Status | Sprint | Approved by | Evidence |
|---|---:|---|---|---|---|---|
| PACK-000 | 1 | Phase 0 discovery & project pack documentation | ACCEPTED | — | Architect (Phase 0) | Phase-0 tree / baseline `6486fa8` |
| PACK-001 | 1 | Phase 1 foundation: Next.js + Supabase auth/roles + master tables + migrations + test infra + mocks | **ACCEPTED WITH FOLLOW-UP** | sprint-001 | Architect Review 2026-07-29 | `ARCHITECT-REVIEW.md`; impl `8a922df` |

Follow-up on PACK-001: **DATABASE_APPLY_REQUIRED_BEFORE_PACK-002**  
Follow-up state: **DATABASE_APPLY_BLOCKED_ENVIRONMENT** (no Docker/Podman/local Postgres)

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
