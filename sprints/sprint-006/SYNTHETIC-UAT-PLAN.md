# PACK-006 — Synthetic UAT plan

> Status: **EXECUTED** — see `SYNTHETIC-UAT-RESULTS.md` + `SYNTHETIC-UAT-RESULTS.json`
> Mode: Synthetic fixtures / mock provider only
> DS-005: **OPEN** (no live Gemini/xAI/Grok)
> Live DB evidence: **PASS** locally (11 passed / 1 intentional skip / 0 failed; `PACK006_PREFLIGHT_PASS`)
> Synthetic UAT: **19 passed / 0 failed / 0 blocked** (API/server primary; browser UI not automated)
> Forbidden: real business values · `references/private/**` · Maps routing APIs
> Related: ADR-009 · acceptance.md · scripts/pack006-evidence/

## Purpose

Human-executable and automation-aligned UAT cases using **generated synthetic** transport-order data only. Pass/Fail evidence columns below reflect the executed local mock run; full detail in `SYNTHETIC-UAT-RESULTS.md`.

## Conventions

| Item | Rule |
|---|---|
| Synthetic labels | `SYN-*` prefixes only (e.g. `SYN-TOUR-1`, `SYN-CITY-A`) |
| Provider | `mock` only while DS-005 OPEN |
| Actors | `admin` · `manager` · `viewer` (JWT `app_metadata.role`) |
| Version | Integer aggregate CAS; stale → `ORDER_VERSION_CONFLICT` |
| Evidence | Fill **Pass/Fail evidence** when executed; leave blank until then |
| Scenario count | **19** |

---

## UAT-01 — Simple transport

| Field | Content |
|---|---|
| Synthetic input | Mock PDF → one pickup `SYN-CITY-A`, one delivery `SYN-CITY-B`, business id `SYN-BIZ-SIMPLE` |
| Actor role | admin |
| Steps | Upload → mock extract → confirm all fields → confirm stop order → Weiter |
| Expected review state | All required targets terminal; `review_completed_at` set |
| Expected audit events | `extraction_completed`, `field_confirmed` (n), `stop_order_confirmed`, `review_completed` |
| Expected version changes | +1 per successful mutate/confirm/complete (monotonic) |
| Expected error code | none |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; `synthetic-uat.live.test.ts#UAT-01`; v1→4; review_completed |

## UAT-02 — Two partial loads with shared delivery

| Field | Content |
|---|---|
| Synthetic input | Mock mode with 2 partial-load positions sharing one delivery `stop_id`; two pickups |
| Actor role | manager |
| Steps | Extract → verify shared `deliveryStopId` → confirm fields + stop order → Weiter |
| Expected review state | Both positions reference valid stop_ids; complete succeeds |
| Expected audit events | `extraction_completed`, confirms, `review_completed` |
| Expected version changes | CAS increments on each successful mutation |
| Expected error code | none |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; 2 PL shared delivery; v1→4 |

## UAT-03 — Roundtrip

| Field | Content |
|---|---|
| Synthetic input | Mock roundtrip: ≥4 stops, ≥2 transport legs (outbound + return) |
| Actor role | admin |
| Steps | Extract → verify distinct stop_ids for return stop → confirm → Weiter |
| Expected review state | Legs retain valid origin/destination stop_ids after any reorder |
| Expected audit events | `extraction_completed`, confirms, `review_completed` |
| Expected version changes | Monotonic |
| Expected error code | none |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; 4 stops / 2 legs; valid stop_ids |

## UAT-04 — Three partial loads

| Field | Content |
|---|---|
| Synthetic input | Mock with three partial-load positions; synthetic refs only |
| Actor role | manager |
| Steps | Extract → confirm position stop refs + cargo fields (nulls not invented) → Weiter |
| Expected review state | Three positions; null cargo stays null unless human-edited |
| Expected audit events | confirms / edits as performed; `review_completed` |
| Expected version changes | Monotonic |
| Expected error code | none |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; 3-PL persist fixture (mock label); null cargo preserved |

## UAT-05 — Incomplete address

| Field | Content |
|---|---|
| Synthetic input | Mock stop with missing street; raw or city may be present (`SYN-INCOMPLETE`) |
| Actor role | admin |
| Steps | Extract → observe pending location quality → either edit+confirm or `missing_confirmed` / complete blocked until resolved |
| Expected review state | Weiter blocked while location structural/review targets unresolved |
| Expected audit events | `extraction_completed`; optional `field_edited` / `missing_confirmed` |
| Expected version changes | No complete bump until gate passes |
| Expected error code | `ORDER_REVIEW_INCOMPLETE` if Weiter early |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; early ORDER_REVIEW_INCOMPLETE; missing_confirmed unlock |

