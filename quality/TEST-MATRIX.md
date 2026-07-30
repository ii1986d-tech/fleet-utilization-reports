# Test Matrix — FUR-001

> Updated 2026-07-30 — PACK-003 accepted with follow-ups

| ID | Criterion | Type | Result | Evidence |
|---|---|---|---|---|
| TM-01 | Tagesaggregation | Unit/Int | OPEN | |
| TM-02 | Tagesgrenze + Zeitzone | Unit | OPEN | |
| TM-03 | Kilometerwerte / Quellenreihenfolge | Unit | OPEN | |
| TM-04 | Fahrzeug-Fahrzeit | Unit | OPEN | |
| TM-05 | Standzeit (Fenster − Fahrzeit) | Unit | OPEN | |
| TM-06 | Status ≥9h / 7–9h / <7h / 0 | Unit | OPEN | |
| TM-07 | Fahrzeug ohne Bewegung | Unit | OPEN | |
| TM-08 | Fahrerwechsel historisch | Int | READY | PACK-002 as-of unit tests (FU deepen = TASK-012+) |
| TM-09 | Auftraggeberwechsel historisch | Int | READY | PACK-002 as-of unit tests |
| TM-10 | Überlappende Zuordnungen | Int | PARTIAL | Domain + remote exclusion; live bypass/race = FU-002-02/03 |
| TM-11 | Excel-Import gültige Zeilen | Int | PARTIAL | PACK-003 unit/parse PASS; deeper confirm = FU-003-02 |
| TM-12 | Excel-Import fehlerhafte Zeilen + Fehlerdatei | Int | PARTIAL | Row errors in UI; downloadable report = FU-003-01 |
| TM-13 | Doppelter Import idempotent | Int | PARTIAL | Skip + CAS/409 unit/mapped; live race = residual |
| TM-14 | API-Teilfehler eines Fahrzeugs | Int | OPEN | |
| TM-15 | API-Timeout / Token expired | Int | OPEN | |
| TM-16 | Re-Import desselben Tages | Int | OPEN | |
| TM-17 | PDF mit Filtern | E2E | OPEN | |
| TM-18 | Excel mit Filtern | E2E | OPEN | |
| TM-19 | RLS Rollenmatrix | Int | PARTIAL | PACK-001 remote RLS + helpers; real JWT = FU-002-01 |
| TM-20 | Export leerer Ergebnismenge | E2E | OPEN | |

## PACK-003 automated gate evidence

| Gate | Result |
|---|---|
| `npm test` | **38/38 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

## Accepted follow-ups (validation)

| FU | Coverage gap | Backlog |
|---|---|---|
| FU-003-01 | Downloadable error-report `.xlsx` | TASK-017 / RSK-016 |
| FU-003-02 | Confirm / partial / create-on automated tests | TASK-018 / RSK-016 |
| FU-003-03 | Atomic master create + assignment insert | TASK-019 / RSK-016 |
| FU-002-01…06 | PACK-002 gaps (incl. live JWT RLS) | RSK-012 — **not absorbed** |

## PACK-002 automated gate evidence (preserved)

| Gate | Result |
|---|---|
| `npm test` | **20/20 PASS** (at PACK-002 acceptance; suite now 38 with PACK-003) |

Practice cases preserved: >9h driving, 7–9h, <7h, idle, two drivers, mid-month assignment change, customer change, partial data, double import, Frotcom vehicle not yet local.
