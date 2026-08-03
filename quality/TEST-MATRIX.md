# Test Matrix — FUR-001

> Updated 2026-08-03 — PACK-005 formally accepted with follow-ups

| ID | Criterion | Type | Result | Evidence |
|---|---|---|---|---|
| TM-01 | Tagesaggregation | Unit/Int | OPEN | |
| TM-02 | Tagesgrenze + Zeitzone | Unit | OPEN | |
| TM-03 | Kilometerwerte / Quellenreihenfolge | Unit | OPEN | |
| TM-04 | Fahrzeug-Fahrzeit | Unit | OPEN | |
| TM-05 | Standzeit (Fenster − Fahrzeit) | Unit | OPEN | |
| TM-06 | Status ≥9h / 7–9h / <7h / 0 | Unit | OPEN | |
| TM-07 | Fahrzeug ohne Bewegung | Unit | OPEN | |
| TM-08 | Fahrerwechsel historisch | Int | READY | PACK-002 as-of unit tests |
| TM-09 | Auftraggeberwechsel historisch | Int | READY | PACK-002 as-of unit tests |
| TM-10 | Überlappende Zuordnungen | Int | PASS | Domain + exclusion + PACK-005 live/concurrency |
| TM-11 | Excel-Import gültige Zeilen | Int | PASS | PACK-003/004 + PACK-005 confirm suite |
| TM-12 | Excel-Import fehlerhafte Zeilen + Fehlerdatei | Unit | PASS (unit) | tests/imports/report.test.ts; FU-003-01 **CLOSED** |
| TM-13 | Doppelter Import idempotent | Int | PASS_WITH_RESIDUAL | Skip + CAS; C14 unit residual; concurrent BEST-EFFORT satisfied |
| TM-14 | API-Teilfehler eines Fahrzeugs | Int | OPEN | |
| TM-15 | API-Timeout / Token expired | Int | OPEN | |
| TM-16 | Re-Import desselben Tages | Int | OPEN | |
| TM-17 | PDF mit Filtern | E2E | OPEN | |
| TM-18 | Excel mit Filtern | E2E | OPEN | |
| TM-19 | RLS Rollenmatrix | Int | PASS | Live JWT PACK-005; FU-002-01 **CLOSED** |
| TM-20 | Export leerer Ergebnismenge | E2E | OPEN | |
| TM-21 | Atomic import-row persist | DB/Int | PASS | RPC + PACK-005 orphan rollback O01–O03 |
| TM-22 | Import error-report formula-safe | Unit | PASS | = + - @ unit coverage |
| TM-23 | Audit preview vs persist errors | Unit/Code | PASS | persistence_errors column + confirm path |

## PACK-005 evidence gates

| Gate | Result |
|---|---|
| Evidence suite | 37 · 36 PASS · 1 PARTIAL (C14) · 0 FAIL |
| npm test | **63/63 PASS** |
| lint / build / diff-check | PASS |
| Migration Local==Remote | PASS (unchanged) |
| Live JWT RLS | PASS → FU-002-01 **CLOSED** |
| Confirm DB suite | PASS with C14 unit residual → FU-003-02 **CLOSED_WITH_RESIDUAL** |
| Orphan rollback | PASS → FU-003-03 **CLOSED** |
| Concurrent CAS | PASS BEST-EFFORT → OQ-004-04 **CLOSED / SATISFIED** |

## Explicit residual non-overclaims

| Item | Honest status |
|---|---|
| C14 remote transport inject | **PARTIAL** (unit only) |
| `correctAssignment` FOR UPDATE | **GAP_DOCUMENTED** residual |
| Local Docker/Supabase DB evidence | **not claimed** |
