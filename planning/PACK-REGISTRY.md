# Pack Registry

> Updated 2026-08-04 — ADR-009 ACCEPTED; PACK-006 non-provider Dry-Run complete

| Pack | Version | Goal | Status | Sprint | Approved by | Evidence |
|---|---:|---|---|---|---|---|
| PACK-000 | 1 | Phase 0 discovery & project pack documentation | ACCEPTED | — | Architect (Phase 0) | Phase-0 tree / baseline `6486fa8` |
| PACK-001 | 1 | Phase 1 foundation | **PACK_001_ACCEPTED** | sprint-001 | Formal acceptance | Checkpoint `20f2698` |
| PACK-002 | 1 | Phase 2: masters + assignments CRUD + mandatory overlap | **PACK_002_ACCEPTED_WITH_FOLLOW_UPS** | sprint-002 | Formal acceptance | Checkpoint `21ab8aa` |
| PACK-003 | 1 | Phase 3: Excel assignment import | **PACK_003_ACCEPTED_WITH_FOLLOW_UPS** | sprint-003 | Formal acceptance | Checkpoint `a68d8f9` |
| PACK-004 | 1 | Hardening + FU-002/FU-003 evidence (pre-Frotcom) | **PACK_004_ACCEPTED_WITH_FOLLOW_UPS** | sprint-004 | Formal acceptance | Checkpoint `dbe59da`; `ACCEPTANCE-RECORD.md`; migration `20260730170000` |
| PACK-005 | 1 | Evidence Closure (JWT RLS + Import Persistence Proof) | **PACK_005_ACCEPTED_WITH_FOLLOW_UPS** | sprint-005 | Formal acceptance | `ACCEPTANCE-RECORD.md`; `ARCHITECT-REVIEW.md`; `EVIDENCE-RUN-RESULTS.json` |
| PACK-006 | 1 | PDF AI extraction + field-level confirmation workflow | **PACK_006_ADR_ACCEPTED_DRY_RUN** | sprint-006 | I. Dimitrov (ADR) | ADR-009 ACCEPTED; `BUILDER-DRY-RUN.md`; DS-005 open; Apply not authorized |
| PACK-007 | — | Route options, Maps link handling, km comparison | **PLANNED** (not started) | — | — | Phased after PACK-006 |
| PACK-008 | — | PDF/Excel export for admin/manager/viewer | **PLANNED** (not started) | — | — | Phased after PACK-007 |

**FU-002-01…04, FU-002-06, FU-003-03:** **CLOSED** (PACK-005).  
**FU-002-05:** **CLOSED_WITH_RESIDUAL** (`FOR UPDATE` gap; GiST exclusion authoritative).  
**FU-003-01:** **CLOSED** (PACK-004).  
**FU-003-02:** **CLOSED_WITH_RESIDUAL** (C14 unit residual).  
**OQ-004-04:** **CLOSED / SATISFIED** (BEST-EFFORT concurrent CAS evidence).

**PACK-005:** Evidence-closure pack only. No product features. No Frotcom. No reports dashboard. No exports. No migrations. No product-code changes.

**PACK-006:** ADR-009 **ACCEPTED** (I. Dimitrov, 2026-08-04). Non-provider Dry-Run **complete**. **DS-004 complete**. DS-005 open. Apply not authorized. Live-provider blocked.

**Reports UI (TASK-009):** deferred — OQ-004-01 **RESOLVED ACCEPT DEFAULT**.  
**Frotcom + n8n (TASK-010):** **blocked** by DS-001 — **not** PACK-006…008.  
**Exports (TASK-011):** superseded in plan by **PACK-008** (transport-order / calculated export); filter-respecting utilization exports remain future TBD if still required.

Allowed pack flow: DRAFT → PACK_READY → DRY_RUN → APPROVED → BUILDING → VALIDATING → REVIEW → ACCEPTED / REWORK.

## Pack sequence

| Pack | Goal (current plan) |
|---|---|
| PACK-001 | Project foundation |
| PACK-002 | Assignments CRUD |
| PACK-003 | Excel assignment import |
| PACK-004 | Hardening & follow-ups (accepted w/ FU) |
| PACK-005 | Evidence Closure (JWT RLS + Import Persistence Proof) — accepted |
| **PACK-006** | **PDF AI extraction + field confirmation** — ADR ACCEPTED; Dry-Run complete; Apply pending; DS-005 blocks live provider |
| **PACK-007** | Predefined route corridors + Maps handling + km comparison — planned |
| **PACK-008** | PDF/Excel export (admin/manager/viewer) — planned |
| *(deferred)* | Daily reports UI on mocks (TASK-009) |
| *(future, after DS-001)* | Frotcom + n8n live sync (TASK-010) |
| *(optional)* | Management email / pilot validation |
