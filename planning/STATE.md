# State — Fleet Utilization Reports (FUR-001)

- Updated: **2026-08-06** (Mission Control HTML import recorded FRESH)
- SoT freshness: see `project-state.json` → `launcherFreshness` · process: `planning/LAUNCHER-SYNC.md`
- Binding operating model: **Mission Control at repository root** (vendor launcher = presentation only)
- Ownership map: `planning/LAUNCHER-SYNC.md` § Ownership
- Release baseline: **v1.0.0** (`a0b96a1`) — PACK-001…005 accepted
- HEAD (SoT refresh): **`86bcf2f`**
- PACK-006 status: **COMPLETE**
- PACK-007 status: **IMPLEMENTED_PENDING_CLOSEOUT** (code + migrations on master; no formal closeout)
- PACK-008 status: **IMPLEMENTED_PENDING_PILOT** (export on master; TASK-037 open)
- Scaling: Phase 1 pilot (1–5) ready; FU-SCALE-001…008 before wider rollout
- Next: TASK-037 export pilot with real data; configure Maps API key when ready
- DS-005: **RESOLVED / APPROVED**
- ASM-014: **RESOLVED** (duration SET; legal auto-purge follow-up)
- Gemini free-tier pilot: **SUCCESS** (`docs/GEMINI-PILOT-REPORT-2026-08-05.md`)
- Security follow-ups: **FU-SEC-001** / **FU-SEC-002** (non-blocking)

## Pack ladder

| Pack | Status |
|---|---|
| PACK-001…005 | **COMPLETE** |
| PACK-006 | **COMPLETE** |
| PACK-007 | **IMPLEMENTED_PENDING_CLOSEOUT** |
| PACK-008 | **IMPLEMENTED_PENDING_PILOT** |

## Next authorized action

1. TASK-037: pilot export with real orders (Excel + PDF).
2. Human HTML Mission Control import: **DONE** — `launcherImportAt=2026-08-06T18:46:23.000Z` (FRESH).
3. Optional: formal PACK-007 closeout/acceptance before marking COMPLETE.
4. Pilot with 1–5 users; keep `MAPS_API_ENABLED=false` until key/billing ready.
5. Do not scale past Phase 1 without FU-SCALE-001…008.
6. FU-AI-001 / FU-SEC-001 as scheduled.

## Evidence pointers

- PACK-006 closeout: `sprints/sprint-006/CLOSEOUT-AUDIT.md`
- PACK-007 impl: `src/lib/maps/` · migrations `20260806010000_*` / `20260806020000_*` · `3fb96fb`
- PACK-008 impl: `src/lib/export/` · `app/api/export/route.ts` · `86bcf2f`
- `docs/SCALING-ASSESSMENT-50-DISPATCHERS.md` · `docs/MAPS-API-SETUP.md`
- `planning/WORK-BACKLOG.md` (TASK-027, TASK-037)
