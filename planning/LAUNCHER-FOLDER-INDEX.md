# Project Launcher Package Index — `Project-Launcher-Professional-v4.4.1/`

> Audited: **2026-08-05**
> Role: **static method / distribution package** (not live Mission Control SoT)
> Classification: **PARTIALLY_WORKING** for agent workflow (presentation + kit only)
> Binding sync for live status: `planning/LAUNCHER-SYNC.md`

## Binding rules for agents

1. **Do not treat this folder as canonical project status.**
   Live SoT = root `planning/STATE.md`, `project-state.json`, `PACK-REGISTRY.md`, `WORK-BACKLOG.md`, `EXECUTION-STATE.json`, `ARCHITECT-BRIEFING.md`.
2. **Do not modify** files under `Project-Launcher-Professional-v4.4.1/` during pack work (see `sprints/sprint-001/CONTEXT-MANIFEST.md`).
3. **Do not create** root `architect/`, `builder/`, or `.project-launcher/` for FUR-001 (new-project mode).
4. HTML Mission Control state lives in **browser localStorage** until a human imports `project-state.json`.
5. After milestones: update root SoT → validate JSON → human re-imports HTML → set `launcherFreshness.launcherImportAt`.

## Top-level layout

| Path | Intended role |
|---|---|
| `01-Launcher/` | Executable HTML UI + SHA256 checksum |
| `01-Launcher/project-launcher-professional-v4.4.1.html` | Browser Mission Control (localStorage; import/export `project-state.json`) |
| `01-Launcher/SHA256.txt` | Integrity check for the HTML file |
| `02-Documentation/` | Install, changelog, best practices, source matrix |
| `03-Blank-Project/` | **Template** tree only (`architect/`, `builder/`, sample `planning/`) — **not** FUR-001 live paths |
| `04-Demo-Project/` | Demo ZIP for in-launcher demo import |
| `05-Templates/` | Intake templates (e.g. Report-Generator) |
| `06-Architect-Knowledge/` | Method knowledge snippets (discovery, gates, governance) |
| `07-Examples/` | New / existing / rescue workflow examples |
| `08-Bulgarian-Guide/` | BG quick-start |
| `START HERE.html` | Entry HTML |
| `RELEASE-MANIFEST.json` | Package file inventory + hashes |
| `LICENSE.txt` | License |

## What Cursor is instructed to use instead

| Concern | Live path (repo root) |
|---|---|
| State | `planning/STATE.md` |
| Machine state | `project-state.json` |
| Packs / backlog | `planning/PACK-REGISTRY.md`, `planning/WORK-BACKLOG.md` |
| Execution snapshot | `planning/EXECUTION-STATE.json` |
| Briefing | `planning/ARCHITECT-BRIEFING.md` |
| Agent rules | `AGENTS.md`, `.cursor/rules/project-launcher.mdc` |

## Automatic read/write (evidence summary)

| Question | Answer |
|---|---|
| Always-applied rule points here? | **No** — points to root `planning/` + `project-state.json` |
| Binding “read package every task”? | **No** |
| Folder gitignored / cursorignored? | **No** `.cursorignore`; **not** in `.gitignore`; **excluded** from TypeScript (`tsconfig.json`) |
| Visible if path referenced? | **Yes** (in-repo) |
| Modified after Phase 0? | **No** — single commit `6486fa8`; PACK-006 did not touch it |
| Auto-sync with `project-state.json`? | **No** |

## Pack usage (package folder)

| Pack | Class |
|---|---|
| Phase 0 / PACK-001 start | `OCCASIONAL_USE` — vendor kit landed; live tree materialised at root |
| PACK-002…005 | `NOT_USED` — package static; status via root SoT |
| PACK-006 | `STATUS_ONLY` — HTML path cited in sync docs; package files unchanged |

Full audit conclusions: see agent response / `planning/LAUNCHER-SYNC.md`.
