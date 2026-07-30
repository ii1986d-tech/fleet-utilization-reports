# Sprint 003 Blueprint — PACK-003 (corrected)

> Dry-run corrections 2026-07-30

## Runtime flow

```text
Browser (file bytes only)
  → server action requireAdmin
    → size/ext/signature checks
    → exceljs read (server)
    → exactly one non-empty sheet
    → normalize + validate + overlap
    → INSERT import_jobs + import_job_rows (status=validated)
  → UI preview from server job
  → confirm(jobId, { createNewMasters })
    → CAS validated→confirming
    → for each eligible row: TX { optional master create; insert assignment; update row }
    → terminal status + counters from rows
    → optional error xlsx via exceljs from row errors
```

## Modules (Apply)

`parse` · `normalize` · `plates` · `dates` · `validate` · `idempotency` · `actions` · `report` · error code extensions

## Data

Mandatory migration: extend `import_jobs` + create `import_job_rows` (PACK-003 §7). Admin RLS only.

## Reuse

`periods` / `overlap` / `requireAdmin` / masters create · ADR-005 exclusion on insert
