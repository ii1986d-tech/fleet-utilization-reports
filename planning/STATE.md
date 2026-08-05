# State — Fleet Utilization Reports (FUR-001)

- Updated: **2026-08-06**
- SoT freshness: see `project-state.json` → `launcherFreshness` · process: `planning/LAUNCHER-SYNC.md`
- Binding operating model: **Mission Control at repository root** (vendor launcher = presentation only)
- Release baseline: **v1.0.0** (`a0b96a1`) — PACK-001…005 accepted
- PACK-006 status: **COMPLETE** (Gemini free-tier pilot SUCCESS 2026-08-05)
- AI tuning follow-up: **FU-AI-001** (complex multi-stop prompt tuning)
- PACK-007 status: **ARCHITECT_DECISIONS_MADE** — Part 1 (client/cache/cost) **IMPLEMENTED** (`751c978`)
- PACK-007 scope expanded: **FR-007-08**, **FR-007-09**, **FR-007-10**
  - Manual Google Maps link input (FR-007-08)
  - Manual KM input (FR-007-09)
  - Predefined route corridors as selectable options (FR-007-10)
- Maps API: **Google Directions API**
- Maps cost ceiling: **$50/month** (80% warning; kill switch `MAPS_API_ENABLED=false`)
- Maps caching: **standard routes**, TTL **7 days**
- Next: PACK-007 Part 2 (KM delta) including manual override fields; resolve OQ-007-06 / OQ-007-07
- PACK-008 will handle PDF/Excel export
- DS-005: **RESOLVED / APPROVED**
- ASM-014: **RESOLVED** (7y/7y/7y/10y; legal auto-purge follow-up)
- Security follow-ups: **FU-SEC-001** / **FU-SEC-002** (non-blocking)

## Pack ladder

| Pack | Status |
|---|---|
| PACK-001…005 | **COMPLETE** |
| PACK-006 | **COMPLETE** |
| PACK-007 | **ARCHITECT_DECISIONS_MADE** (Part 1 done; scope + FR-007-08…10) |
| PACK-008 | **NOT_STARTED** (PDF/Excel export) |

## Next authorized action

1. Update PACK-007 Part 2 design/implementation to include manual override fields (FR-007-08/09).
2. Resolve OQ-007-06 (corridor storage) and OQ-007-07 (manual precedence) before Apply for those FRs.
3. TASK-034 / TASK-035 / TASK-036 after Part 2 / Part 3 dependencies.
4. FU-AI-001 / FU-SEC-001 as scheduled.

## Evidence pointers

- `sprints/sprint-007/PACK-007.md`
- `sprints/sprint-007/requirements.md` (FR-007-08…10)
- `docs/MAPS-API-SETUP.md`
- `docs/GEMINI-PILOT-REPORT-2026-08-05.md`
- `planning/WORK-BACKLOG.md` (TASK-026, TASK-034…036, FU-AI-001)
