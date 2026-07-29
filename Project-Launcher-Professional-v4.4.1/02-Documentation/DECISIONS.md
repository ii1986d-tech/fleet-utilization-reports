# Technical Decisions — v4.4.1

## D-001: Packaging vor neuer Engine
v4.4 bleibt Distribution + Hardening. Keine neue methodische Engine.

## D-002: Ein Release-ZIP
Alle Dateien in einer nachvollziehbaren Ordnerstruktur.

## D-003: HTML bleibt Single-File
Keine Build-Pipeline und keine externe Laufzeit.

## D-004: Gate-UI muss dem State-Modell entsprechen
Alle 14 Evidence-Keys sind editierbar; Save ignoriert fehlende DOM-Knoten sicher.

## D-005: Getrennter LocalStorage-Key
`project-launcher:v4.4:state` mit Migration von `project-launcher:v4:state`.

## D-006: Keine Scope-Ausweitung
Kein SaaS, keine IDE-Integration, kein CI/CD-Produkt.
