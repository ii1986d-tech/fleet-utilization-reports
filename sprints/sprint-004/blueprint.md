# Blueprint — PACK-004 (corrected)

> ADR-008 binding · Apply not started

## Target layout (Apply)

```
src/lib/imports/assignments/
  report.ts              # exceljs error workbook + formula escape
  actions.ts             # downloadImportErrorReport; confirm → RPC loop; finalize counters
  …existing parse/validate…

supabase/migrations/
  YYYYMMDDHHMMSS_pack004_import_hardening.sql

tests/imports/
  report.test.ts
  confirm-*.test.ts / atomic-persist evidence
tests/assignments/
  lifecycle-preserve.test.ts
  overlap-bypass / rls-live evidence scripts
```

## Confirm flow

```mermaid
sequenceDiagram
  participant Admin
  participant Action
  participant CAS as begin_import_job_confirm
  participant RPC as persist_assignment_import_row
  participant DB

  Admin->>Action: confirm(jobId, create flags)
  Action->>CAS: validated to confirming
  alt CAS lose
    CAS-->>Admin: 409 IMPORT_ALREADY_CONFIRMED
  end
  loop valid pending rows only
    Action->>RPC: job_id, row_id, create flags
    Note over RPC: auth.uid + is_admin; one TX
    RPC->>DB: masters? duplicate? insert? update row
    alt failure
      DB-->>RPC: full rollback
    end
  end
  Action->>DB: recompute counters; completed*
  Admin->>Action: downloadImportErrorReport(jobId)
  Action-->>Admin: .xlsx formula-safe
```

## Migration (one file preferred)

1. Add `persistence_errors`2. Vocabulary CHECK + backfill3. Create `persist_assignment_import_row`4. Recreate CAS with `search_path` + admin asserts5. Grants revoke PUBLIC
## UI (narrow)

- Download on `/settings/imports/assignments`- States: unavailable / loading / error / success- Disable while pending- No reports dashboard
## Job finalize

Application recalculates counters from row states after RPC loop; RPC never finalizes the whole job.
