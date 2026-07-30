# Test Matrix — FUR-001

> Updated 2026-07-30 — PACK-002 accepted with follow-ups

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
| TM-11 | Excel-Import gültige Zeilen | Int | OPEN | PACK-003 |
| TM-12 | Excel-Import fehlerhafte Zeilen + Fehlerdatei | Int | OPEN | PACK-003 |
| TM-13 | Doppelter Import idempotent | Int | OPEN | |
| TM-14 | API-Teilfehler eines Fahrzeugs | Int | OPEN | |
| TM-15 | API-Timeout / Token expired | Int | OPEN | |
| TM-16 | Re-Import desselben Tages | Int | OPEN | |
| TM-17 | PDF mit Filtern | E2E | OPEN | |
| TM-18 | Excel mit Filtern | E2E | OPEN | |
| TM-19 | RLS Rollenmatrix | Int | PARTIAL | PACK-001 remote RLS + PACK-002 helpers; real JWT automation = FU-002-01 |
| TM-20 | Export leerer Ergebnismenge | E2E | OPEN | |

## PACK-002 automated gate evidence

| Gate | Result |
|---|---|
| `npm test` | **20/20 PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

## Accepted follow-ups (validation)

| FU | Coverage gap | Backlog |
|---|---|---|
| FU-002-01 | Real Auth/JWT RLS automation | TASK-012 |
| FU-002-02 | Parallel-client race harness | TASK-013 |
| FU-002-03 | Live DB-bypass → 409 | TASK-014 |
| FU-002-04 | End/deactivate preserve-row asserts | TASK-015 |
| FU-002-05 | Correction FOR UPDATE hardening review | TASK-016 |
| FU-002-06 | Local Docker | RSK-009 env note |

## Mandatory scenarios (fixtures)

1. >9h driving  2. 7–9h  3. <7h  4. idle all day  5. two drivers same vehicle  6. assignment change mid-month  7. customer change  8. partial data  9. double import  10. Frotcom vehicle not yet local
