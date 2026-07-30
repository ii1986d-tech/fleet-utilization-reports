# Sprint 003 Requirements — PACK-003 (corrected)

> Dry-run corrections 2026-07-30 · Status: **PACK_003_CORRECTIONS_READY_FOR_APPROVAL**

## Smallest testable outcome

Admin imports assignments from a single-sheet `.xlsx` with server-stored preview, CAS confirm, per-row persist, partial success, protocol, and error report — without silent overwrites or vehicle auto-create.

## Binding decisions (summary)

| Topic | Lock |
|---|---|
| Parser | `exceljs` server-side only (Apply install) |
| Limits | 5 MiB / 2000 rows / exactly one non-empty sheet |
| Preview | Server `import_job_rows` only |
| Confirm | CAS `validated`→`confirming`; 409 IMPORT_ALREADY_CONFIRMED |
| Persist | Per-row TX |
| Create masters | Default OFF |
| Plates | Canonical normalize (ADR-007 D11) |
| Formulas | Never execute; required fields reject formulas |
| FU-002-* | Not absorbed |

## Functional requirements

| ID | Requirement |
|---|---|
| FR-003-01 | Admin upload `.xlsx` with extension + OOXML validation |
| FR-003-02 | Reject multi non-empty sheets, oversize, unsupported types |
| FR-003-03 | Normalize headers/aliases; duplicate headers → file fail |
| FR-003-04 | Persist validated rows server-side |
| FR-003-05 | Confirm by jobId + options only; ignore client rows |
| FR-003-06 | Per-row persist; partial success |
| FR-003-07 | Overlap CONFLICT; exact dup SKIP |
| FR-003-08 | Create driver/customer only if explicitly enabled |
| FR-003-09 | Never create vehicles; inactive/unknown vehicle ERROR |
| FR-003-10 | Error contracts 400/401/403/404/409/413/422/500 |
| FR-003-11 | Counters from DB invariants |
| FR-003-12 | Admin-only; RLS not widened |

## Out of scope

Live Frotcom, PACK-004+, CSV/xlsm, vehicle auto-create, FU-002 closure.
