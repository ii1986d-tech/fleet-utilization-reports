# Test Matrix — FUR-001

> Updated 2026-07-30 — PACK-004 Architect Review complete (ACCEPT_WITH_FOLLOW_UPS)

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
| TM-10 | Überlappende Zuordnungen | Int | PARTIAL | Domain + exclusion; FU-002-02/03 residual |
| TM-11 | Excel-Import gültige Zeilen | Int | PARTIAL | PACK-003 + PACK-004 RPC confirm path |
| TM-12 | Excel-Import fehlerhafte Zeilen + Fehlerdatei | Unit | PASS (unit) | tests/imports/report.test.ts; FU-003-01 propose close |
| TM-13 | Doppelter Import idempotent | Int | PARTIAL | Skip + CAS; transport finalize corrected (unit); concurrent best-effort not captured |
| TM-14 | API-Teilfehler eines Fahrzeugs | Int | OPEN | |
| TM-15 | API-Timeout / Token expired | Int | OPEN | |
| TM-16 | Re-Import desselben Tages | Int | OPEN | |
| TM-17 | PDF mit Filtern | E2E | OPEN | |
| TM-18 | Excel mit Filtern | E2E | OPEN | |
| TM-19 | RLS Rollenmatrix | Int | PARTIAL | Live JWT = FU-002-01 residual |
| TM-20 | Export leerer Ergebnismenge | E2E | OPEN | |
| TM-21 | Atomic import-row persist | DB/Int | PARTIAL | RPC applied remotely; automated orphan proof residual |
| TM-22 | Import error-report formula-safe | Unit | PASS | = + - @ unit coverage |
| TM-23 | Audit preview vs persist errors | Unit/Code | PASS (design+code) | persistence_errors column + confirm path |

## PACK-003 gate evidence (preserved)

| Gate | Result |
|---|---|
| npm test | **38/38 PASS** @ a68d8f9 |

## PACK-004 Apply gates

| Gate | Result |
|---|---|
| npm test | **63/63 PASS** (after transport correction) |
| npm run lint | PASS |
| npm run build | PASS |
| git diff --check | PASS |
| Migration Local==Remote | PASS (20260730170000; unchanged by correction) |
| Live JWT RLS | NOT EXECUTED (env limitation) |
| Concurrent CAS | NOT EXECUTED (env limitation) |

## Architect Review

See `sprints/sprint-004/ARCHITECT-REVIEW.md` — **ACCEPT_WITH_FOLLOW_UPS**. FU-003-01 closed.

## Targeted correction gates

Transport finalize correction: `tests/imports/confirm-transport.test.ts` — unit/mocked. Focused Architect Review: **ACCEPTED**. Formal status **PACK_004_ACCEPTED_WITH_FOLLOW_UPS**.

### Explicit non-claims

| Evidence | Status |
|---|---|
| Live JWT RLS | NOT_EXECUTED |
| Empirical orphan-rollback DB automation | OPEN (FU-003-03) |
| Concurrent CAS harness | NOT_EXECUTED / residual |
