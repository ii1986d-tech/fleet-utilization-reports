# FUR-001 — Project Context (INDEX ONLY)

> **Not a Source of Truth.** Status facts are owned elsewhere (see map).
> Regenerated: **2026-08-06** · HEAD: **`86bcf2f`**
> If this file disagrees with Mission Control, **Mission Control wins**.

## Identity

- Product: Fleet Utilization Reports (FUR-001)
- Stack: Next.js App Router + TypeScript + Supabase (ADR-001…003)
- Vendor launcher kit: presentation only (`Project-Launcher-Professional-v4.4.1/`)

## Current phase / pack ladder

Read **`planning/STATE.md`** and **`planning/PACK-REGISTRY.md`**.

| Pack | Status (index mirror — verify in registry) |
|---|---|
| PACK-001…005 | COMPLETE |
| PACK-006 | COMPLETE |
| PACK-007 | IMPLEMENTED_PENDING_CLOSEOUT |
| PACK-008 | IMPLEMENTED_PENDING_PILOT |

## Source-of-Truth ownership map

| Fact | Owner |
|---|---|
| Pack lifecycle | `planning/PACK-REGISTRY.md` + `planning/EXECUTION-STATE.json` |
| Next action | `planning/STATE.md` |
| Decisions (DS/ASM) | `planning/OPEN-DECISION-STOPS.md` |
| ADR status | `architecture/ADR-*.md` + `architecture/DECISION-REGISTER.md` |
| Tasks | `planning/WORK-BACKLOG.md` |
| Machine import | `project-state.json` |
| Evidence verdict | Sprint closeout / ACCEPTANCE-RECORD |
| Sync process | `planning/LAUNCHER-SYNC.md` |

## Blocking / open decisions (IDs only)

| ID | Status | Detail owner |
|---|---|---|
| DS-001 | OPEN | Frotcom contract — `OPEN-DECISION-STOPS.md` |
| DS-004 | COMPLETE | samples |
| DS-005 | APPROVED | `OPEN-DECISION-STOPS.md` |
| ASM-014 | RESOLVED (legal auto-purge follow-up) | `ASSUMPTIONS.md` |

## Next action

See **`planning/STATE.md`** → TASK-037 export pilot; HTML import recorded FRESH (`launcherImportAt=2026-08-06T18:46:23.000Z`).

## Links

- Architect briefing: `planning/ARCHITECT-BRIEFING.md`
- PACK-006 closeout: `sprints/sprint-006/CLOSEOUT-AUDIT.md`
- PACK-007 pack doc: `sprints/sprint-007/PACK-007.md`
- Gemini pilot: `docs/GEMINI-PILOT-REPORT-2026-08-05.md`
- Maps setup: `docs/MAPS-API-SETUP.md`
- Scaling: `docs/SCALING-ASSESSMENT-50-DISPATCHERS.md`
- Agent rules: `AGENTS.md`

---

*Index only. Do not paste ADR bodies, full backlogs, test matrices, or Product Vision here.*
