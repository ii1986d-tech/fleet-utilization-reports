# Project Launcher Professional v4.4.1 — Hardened Production Package

Lokaler, browserbasierter Projekt-Launcher für den Workflow **Intake → Discovery → Architect Pack → Freigabe → Builder → Evidence → Release**.

## Start
1. Öffne `START HERE.html`.
2. Starte `01-Launcher/project-launcher-professional-v4.4.1.html` (Chrome oder Edge empfohlen).
3. Wähle New Project, Existing Project oder Rescue — oder lade die Demo.
4. Fülle Intake und Discovery ehrlich; Unbekanntes bleibt `[OFFEN]`.
5. Exportiere den Projektordner als ZIP und öffne ihn in Cursor (oder einem anderen Editor).
6. Das Architect Pack entsteht im Projektordner über den Agent-Prompt `GENERATE THE PACK` — nicht per One-Click im Launcher.

## Was v4.4.1 ist
- Distribution-Paket (Docs, Blank, Demo, Templates, Knowledge, BG-Guide).
- Launcher-Intelligence seit der V4.2-Linie (Templates, Pack-Readiness, Recovery Advisor).
- Gate-Fix: alle 14 Evidence-Felder sind in der UI editier- und speicherbar.

## Was es nicht ist
Kein Git-Client, keine IDE, kein ChatGPT-in-Cursor, keine SaaS-Plattform, keine Datenbank und kein Deployment-System. Browser-Sicherheitsgrenzen bleiben bestehen. Ordner verbinden braucht Chromium + File System Access API.

## Demo-Hinweis
- **In-App-Demo**: Button „Demo“ im Launcher (lädt Beispielzustand in localStorage).
- **Paket-Demo**: `04-Demo-Project/generated-demo-project-v4.4.zip` ist ein exportiertes Beispielprojekt. Import im Launcher erwartet unkomprimierte Launcher-ZIPs mit `project-state.json`.
