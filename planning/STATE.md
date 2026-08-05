# State — Fleet Utilization Reports (FUR-001)

- Updated: **2026-08-05**
- SoT freshness: see `project-state.json` → `launcherFreshness` · process: `planning/LAUNCHER-SYNC.md`
- Binding operating model: **Mission Control at repository root** (vendor launcher = presentation only)
- Release baseline: **v1.0.0** (`a0b96a1`) — PACK-001…005 accepted
- PACK-006 status: **COMPLETE** (closeout `9e07f28`; upload UI + GRANT fix `11c41fc`; Gemini free-tier pilot SUCCESS locally)
- Current focus: **PACK-007 Architect Preparation**
- ADR-009: **ACCEPTED (design binding)**
- DS-005: **RESOLVED / APPROVED** (I. Dimitrov, 2026-08-05) — external AI permitted; pilot verified
- ASM-014: **RESOLVED** — Duration SET (7y/7y/7y/10y); legal validation before production auto-purge = follow-up
- Security follow-ups: **FU-SEC-001** / **FU-SEC-002** (non-blocking)
- `readyForStaging`: **false**
- HTML launcher: re-import when convenient (`launcherImportAt` may still be null)

## Pack ladder

| Pack | Status |
|---|---|
| PACK-001…005 | **COMPLETE** |
| PACK-006 | **COMPLETE** |
| PACK-007 | **ARCHITECT_PREPARATION** — Routenlogik + KM-Vergleich |
| PACK-008 | **NOT_STARTED** |

## Next authorized action

1. Architect: complete PACK-007 decisions (Maps product, corridor matching, direct-km definition, cache/persist).
2. Produce PACK-007 Dry-Run when architecture is ready for approval.
3. Schedule FU-SEC-001 before 50-disponent rollout.

## Evidence pointers

- `sprints/sprint-006/CLOSEOUT-AUDIT.md`
- `sprints/sprint-007/PACK-007.md`
- `planning/WORK-BACKLOG.md` (TASK-026, FU-SEC-001/002)
