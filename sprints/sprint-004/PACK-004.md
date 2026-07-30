# PACK-004 — Hardening and follow-ups (corrected)

> Status: **PACK_004_CORRECTIONS_READY_FOR_APPROVAL**> Baseline: **`a68d8f9`**> Dry-run: READY_WITH_REQUIRED_CORRECTIONS → Architect corrections applied (docs)> Binding: ADR-005 · ADR-006 · ADR-007 · **ADR-008 ACCEPTED (design)**> Apply: **blocked** until explicit authorization

## Purpose

Harden PACK-002/003 before Frotcom. Close FU-003-01…03 and evidence FU-002-* without renumbering.

## Resolved OQs

| OQ | Resolution |
|---|---|
| OQ-004-01 | ACCEPT DEFAULT — reports UI deferred |
| OQ-004-02 | DATABASE RPC — `persist_assignment_import_row` |
| OQ-004-03 | DOCUMENT CURRENT BEHAVIOR — direct validated OK |
| OQ-004-04 | BEST-EFFORT WITH MANUAL EVIDENCE |

## Scope (unchanged intent)

Workstreams A–F mandatory; G optional polish only.Out: Frotcom, PACK-005, reports dashboard, CSV/XLS/XLSM, vehicle auto-create.

## Key binding corrections (from dry-run)

1. RPC name/signature + `auth.uid()` actor (no client actor/payload)2. SECURITY INVOKER + search_path + in-function `is_admin()`3. Canonical vocab: validation `valid|invalid`; persistence `pending|persisted|skipped|failed`4. Mandatory `persistence_errors`; no overwrite of validation_*5. No raw SQL leakage6. exceljs 4.4.0 on-demand report + formula `'` prefix7. One migration preferred8. No automatic failed-row retry
Full design: `architecture/ADR-008.md` · `requirements.md` · `acceptance.md`

## Follow-ups

FU-002-01…06 (RSK-012) and FU-003-01…03 (RSK-016) IDs **preserved**; not closed until Apply evidence.

## Next

Human approval of corrections → explicit Apply authorization → Builder Apply.
