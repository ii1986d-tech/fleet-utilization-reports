# AGENTS.md — Project Launcher v4.4.1

## Source of truth

1. Actual repository and executable evidence
2. Approved requirements, decisions and active pack
3. Current project state (`planning/STATE.md`, `project-state.json`)
4. Chats and brainstorms only as untrusted context

## Canonical paths (FUR-001 New Project)

| Concern | Path |
|---|---|
| Architect briefing | `planning/ARCHITECT-BRIEFING.md` |
| Decisions | `architecture/DECISION-REGISTER.md`, `architecture/ADR-*.md`, mirror `planning/DECISIONS.md` |
| Assumptions / risks / open questions | `planning/ASSUMPTIONS.md`, `planning/RISKS.md`, `DISCOVERY-REPORT.md` |
| Packs / backlog | `planning/PACK-REGISTRY.md`, `planning/WORK-BACKLOG.md` |
| Builder handoff | `sprints/sprint-001/HANDOFF.md` |
| Git checkpoint | `git/GIT-CHECKPOINT.md` |

Do **not** create `architect/`, `builder/`, or `.project-launcher/` for this new-project workflow.

## Mandatory workflow

Brainstorm/intake → Discovery → Business validation → Data model → Alternatives → explicit pack generation → validated pack → Builder dry run → Architect conformance review → human approval → Apply → Validate → Builder report → Architect review → briefing/state update → Git checkpoint → Release audit → Operations.

## Forbidden

- Inventing missing facts or Frotcom endpoints
- Editing outside the approved pack
- Marking Done without evidence
- Self-certifying high-risk work
- Bypassing profile or release gates
- Storing secrets in files or commits