## UAT-06 — Line Haul Units versus Grand Total

| Field | Content |
|---|---|
| Synthetic input | Mock billing-provenance fixture: `paidKilometersSource=Line Haul Units`, `freightSource=Grand Total` (synthetic labels only) |
| Actor role | manager |
| Steps | Extract → verify provenance fields present → confirm → Weiter |
| Expected review state | Provenance fields reviewable; values not silently swapped |
| Expected audit events | `field_confirmed` for provenance fields when confirmed |
| Expected version changes | Monotonic |
| Expected error code | none |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; paid=787 Line Haul Units; freight=1018.71 Grand Total |

## UAT-07 — Invalid PDF

| Field | Content |
|---|---|
| Synthetic input | Non-PDF bytes / wrong MIME / missing MIME / bad magic / oversized synthetic buffer |
| Actor role | admin |
| Steps | Attempt upload with each invalid variant |
| Expected review state | No order created |
| Expected audit events | none required for rejected upload (or safe reject only — no PDF body logs) |
| Expected version changes | none |
| Expected error code | `INVALID_PDF` |
| Pass/Fail evidence | **PASS** 2026-08-05 — product validator (`validatePdfUpload`); INVALID_PDF ×5; no order |

## UAT-08 — Duplicate upload (idempotency)

| Field | Content |
|---|---|
| Synthetic input | Same idempotency key + same synthetic PDF twice; then same key + different PDF |
| Actor role | admin (two client sessions) |
| Steps | Upload A → Upload A again → Upload conflict payload |
| Expected review state | First document reused; no duplicate business merge |
| Expected audit events | n/a or upload metadata only |
| Expected version changes | none for pure re-upload reuse |
| Expected error code | reuse: none; conflict: `IDEMPOTENCY_KEY_REUSE_MISMATCH` |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; reuse + IDEMPOTENCY_KEY_REUSE_MISMATCH |

## UAT-09 — Stale edit

| Field | Content |
|---|---|
| Synthetic input | Any simple synthetic order at version V |
| Actor role | admin |
| Steps | Mutate with `expected_version=V` success → retry mutate with `expected_version=V` |
| Expected review state | First edit applied; second rejected; prior values unchanged by loser |
| Expected audit events | `field_edited` (winner); no domain change from loser |
| Expected version changes | Winner +1 once; loser 0 |
| Expected error code | `ORDER_VERSION_CONFLICT` |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; ORDER_VERSION_CONFLICT on loser; v1→2 |

## UAT-10 — Concurrent reviewers

| Field | Content |
|---|---|
| Synthetic input | Shared order version V |
| Actor role | admin + manager |
| Steps | Both submit mutate with same `expected_version=V` |
| Expected review state | Exactly one write wins; other sees conflict; reload required |
| Expected audit events | Winner audit only for successful mutate |
| Expected version changes | Exactly +1 for winner |
| Expected error code | Loser: `ORDER_VERSION_CONFLICT` |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; one winner admin/manager; ORDER_VERSION_CONFLICT |

## UAT-11 — Stop reorder

| Field | Content |
|---|---|
| Synthetic input | ≥2 stops; partial load or leg refs present |
| Actor role | manager |
| Steps | Confirm stop order → reorder via API (keyboard/pointer equivalent) → verify stop_ids → re-confirm → Weiter |
| Expected review state | `stop_id` unchanged; sequence contiguous; stop-order becomes `edited_pending_review` then confirmed; PL/leg FKs valid |
| Expected audit events | `stops_reordered` with old/new stop_id arrays; `stop_order_confirmed` |
| Expected version changes | +1 reorder; +1 confirm (minimum) |
| Expected error code | Stale reorder: `ORDER_VERSION_CONFLICT` |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server + static UI wiring; stable stop_ids; stale conflict; keyboard/drag present (browser not automated) |

## UAT-12 — missing_confirmed

| Field | Content |
|---|---|
| Synthetic input | Field intentionally absent in mock extract (e.g. trailer plate null) |
| Actor role | admin |
| Steps | Mark field `missing_confirmed` via Save/mutate → complete other targets → Weiter |
| Expected review state | Field terminal `missing_confirmed`; gate accepts for that target |
| Expected audit events | `missing_confirmed` |
| Expected version changes | +1 on mutate |
| Expected error code | none (when all other targets resolved) |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; trailer missing_confirmed; complete ok |

## UAT-13 — not_applicable

