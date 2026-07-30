# Pack Validation

> Updated 2026-07-30 — PACK-004 Apply ready for Architect Review

---

## PACK-004

- Formal status: **PACK_004_ACCEPTED_WITH_FOLLOW_UPS**
- Goal: Hardening + FU-002/FU-003 evidence (not reports UI)
- Package: `sprints/sprint-004/*` + **ADR-008**
- Architect recommendation: **ACCEPT_WITH_FOLLOW_UPS** (honored)
- Targeted transport-failure correction: **ACCEPTED**
- Baseline: **`a68d8f9`** → checkpoint on master (see `git log -1`)
- Evidence: `ACCEPTANCE-RECORD.md`, `ARCHITECT-REVIEW.md`
- FU-003-01 closed; FU-003-02/03 open; FU-002 open; live JWT NOT_EXECUTED; PACK-005 / Frotcom not started

### Locked for Apply

- RPC `persist_assignment_import_row` · `persistence_errors` · vocab valid|invalid / pending|persisted|skipped|failed
- exceljs 4.4.0 error report + formula escape · CAS search_path · no SQL leakage

Next: human approve corrections → explicit Apply authorization.

---

## PACK-003

- Formal status: **PACK_003_ACCEPTED_WITH_FOLLOW_UPS**
- Checkpoint commit: **`a68d8f9`**
- Architect Review: **ACCEPT_WITH_FOLLOW_UPS**
- Acceptance: `sprints/sprint-003/ACCEPTANCE-RECORD.md`
- Dependency: **exceljs 4.4.0** (server-only)
- Migration: `20260730153000_import_jobs_protocol.sql` (verified)

### Gates

| Gate | Result |
|---|---|
| `npm test` | **38/38 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

### Accepted follow-ups (open; planned PACK-004)

FU-003-01…03 / RSK-016 · residual findings documented in RISKS.md

---

## PACK-002

- Formal status: **PACK_002_ACCEPTED_WITH_FOLLOW_UPS**
- Checkpoint commit: **`21ab8aa`**
- Follow-ups FU-002-01…06 / RSK-012 remain open (planned PACK-004 evidence)

---

## PACK-001 (preserved)

- Formal status: **PACK_001_ACCEPTED**
- Checkpoint: `20f2698`
