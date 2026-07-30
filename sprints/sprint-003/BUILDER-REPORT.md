# Builder Report — Sprint 003 / PACK-003

> Apply 2026-07-30 · Baseline PACK-002 `21ab8aa`
> exceljs **4.4.0** · Migration `20260730153000_import_jobs_protocol.sql`

## Status

**PACK_003_ACCEPTED_WITH_FOLLOW_UPS** (formal acceptance 2026-07-30)
Checkpoint: **PACK_003_CHECKPOINT_READY** — see `ACCEPTANCE-RECORD.md`

## Preflight

- Branch: `master`
- Baseline ancestor: `21ab8aa`
- Unrelated product changes: none (docs-only dirty tree before Apply)
- PACK-004: not started

## Dependency

| Package | Version | Notes |
|---|---|---|
| exceljs | **4.4.0** | Server-side only; lockfile updated |

## Migration (remote)

| Check | Result |
|---|---|
| `db push --dry-run` (pre) | would push `20260730153000` |
| `db push --linked` | **applied** (Docker catalog warnings only) |
| `migration list` | Local == Remote including `20260730153000` |
| `db push --dry-run` (post) | **Remote database is up to date** |
| Columns | `source_filename`, `source_sha256`, `skipped_rows`, `persisted_rows`, `failed_rows`, `confirmation_started_at`, … |
| RLS | `import_jobs_admin`, `import_job_rows_admin` |
| CAS RPC | `begin_import_job_confirm(uuid, uuid)` |

No migration repair.

## Implemented

- Parse/normalize/validate domain (`src/lib/imports/assignments/*`)
- Server actions: upload (server-stored preview) + CAS confirm + per-row persist
- UI: `/settings/imports`, `/settings/imports/assignments`
- AppError codes: IMPORT_* + 413/422/409 IMPORT_ALREADY_CONFIRMED
- Create masters default OFF; vehicles never auto-created
- ADR-005 overlap helpers + DB exclusion on insert

## Gates

| Gate | Result |
|---|---|
| `npm test` | **38/38 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** (after whitespace fix on planning docs) |

## Tests covered (automated)

Domain: plates, dates, headers, aliases, duplicates, overlap, authz helpers, import HTTP codes.
Parse: valid workbook, bad extension, oversize, multi-sheet, bad magic.

Not fully automated live: JWT RLS probe with real Auth users; true multi-client concurrent confirm race (CAS RPC present). Documented as residual (aligned with FU-002 / RSK-015).

## Out of scope preserved

PACK-004 not started · live Frotcom · FU-002-01…06 not closed (RSK-012) · no commit yet

## Formal acceptance

Accepted with FU-003-01…03 (RSK-016). Architect Review: ACCEPT_WITH_FOLLOW_UPS.
Checkpoint commit awaits explicit human approval.