| Field | Content |
|---|---|
| Synthetic input | Field not applicable to synthetic scenario (e.g. trailer) |
| Actor role | manager |
| Steps | Mark `not_applicable` → resolve remaining → Weiter |
| Expected review state | Field terminal `not_applicable` |
| Expected audit events | `not_applicable_confirmed` |
| Expected version changes | +1 on mutate |
| Expected error code | none (when gate otherwise satisfied) |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server not_applicable; UI `Nicht zutreffend` added (UAT-DEF-001 resolved; static/source only — browser interactive not claimed) |

## UAT-14 — conflict

| Field | Content |
|---|---|
| Synthetic input | Order with a field forced/set to `conflict` (test fixture or controlled mock) |
| Actor role | admin |
| Steps | Attempt Weiter without resolving conflict |
| Expected review state | Completion blocked |
| Expected audit events | no `review_completed` |
| Expected version changes | no completion bump |
| Expected error code | `ORDER_REVIEW_INCOMPLETE` (unresolved includes conflict target) |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; conflict fixture blocks Weiter; version unchanged |

## UAT-15 — extraction_failed

| Field | Content |
|---|---|
| Synthetic input | Mock provider `malformed_json` / terminal failure mode |
| Actor role | admin |
| Steps | Extract → observe failure → retry without force → forceRetry |
| Expected review state | Terminal failure until explicit retry; no silent success |
| Expected audit events | failure path safe (no PDF bytes); success audit after forced retry |
| Expected version changes | Order appears only after successful materialize |
| Expected error code | `EXTRACTION_FAILED` until successful retry |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; EXTRACTION_FAILED terminal; success with new extract key |

## UAT-16 — Incomplete Weiter gate

| Field | Content |
|---|---|
| Synthetic input | Fresh extracted order; fields still `pending_review` |
| Actor role | admin |
| Steps | Call complete/Weiter immediately |
| Expected review state | Unchanged; `review_completed_at` null |
| Expected audit events | Prefer no `completion_gate_rejected` side-effect mutate (ADR preferred); no `review_completed` |
| Expected version changes | 0 |
| Expected error code | `ORDER_REVIEW_INCOMPLETE` + machine-readable unresolved targets |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; ORDER_REVIEW_INCOMPLETE; no review_completed |

## UAT-17 — Viewer read-only

| Field | Content |
|---|---|
| Synthetic input | Existing synthetic order |
| Actor role | viewer |
| Steps | Read list/detail → attempt upload/mutate/reorder/complete |
| Expected review state | Reads succeed; mutations denied |
| Expected audit events | none for denied writes |
| Expected version changes | 0 |
| Expected error code | `FORBIDDEN` (action and/or RPC) |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; read ok; mutate/reorder/complete FORBIDDEN |

## UAT-18 — Admin end-to-end workflow

| Field | Content |
|---|---|
| Synthetic input | Full happy-path synthetic PDF (`SYN-ADMIN-E2E`) |
| Actor role | admin |
| Steps | Upload → extract → edit one field → confirm all → confirm stop order → static Maps link present → Weiter → duplicate Weiter |
| Expected review state | Completed; duplicate complete safe |
| Expected audit events | Includes `review_completed` exactly once for completion |
| Expected version changes | Monotonic; duplicate complete no extra completion audit |
| Expected error code | none on success path |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; edit + maps static link + review_completed×1 |

## UAT-19 — Manager end-to-end workflow

| Field | Content |
|---|---|
| Synthetic input | Full happy-path synthetic PDF (`SYN-MGR-E2E`) |
| Actor role | manager |
| Steps | Same as UAT-18 with manager identity; viewer must not be able to perform these steps |
| Expected review state | Completed under manager |
| Expected audit events | Actor role recorded as manager on audits |
| Expected version changes | Monotonic |
| Expected error code | none on success path |
| Pass/Fail evidence | **PASS** 2026-08-05 — API/server; actor_role=manager on review_completed |

---

## Traceability matrix (summary)

| Case | Primary AC / concern |
|---|---|
| UAT-01…04 | Structural extract + complete |
| UAT-05 | Incomplete address / gate |
| UAT-06 | Billing provenance |
| UAT-07…08 | Upload security + idempotency |
| UAT-09…10 | CAS concurrency |
| UAT-11 | stop_id + reorder |
| UAT-12…15 | Review states |
| UAT-16 | Weiter gate |
| UAT-17…19 | AuthZ roles |

## Execution notes

1. Live DB evidence: `npm run test:pack006-db-evidence` (local PASS).
2. Synthetic UAT automation: `npm run pack006:synthetic-uat` (mock + local Supabase).
3. Results: `SYNTHETIC-UAT-RESULTS.md` / `.json`. Browser interactive UI remains separately verified.
4. Do not claim DS-005 or ASM-014 resolved from UAT alone.
