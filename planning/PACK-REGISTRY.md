# Pack Registry

> Updated 2026-08-03 — PACK-005 formally accepted with follow-ups (evidence closure)

| Pack | Version | Goal | Status | Sprint | Approved by | Evidence |
|---|---:|---|---|---|---|---|
| PACK-000 | 1 | Phase 0 discovery & project pack documentation | ACCEPTED | — | Architect (Phase 0) | Phase-0 tree / baseline `6486fa8` |
| PACK-001 | 1 | Phase 1 foundation | **PACK_001_ACCEPTED** | sprint-001 | Formal acceptance | Checkpoint `20f2698` |
| PACK-002 | 1 | Phase 2: masters + assignments CRUD + mandatory overlap | **PACK_002_ACCEPTED_WITH_FOLLOW_UPS** | sprint-002 | Formal acceptance | Checkpoint `21ab8aa` |
| PACK-003 | 1 | Phase 3: Excel assignment import | **PACK_003_ACCEPTED_WITH_FOLLOW_UPS** | sprint-003 | Formal acceptance | Checkpoint `a68d8f9` |
| PACK-004 | 1 | Hardening + FU-002/FU-003 evidence (pre-Frotcom) | **PACK_004_ACCEPTED_WITH_FOLLOW_UPS** | sprint-004 | Formal acceptance | Checkpoint `dbe59da`; `ACCEPTANCE-RECORD.md`; migration `20260730170000` |
| PACK-005 | 1 | Evidence Closure (JWT RLS + Import Persistence Proof) | **PACK_005_ACCEPTED_WITH_FOLLOW_UPS** | sprint-005 | Formal acceptance | `ACCEPTANCE-RECORD.md`; `ARCHITECT-REVIEW.md`; `EVIDENCE-RUN-RESULTS.json` |

**FU-002-01…04, FU-002-06, FU-003-03:** **CLOSED** (PACK-005).
**FU-002-05:** **CLOSED_WITH_RESIDUAL** (`FOR UPDATE` gap; GiST exclusion authoritative).
**FU-003-01:** **CLOSED** (PACK-004).
**FU-003-02:** **CLOSED_WITH_RESIDUAL** (C14 unit residual).
**OQ-004-04:** **CLOSED / SATISFIED** (BEST-EFFORT concurrent CAS evidence).

**PACK-005:** Evidence-closure pack only. No product features. No Frotcom. No reports dashboard. No exports. No migrations. No product-code changes.

**Reports UI (TASK-009):** deferred — OQ-004-01 **RESOLVED ACCEPT DEFAULT**.
**Frotcom + n8n (TASK-010):** **blocked** by DS-001 — **not** PACK-005; future pack TBD after DS-001 (not auto-assigned).
**Exports (TASK-011):** deferred — future pack TBD.

Allowed pack flow: DRAFT → PACK_READY → DRY_RUN → APPROVED → BUILDING → VALIDATING → REVIEW → ACCEPTED / REWORK.

## Pack sequence

| Pack | Goal (current plan) |
|---|---|
| PACK-001 | Project foundation |
| PACK-002 | Assignments CRUD |
| PACK-003 | Excel assignment import |
| PACK-004 | Hardening & follow-ups (accepted w/ FU) |
| **PACK-005** | **Evidence Closure (JWT RLS + Import Persistence Proof)** — **accepted** |
| *(deferred)* | Daily reports UI on mocks (former Anweisungen Phase 4 / TASK-009) |
| *(future, after DS-001)* | Frotcom + n8n live sync (TASK-010) — **not PACK-005** |
| *(future)* | Excel/PDF exports (TASK-011) |
| *(optional)* | Management email |
| *(optional)* | Pilot validation |

No PACK-006 is invented by this acceptance.
