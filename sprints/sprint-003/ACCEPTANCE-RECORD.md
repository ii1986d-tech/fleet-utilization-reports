# PACK-003 Formal Acceptance Record

> Date: 2026-07-30
> Baseline: PACK-002 checkpoint `21ab8aa`
> Architect Review: ACCEPT_WITH_FOLLOW_UPS (`ARCHITECT-REVIEW.md`)

## Formal status

**PACK_003_ACCEPTED_WITH_FOLLOW_UPS**

Checkpoint status: **PACK_003_CHECKPOINT_READY** (commit not created)

## Decision

Accept PACK-003 with documented follow-ups. No acceptance blocker. Product code, migrations, and dependencies were not modified during acceptance documentation.

## Gates

| Gate | Result |
|---|---|
| `npm test` | **38/38 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

## Dependency evidence

- **exceljs 4.4.0** installed and locked
- Server-side parse only (`src/lib/imports/assignments/parse.ts` + tests)
- No client bundle exposure; no second spreadsheet library

## Migration evidence

- File: `supabase/migrations/20260730153000_import_jobs_protocol.sql`
- Remote applied and verified
- Local and remote migration histories match
- `db push --dry-run` reports remote up to date
- Import jobs protocol + `import_job_rows` + admin RLS + CAS RPC present

## Integrity evidence

- CAS confirmation behavior verified (`validated` → `confirming`; 409 `IMPORT_ALREADY_CONFIRMED`)
- Server-stored preview implemented; confirm accepts job ID + approved options only
- Per-row partial-success persistence implemented
- Admin-only authorization and RLS preserved (PACK-001/002 policies not weakened)
- No vehicle auto-create path
- ADR-005 overlap enforcement + ADR-006 no hard-delete preserved
- PACK-004 has **not** started

## Accepted follow-ups (non-blocking; mandatory; remain visible)

| ID | Follow-up | Tracker |
|---|---|---|
| FU-003-01 | Downloadable Excel error report for rejected/failed import rows | TASK-017 / RSK-016 |
| FU-003-02 | Stronger automated coverage for confirm, partial success, master creation, related integration paths | TASK-018 / RSK-016 |
| FU-003-03 | Harden per-row persistence so optional master creation and assignment insertion are atomic | TASK-019 / RSK-016 |

Do **not** silently remove, merge, or renumber these follow-ups.

## PACK-002 follow-ups (remain separate)

FU-002-01…06 remain under **RSK-012** / TASK-012…016. They were **not** absorbed into PACK-003.

Live JWT RLS smoke remains open under **FU-002-01 / RSK-012**.

## Documented residual findings (remain visible)

| Finding | Class |
|---|---|
| Import jobs transition directly to `validated` (uploaded/parsed not recorded at runtime) | Accepted residual / doc drift |
| Row persistence updates may overwrite stored preview errors or warnings | Documented follow-up polish |
| `begin_import_job_confirm` search_path hardening recommended | Hardening follow-up |
| `buffer as any` typing cleanup | Polish |
| UI duplicate-submit lock can be strengthened beyond pending | Optional UX |
| Multi-client confirmation race harness | Accepted residual risk (CAS present; RSK-015) |

## Out of scope confirmation

PACK-004 has **not** started and remains blocked pending separate explicit start approval.
