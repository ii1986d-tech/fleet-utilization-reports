# Test Matrix — FUR-001

> Updated 2026-08-04 — PACK-006 field-confirmation acceptance criteria added (Architect; not executed)

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
| TM-24 | AI extraction schema validation / reject malformed | Unit | OPEN | PACK-006 Apply; ADR-009 |
| TM-25 | Provider adapter normalize (Gemini/xAI → internal) | Unit (mocked) | OPEN | PACK-006; no live keys in default CI |
| TM-26 | Provenance: snapshot immutable; edit vs extracted | Unit | OPEN | PACK-006 |
| TM-27 | Confirmed order not overwritten by re-extract | Int | OPEN | PACK-006 |
| TM-28 | Extraction-run audit + safe errors + remote file delete status | Unit/Int | OPEN | PACK-006 |
| TM-29 | Cost/quota / no default dual-provider / bounded retry | Unit | OPEN | PACK-006 |
| TM-30 | Sample accuracy vs expected-field manifests (SPL-006-001…003+) | Fixture | OPEN | DS-004 complete; live provider eval blocked on DS-005 |
| TM-31 | Real customer PDF→provider blocked without DS-005 | Policy/Int | OPEN | DS-005 |
| TM-32 | No NEXT_PUBLIC AI keys / no browser→provider | Code/Security | OPEN | PACK-006 Apply review |
| TM-33 | Extracted field starts pending_review (incl. high confidence) | Unit/Int | OPEN | AC-006-18/19 |
| TM-34 | Admin + manager confirm; viewer denied | Auth/Int | OPEN | AC-006-20…22 |
| TM-35 | Edit → edited_pending_review; not auto-confirmed | Unit | OPEN | AC-006-23 |
| TM-36 | Confirm then edit revokes confirmation | Unit/Int | OPEN | AC-006-24 |
| TM-37 | Manual stop requires confirmation | Unit/Int | OPEN | AC-006-25 |
| TM-38 | Weiter blocked until mandatory confirmed; server 409 ORDER_REVIEW_INCOMPLETE | Int | OPEN | AC-006-26/27 |
| TM-39 | All mandatory confirmed allows progression | Int | OPEN | AC-006-28 |
| TM-40 | Confirmed visual only when DB confirmed; icon+label present | UI/Manual | OPEN | AC-006-29/30 |
| TM-41 | Field review audit event on confirm/revoke | Unit/Int | OPEN | AC-006-31 |
| TM-42 | Snapshot extracted_value immutable | Unit | OPEN | AC-006-32 |
| TM-43 | Independent stop confirmation; sequence change re-review | Unit/Int | OPEN | AC-006-33/34 |
| TM-44 | conflict blocks Weiter | Unit/Int | OPEN | AC-006-35 |
| TM-45 | Admin/manager reorder stops; viewer denied | Auth/UI/Int | OPEN | AC-006-36…38 |
| TM-46 | Drag-and-drop and keyboard reorder update sequence numbers | UI/Unit | OPEN | AC-006-39…41 |
| TM-47 | Reorder revokes confirmation; requires re-confirm; blocks Weiter; server 409 if unconfirmed | Unit/Int | OPEN | AC-006-42…45 |
| TM-48 | Audit `stops_reordered` old/new `stop_id` arrays; snapshot order immutable; incomplete street stays null | Unit/Int/Fixture | OPEN | AC-006-46…48 |
| TM-49 | Concurrent reviewers; loser 409 `ORDER_VERSION_CONFLICT`; no lost update | Int | OPEN | AC-006-49 |
| TM-50 | Stale field edit / reorder / confirm / Weiter → `ORDER_VERSION_CONFLICT`; reload+retry OK | Int | OPEN | AC-006-50…54 |
| TM-51 | Transactional confirm; rollback on failure; duplicate confirm/completion safe | Int | OPEN | AC-006-55…57 |
| TM-52 | Upload idempotency (same key/payload; key reuse mismatch; no silent merge on hash) | Int | OPEN | AC-006-58…60 |
| TM-53 | Extraction idempotency; auditable retries; terminal retry needs explicit action | Int | OPEN | AC-006-61…62 |
| TM-54 | Reorder preserves confirmations/provenance/partial-load/leg/audit `stop_id` refs | Unit/Int | OPEN | AC-006-63 |
| TM-55 | Non-PDF / MIME mismatch / invalid signature / oversized rejected | Unit/Int | OPEN | AC-006-64…67 |
| TM-56 | Malformed provider JSON; timeout; retry limit; no silent fallback | Unit/Int | OPEN | AC-006-68…70 |
| TM-57 | Static Maps link OK; no Maps routing API; explicit Save + unsaved warning | Unit/UI | OPEN | AC-006-71…72 |
| TM-58 | Line Haul Units / Grand Total provenance fixtures (private manifests) | Fixture | OPEN | AC-006-73…74 |
| TM-59 | Sensitive-log redaction; retention/deletion audit + ASM-014 residual | Security | OPEN | AC-006-75…76 |
| TM-60 | Roundtrip / shared delivery / three partial loads / incomplete address | Fixture/Int | OPEN | AC-006-77 |
| TM-61 | Audit `completion_gate_rejected` + `stale_write_rejected` (+ full catalog) | Unit/Int | OPEN | AC-006-78; ADR-009 §15 |

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
