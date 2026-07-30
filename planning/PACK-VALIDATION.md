# Pack Validation

> Updated 2026-07-30 — PACK-003 formally accepted with follow-ups

---

## PACK-003

- Formal status: **PACK_003_ACCEPTED_WITH_FOLLOW_UPS**
- Checkpoint status: **PACK_003_CHECKPOINT_READY** (commit not created)
- Architect Review: **ACCEPT_WITH_FOLLOW_UPS** (`sprints/sprint-003/ARCHITECT-REVIEW.md`)
- Acceptance: `sprints/sprint-003/ACCEPTANCE-RECORD.md`
- Builder report: `sprints/sprint-003/BUILDER-REPORT.md`
- Package / ADR: `PACK-003.md` + **ADR-007**
- Baseline checkpoint: **`21ab8aa`**
- Dependency: **exceljs 4.4.0** (server-only)
- Migration: `20260730153000_import_jobs_protocol.sql`
- Validation environment: approved isolated Supabase remote (project-ref `ootsmrriuyesieblxudc`)
- Local Docker/WSL: environment note only (RSK-009) — not an acceptance blocker
- FU-002-01…06: remain open on RSK-012 — **not absorbed**
- PACK-004: **not started**

### Gates (Architect-independent + Builder)

| Gate | Result |
|---|---|
| `npm test` | **38/38 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

### Database / integrity evidence

| Check | Result |
|---|---|
| Migration `20260730153000` Local == Remote | PASS |
| `db push --dry-run` remote up to date | PASS |
| Import protocol columns + counters + confirm fields | PASS |
| `import_job_rows` + admin RLS | PASS |
| CAS RPC `begin_import_job_confirm` | PASS |
| Server-stored preview; confirm by job ID + options only | PASS |
| Per-row partial-success persistence | PASS |
| Admin-only authorization + RLS preserved | PASS |
| No vehicle auto-create path | PASS |
| ADR-005 / ADR-006 intact | PASS |

### Accepted follow-ups (visible; non-blocking; mandatory)

1. FU-003-01 — Downloadable Excel error report (TASK-017 / RSK-016)
2. FU-003-02 — Stronger confirm/partial/create-on automated tests (TASK-018 / RSK-016)
3. FU-003-03 — Atomic per-row master create + assignment insert (TASK-019 / RSK-016)

### Documented residual findings (remain visible)

- Jobs transition directly to `validated` (uploaded/parsed not recorded at runtime)
- Row persistence may overwrite stored preview errors/warnings
- `begin_import_job_confirm` search_path hardening recommended
- `buffer as any` typing cleanup
- UI duplicate-submit lock can be strengthened beyond pending
- Live JWT RLS smoke remains under FU-002-01 / RSK-012
- Multi-client confirmation race harness = accepted residual risk (CAS present; RSK-015)

---

## PACK-002

- Formal status: **PACK_002_ACCEPTED_WITH_FOLLOW_UPS**
- Architect Review: **ACCEPT_WITH_FOLLOW_UPS** (`sprints/sprint-002/ARCHITECT-REVIEW.md`)
- Checkpoint commit: **`21ab8aa`**
- Validation environment: approved isolated Supabase remote (project-ref `ootsmrriuyesieblxudc`)
- Local Docker/WSL: environment note only (RSK-009) — not an acceptance blocker

### Gates (Architect-independent + Builder)

| Gate | Result |
|---|---|
| `npm test` | **20/20 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

### Database / integrity evidence

| Check | Result |
|---|---|
| Migration `20260730140000` Local == Remote | PASS |
| `db push --include-all --dry-run` up to date | PASS |
| Exclusion `vehicle_assignments_vehicle_period_excl` | PASS (GiST inclusive + infinity) |
| FK `vehicle_assignments_vehicle_id_fkey` ON DELETE RESTRICT | PASS |
| Admin-only write RLS (`*_write` / `assignments_write` → `is_admin()`) | PASS (unchanged from PACK-001) |
| No product hard-DELETE path | PASS |
| ADR-005 / ADR-006 intact | PASS |

### Accepted follow-ups (visible; non-blocking)

1. Automated RLS with real Auth/JWT users
2. Parallel-client race harness
3. Live DB-bypass → 409 `ASSIGNMENT_OVERLAP` integration test
4. End/deactivate row-preservation assertions
5. ADR-006 correction `SELECT FOR UPDATE` (or equivalent) hardening review
6. Local Docker unavailability — environment note only

---

## PACK-001 (preserved)

- Overall readiness: **100%** (PACK-001 formally accepted)
- Formal status: **PACK_001_ACCEPTED**
- Checkpoint: `20f2698`
- Former gate **DATABASE_APPLY_REQUIRED_BEFORE_PACK-002**: **CLOSED**

### Final validation statuses (preserved)

| Status | Result |
|---|---|
| REMOTE_DATABASE_MIGRATIONS_APPLIED | PASS |
| MIGRATION_HISTORY_VERIFIED | PASS |
| REMOTE_DATABASE_UP_TO_DATE | PASS |
| REMOTE_SCHEMA_VALIDATION_PASS | PASS |
| REMOTE_RLS_VALIDATION_PASS | PASS (27/27) |
| PACK_001_VALIDATION_PASS | PASS |
| PACK_001_ACCEPTED | **ACCEPTED** |
| PACK_001_POST_ACCEPTANCE_CHECK_PASS | **PASS** |
