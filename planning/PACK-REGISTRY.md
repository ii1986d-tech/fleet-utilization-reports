# Pack Registry

> Updated 2026-07-30 — PACK-002 formal acceptance

| Pack | Version | Goal | Status | Sprint | Approved by | Evidence |
|---|---:|---|---|---|---|---|
| PACK-000 | 1 | Phase 0 discovery & project pack documentation | ACCEPTED | — | Architect (Phase 0) | Phase-0 tree / baseline `6486fa8` |
| PACK-001 | 1 | Phase 1 foundation: Next.js + Supabase auth/roles + master tables + migrations + test infra + mocks | **PACK_001_ACCEPTED** (+ POST_ACCEPTANCE_CHECK_PASS) | sprint-001 | Formal acceptance 2026-07-30 | Checkpoint `20f2698` |
| PACK-002 | 1 | Phase 2: masters + assignments CRUD + mandatory overlap | **PACK_002_ACCEPTED_WITH_FOLLOW_UPS** | sprint-002 | Formal acceptance 2026-07-30 | `ACCEPTANCE-RECORD.md`; `ARCHITECT-REVIEW.md`; `BUILDER-REPORT.md`; migration `20260730140000` |

Former follow-up **DATABASE_APPLY_REQUIRED_BEFORE_PACK-002**: **CLOSED** (PACK-001 remote validation).

**PACK-002:** Formal status **PACK_002_ACCEPTED_WITH_FOLLOW_UPS**. Checkpoint proposal ready — commit requires separate human approval (`PACK_002_CHECKPOINT_READY`).
**PACK-003+:** **blocked** until separate explicit start approval. Accepted PACK-002 follow-ups remain on RSK-012 / TASK-012…016 and are **not** silently moved into PACK-003.

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
