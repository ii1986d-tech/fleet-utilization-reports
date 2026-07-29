# Fleet Utilization Reports (FUR-001)

> Generated for Project Launcher Pro v4.4.1 — Phase 0 materialization 2026-07-29

## Project

Internes Management- und Fahrzeugauslastungs-Reporting für eine Spedition: tägliche und historische Nutzungsdaten aus Frotcom speichern, auswerten und für Manager darstellen.

## Problem

Auslastung, Fahrer- und Auftraggeberzuordnung sowie Tageskilometer/Fahrzeiten sind heute nicht in einem prüfbaren, historischen Managementbericht gebündelt. Frotcom bleibt Quellsystem; dieses Tool ersetzt kein TMS.

## Business outcome

Manager sehen pro Fahrzeug und Tag Einsatz, Fahrer, Auftraggeber, Start-/Endort, Kilometer, Fahrzeit, Standzeit und Status relativ zu konfigurierbaren Zielwerten — historisch filterbar, mit Excel/PDF-Export.

## Workflow mode

New project

## Hard rules

1. Unknown information stays [OFFEN].
2. Repository evidence beats stale documentation.
3. No material architecture decision without alternatives.
4. Done without evidence is not Done.
5. Release starts operations.
6. Canonical SoT = v4.4.1 ZIP-export paths only (`planning/`, `architecture/`, `sprints/`, `git/`, …). Never `architect/`, `builder/`, or `.project-launcher/` for this new project.
7. No production secrets in the repository; chat-leaked Frotcom credentials are compromised.

## Active profile

Professional (minimum: Professional) — internal ops data, integrations, auth/RLS.

## Canonical docs

- `requirements.md`, `acceptance.md`, `blueprint.md`, `DISCOVERY-REPORT.md`
- `planning/STATE.md`, `planning/ARCHITECT-BRIEFING.md`
- `data/DATA-MODEL.md`, `architecture/DECISION-REGISTER.md`
- `sprints/sprint-001/HANDOFF.md`
