# Test Matrix — FUR-001

> FUR-001 Anweisungen §18 — stored under export-defined `quality/`

| ID | Criterion | Type | Result | Evidence |
|---|---|---|---|---|
| TM-01 | Tagesaggregation | Unit/Int | OPEN | |
| TM-02 | Tagesgrenze + Zeitzone | Unit | OPEN | |
| TM-03 | Kilometerwerte / Quellenreihenfolge | Unit | OPEN | |
| TM-04 | Fahrzeug-Fahrzeit | Unit | OPEN | |
| TM-05 | Standzeit (Fenster − Fahrzeit) | Unit | OPEN | |
| TM-06 | Status ≥9h / 7–9h / <7h / 0 | Unit | OPEN | |
| TM-07 | Fahrzeug ohne Bewegung | Unit | OPEN | |
| TM-08 | Fahrerwechsel historisch | Int | OPEN | |
| TM-09 | Auftraggeberwechsel historisch | Int | OPEN | |
| TM-10 | Überlappende Zuordnungen | Int | OPEN | |
| TM-11 | Excel-Import gültige Zeilen | Int | OPEN | |
| TM-12 | Excel-Import fehlerhafte Zeilen + Fehlerdatei | Int | OPEN | |
| TM-13 | Doppelter Import idempotent | Int | OPEN | |
| TM-14 | API-Teilfehler eines Fahrzeugs | Int | OPEN | |
| TM-15 | API-Timeout / Token expired | Int | OPEN | |
| TM-16 | Re-Import desselben Tages | Int | OPEN | |
| TM-17 | PDF mit Filtern | E2E | OPEN | |
| TM-18 | Excel mit Filtern | E2E | OPEN | |
| TM-19 | RLS Rollenmatrix | Int | OPEN | |
| TM-20 | Export leerer Ergebnismenge | E2E | OPEN | |

## Mandatory scenarios (fixtures)

1. >9h driving  2. 7–9h  3. <7h  4. idle all day  5. two drivers same vehicle  6. assignment change mid-month  7. customer change  8. partial data  9. double import  10. Frotcom vehicle not yet local
