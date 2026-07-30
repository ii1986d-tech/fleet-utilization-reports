# Builder Handoff — Sprint 002 (PACK-002 / Phase 2)

> Architect preparation + dry-run corrections 2026-07-30

You are the BUILDER. Prefer a fresh context. Read `CONTEXT-MANIFEST.md` first.

## Objective

Implement **PACK-002** per `PACK-002.md`, **ADR-005**, and **ADR-006**.

Binding rules:

- Mandatory DB overlap exclusion; app validation + **409 `ASSIGNMENT_OVERLAP`**
- No hard DELETE; end/deactivate only; FK `vehicle_id` → `ON DELETE RESTRICT`
- Correction = **in-place transactional UPDATE** only (not close+create)
- Admin write only; do not weaken RLS

## Phase 1 — Dry run

Completed: `BUILDER-DRY-RUN.md` (READY_WITH_REQUIRED_CORRECTIONS). Corrections applied in Architect docs.

## Phase 2 — Approval

Do not edit product code until explicit human approval of **PACK_002_CORRECTIONS_READY_FOR_APPROVAL**.

## Phase 3 — Apply and validate

Implement only the approved pack. Migrations at Apply only. Update Builder Report / STATE / checkpoint after accept.

## Hard guards

- No Excel import (PACK-003)
- No live Frotcom
- No secrets
- No Option B correction path
- No PACK-004+ features
