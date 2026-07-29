# Phase 0 Abschlussbericht — FUR-001

> 2026-07-29 · Project Launcher Professional v4.4.1 ZIP-export SoT

## Ist-Zustand

- Ausführbarer Launcher: `Project-Launcher-Professional-v4.4.1/01-Launcher/project-launcher-professional-v4.4.1.html` (v4.4.1)
- Anwendungscode: keiner (greenfield)
- Fachquelle: `Anweisungen die Cursor in Project launcher eintragen soll.txt`
- Kanonische Struktur im Projektstamm materialisiert (nicht in Paket-Unterordnern)
- Nicht verwendet: `architect/`, `builder/`, `.project-launcher/`, `releases/`

## Erzeugter Dateibaum (FUR-001, ohne Launcher-Paket)

```text
.
├── .claude/commands/
├── .cursor/rules/project-launcher.mdc
├── .env.example
├── .gitignore
├── AGENTS.md
├── HOW-TO.md
├── METHOD-VERSION.json
├── README.md
├── acceptance.md
├── blueprint.md
├── DISCOVERY-REPORT.md
├── intake-schema.json
├── project-state.json
├── requirements.md
├── ai/
├── architecture/          (DECISION-REGISTER + ADR-001..004)
├── business/
├── commands/
├── data/DATA-MODEL.md
├── git/
├── governance/
├── knowledge/
├── operations/
├── planning/              (STATE, ARCHITECT-BRIEFING, DECISIONS, …)
├── prompts/
├── quality/               (inkl. TEST-MATRIX)
├── references/
├── release/
└── sprints/sprint-001/    (HANDOFF, requirements, …)
```

## Architekturentscheidungen

| ADR | Entscheidung |
|---|---|
| ADR-001 | Next.js App Router + TS strict + Supabase + n8n |
| ADR-002 | Supabase SoR; n8n daily import; UI reads DB only |
| ADR-003 | Supabase Auth + RLS (admin/manager/viewer) |
| ADR-004 | Frotcom adapter + mocks until contract verified |

## Offene Decision Stops

Siehe `planning/OPEN-DECISION-STOPS.md`:

1. **DS-001** Frotcom API-Vertrag (blockiert nur Phase 5)
2. **DS-002** Zeitzone/Org-Name (Defaults akzeptierbar)
3. **DS-003** Credential-Rotation bestätigen (Security, kein Code)

## Validierung

- Top-Level-Ordner gegen v4.4.1 `buildFiles` verifiziert vor Anlage
- Keine parallele Blank-/Rescue-Struktur
- Launcher-Paket unverändert gelassen
- Keine Secrets in Dateien
- Kein Git-Repository vorhanden → kein Commit

## Git-Status

`fatal: not a git repository` — Arbeitsverzeichnis ist noch kein Git-Repo. Checkpoint-Inhalt steht in `git/GIT-CHECKPOINT.md` (Commit [OFFEN]).

## Empfehlung erstes Builder-Pack

**PACK-001 / Sprint 001 — Phase 1 Foundation**

- Handoff: `sprints/sprint-001/HANDOFF.md`
- Scope: TASK-001…006 (scaffold, Supabase, Auth/RLS, Migrations, Tests, Frotcom mocks)
- Nächster Schritt: frische Builder-Session → Dry Run → Freigabe → Apply
