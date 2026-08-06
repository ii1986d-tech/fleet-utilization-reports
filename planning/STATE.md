# State — Fleet Utilization Reports (FUR-001)

- Updated: **2026-08-06**
- SoT freshness: see `project-state.json` → `launcherFreshness` · process: `planning/LAUNCHER-SYNC.md`
- Binding operating model: **Mission Control at repository root** (vendor launcher = presentation only)
- Release baseline: **v1.0.0** (`a0b96a1`) — PACK-001…005 accepted
- PACK-006 status: **COMPLETE**
- PACK-007 status: **COMPLETE** (Parts 1–3)
- PACK-008 status: **IMPLEMENTED** (Excel + PDF export; no live AI)
- Scaling: Phase 1 pilot (1–5) ready; FU-SCALE-001…008 before wider rollout
- Next: PACK-008 pilot with real data (TASK-037); configure Maps API key when ready
- DS-005: **RESOLVED / APPROVED**
- ASM-014: **RESOLVED**
- Security follow-ups: **FU-SEC-001** / **FU-SEC-002** (non-blocking)

## Pack ladder

| Pack | Status |
|---|---|
| PACK-001…005 | **COMPLETE** |
| PACK-006 | **COMPLETE** |
| PACK-007 | **COMPLETE** |
| PACK-008 | **IMPLEMENTED** |

## Next authorized action

1. TASK-037: pilot export with real orders (Excel + PDF).
2. Pilot with 1–5 users; keep `MAPS_API_ENABLED=false` until key/billing ready.
3. Do not scale past Phase 1 without FU-SCALE-001…008.
4. FU-AI-001 / FU-SEC-001 as scheduled.

## Evidence pointers

- `src/lib/export/` · `app/api/export/route.ts` · `src/components/export/ExportPanel.tsx`
- `docs/SCALING-ASSESSMENT-50-DISPATCHERS.md`
- `docs/MAPS-API-SETUP.md`
- `planning/WORK-BACKLOG.md` (TASK-027, TASK-037)
