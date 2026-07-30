# Pack Registry

> Updated 2026-07-30 — PACK-004 formally accepted with follow-ups

| Pack | Version | Goal | Status | Sprint | Approved by | Evidence |
|---|---:|---|---|---|---|---|
| PACK-000 | 1 | Phase 0 discovery & project pack documentation | ACCEPTED | — | Architect (Phase 0) | Phase-0 tree / baseline `6486fa8` |
| PACK-001 | 1 | Phase 1 foundation | **PACK_001_ACCEPTED** | sprint-001 | Formal acceptance | Checkpoint `20f2698` |
| PACK-002 | 1 | Phase 2: masters + assignments CRUD + mandatory overlap | **PACK_002_ACCEPTED_WITH_FOLLOW_UPS** | sprint-002 | Formal acceptance | Checkpoint `21ab8aa` |
| PACK-003 | 1 | Phase 3: Excel assignment import | **PACK_003_ACCEPTED_WITH_FOLLOW_UPS** | sprint-003 | Formal acceptance | Checkpoint `a68d8f9` |
| PACK-004 | 1 | Hardening + FU-002/FU-003 evidence (pre-Frotcom) | **PACK_004_ACCEPTED_WITH_FOLLOW_UPS** | sprint-004 | Formal acceptance | `ACCEPTANCE-RECORD.md`; migration `20260730170000` |

**FU-002-01…06** remain on RSK-012 — IDs preserved; live JWT NOT_EXECUTED.
**FU-003-01** **CLOSED**. **FU-003-02 / FU-003-03** remain open on RSK-016.

**PACK-004:** Formally accepted with follow-ups. Checkpoint committed on master (see `git log -1`).
**Reports UI (TASK-009):** deferred — OQ-004-01 **RESOLVED ACCEPT DEFAULT**.
**PACK-005+ / Frotcom:** not started.

Allowed pack flow: DRAFT → PACK_READY → DRY_RUN → APPROVED → BUILDING → VALIDATING → REVIEW → ACCEPTED / REWORK.

## Pack sequence

| Pack | Goal (current plan) |
|---|---|
| PACK-001 | Project foundation |
| PACK-002 | Assignments CRUD |
| PACK-003 | Excel assignment import |
| PACK-004 | **Hardening & follow-ups** (accepted w/ FU) |
| *(deferred)* | Daily reports UI on mocks (former Anweisungen Phase 4 / TASK-009) |
| PACK-005 | Frotcom + n8n (after DS-001) |
| PACK-006 | Excel/PDF exports |
| PACK-007 | Optional management email |
| PACK-008 | Pilot validation |
