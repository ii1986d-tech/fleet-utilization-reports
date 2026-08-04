# Traceability Matrix — FUR-001

> Updated 2026-08-04 — PACK-006 architecture remediation (C1/C2/H1–H4)

| Requirement | Task | DoD | Evidence | Status |
|---|---|---|---|---|
| Foundation stack | TASK-001…006 | PACK-001 acceptance | Checkpoint `20f2698` | **Done** |
| Assignments | TASK-007 | PACK-002 | Checkpoint `21ab8aa`; ADR-005/006 | **PACK_002_ACCEPTED_WITH_FOLLOW_UPS** |
| PACK-002 follow-ups | TASK-012…016 (+ FU-002-06) | Evidence closes or residual-signs FU-002-01…06 | PACK-005 suite + ACCEPTANCE-RECORD | **CLOSED** / **CLOSED_WITH_RESIDUAL** (FU-002-05) |
| Excel import | TASK-008 | PACK-003 | Checkpoint `a68d8f9`; ADR-007 | **PACK_003_ACCEPTED_WITH_FOLLOW_UPS** |
| PACK-003 follow-ups | TASK-017…019 | Evidence closes FU-003-01…03 | FU-003-01 CLOSED (PACK-004); 02/03 CLOSED at PACK-005 (02 residual) | **CLOSED** / **CLOSED_WITH_RESIDUAL** |
| Hardening / audit / RPC | TASK-020…021 | PACK-004 | Checkpoint `dbe59da`; ACCEPT_WITH_FOLLOW_UPS; transport §9 accepted | **PACK_004_ACCEPTED_WITH_FOLLOW_UPS** |
| Evidence closure | PACK-005 | Empirical JWT + DB proof | `ACCEPTANCE-RECORD.md`; `EVIDENCE-RUN-RESULTS.json` | **PACK_005_ACCEPTED_WITH_FOLLOW_UPS** |
| Reports UI mocks | TASK-009 | Later pack | Deferred OQ-004-01 **RESOLVED ACCEPT DEFAULT** | Deferred (not PACK-005) |
| Frotcom+n8n | TASK-010 | Future pack after DS-001 | [OFFEN]; **not PACK-005** | Blocked (DS-001) |
| Exports (utilization) | TASK-011 | Future / PACK-008 for order exports | [OFFEN] | Planned |
| PDF AI extract Architect | TASK-023 | Sprint-006 docs + ADR-009 AI update | `sprints/sprint-006/*` | **Done (Architect)** |
| Sample PDFs + manifests | TASK-024 | SPL-006-001…003 + ground truth | DS-004 | **Done (local ignored; 8 human_verified)** |
| External AI processing approval | TASK-028 | DS-005 legal/ops approval | OPEN-DECISION-STOPS | **Blocked** |
| PACK-006 Apply (AI extract + field confirm) | TASK-025 | AC-006-01…78; FR-006-01…51; TM-24…61; INC-01…11 | ADR-009 ACCEPTED; BUILDER-DRY-RUN; Apply auth + DS-005 for live | **Blocked (Apply auth)** |
| Field confirmation workflow (Architect) | TASK-029 | Persisted review states + Weiter gate documented | sprint-006 + ADR-009 | **Done (Architect)** |
| Manual stop reordering (PACK-006) | TASK-025 / ADR-009 §13a | AC-006-36…48,63; FR-006-39…42; stable `stop_id` | ADR-009; blueprint | **Done (Architect docs)** |
| Concurrency / CAS / idempotency (PACK-006) | TASK-025 / ADR-009 §§21–22 | AC-006-49…62; FR-006-45…47; TM-49…53 | ADR-009 remediation | **Done (Architect docs)** |
| Partial loads / legs + Weiter catalog | TASK-025 / ADR-009 §§12–13b | AC-006-28,77; FR-006-49…50; OQ-006-11 RESOLVED | ADR-009 §12 | **Done (Architect docs)** |
| File security / provider robustness / Save UX | TASK-025 / ADR-009 §§23–26 | AC-006-64…76; FR-006-01…12,48,51; TM-55…59 | ADR-009 remediation | **Done (Architect docs)** |
| Privacy redaction (tracked docs) | H4 | HUMAN-GROUND-TRUTH-REVIEW redacted; private values only under references/private | sprint-006 | **Done (Architect docs)** |
| Routes + km comparison | TASK-026 | PACK-007 (distance, alternatives, corridors, Maps routing) | Planned | Planned |
| Order PDF/Excel export | TASK-027 | PACK-008 | Planned | Planned |
