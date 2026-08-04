# Builder Dry-Run — PACK-006 (non-provider)

> Date: 2026-08-04  
> Mode: **Dry-run only** — no product code, tests, packages, migrations, stage, commit, or push  
> ADR-009: **ACCEPTED (design binding)** — Accepted by **I. Dimitrov** (2026-08-04)  
> Architect Re-Review: **ARCHITECT_REVIEW_PASS**  
> DS-004: **COMPLETE** · DS-005: **OPEN** (live Gemini/xAI blocked)  
> Apply: **NOT AUTHORIZED**  
> Providers: **mocks / fixtures / fake responses only** — no external API calls

## Recommendation

**READY_FOR_APPLY_AFTER_SEPARATE_AUTH** (non-provider path)

Live-provider increments remain **BLOCKED** until DS-005.

## Status

**PACK_006_NON_PROVIDER_DRY_RUN_COMPLETE** — implementation plan locked for human Apply authorization. Do not begin Apply until explicitly authorized.

---

## 1. Preflight

| Check | Result |
|---|---|
| ADR-009 | **ACCEPTED** (design) |
| Architect Re-Review | **PASS** |
| Working tree | Dirty — docs + pre-existing `src/lib/supabase/env.ts` / `.gitignore` |
| Product transport-order code | **Absent** (no Apply started) |
| Migrations for transport orders | **Absent** |
| Private path ignored | **Yes** (`references/private/`) |
| Private files staged/tracked | **No** |
| External AI / Maps calls in Dry-Run | **None** |

### Uncommitted hygiene (commit before Apply)

| Commit candidate | Contents |
|---|---|
| **A — env fix** | `src/lib/supabase/env.ts` only |
| **B — PACK-006 docs** | `architecture/ADR-009.md`, `DECISION-REGISTER.md`, `sprints/sprint-006/**`, planning/*, quality/*, `data/DATA-MODEL.md`, `docs/AUTH-ROLES.md`, `project-state.json`, `.gitignore` (`references/private/`) |
| **Never** | `references/private/**` |

No unrelated product/migration conflicts for PACK-006 Apply once commit A/B are clean.

---

## 2. Scope verdict

| In PACK-006 Apply (after auth) | Out |
|---|---|
| Upload validation, private Storage, mockable provider adapter | Live Gemini/xAI (DS-005) |
| Snapshot, working order, stops, partial loads, legs | PACK-007 routing / optimization / Maps Directions |
| Review states, Save, CAS, confirm, reorder, Weiter gate | PACK-008 export |
| Audit catalog, RLS, tests with mocks/fixtures | New Auth role `dispatcher` |
| Static Maps link construction (no routing API) | Excel `import_jobs` changes |

---

## 3. Safe reuse from existing repo

| Existing | Reuse |
|---|---|
| `src/lib/auth/session.ts` `requireAuthenticated` / `requireAdmin` | Extend with `requireAdminOrManager` (or equivalent) for PACK-006 writes; keep Excel import admin-only |
| `src/lib/auth/roles.ts` | Role enum; add helpers `canReviewTransportOrders` / `canUploadTransportOrders` |
| `src/lib/assignments/errors.ts` `appError` pattern | New error codes: `ORDER_VERSION_CONFLICT`, `ORDER_REVIEW_INCOMPLETE`, idempotency codes |
| `src/lib/supabase/server.ts` + env helpers | Server clients only for Storage/DB |
| ADR-008 CAS / RPC pattern (`persist_assignment_import_row`) | **Pattern only** — new RPCs for order mutate/complete; do not overload import RPCs |
| RLS `current_app_role()` | Same claim path for new tables |
| Zod schemas in masters/frotcom | Pattern for extraction + review schemas |
| Settings layout / pages | New settings/orders routes beside existing settings |

**Do not reuse:** `import_jobs` tables, Excel confirm CAS, `vehicle_assignments.source` for PDF.

---

## 4. Repository conflicts / risks before Apply

| Risk | Mitigation |
|---|---|
| Dirty tree mixes env.ts with docs | Commit A then B before Apply branch work |
| No Storage bucket today | Migration/config for **private** bucket; never public |
| Manager write is new vs masters (admin-only) | Explicit RLS + `requireAdminOrManager`; do not widen import RLS |
| Live keys temptation | Feature flag / env: `TRANSPORT_ORDER_PROVIDER=mock` until DS-005 |
| Private fixtures in CI | Use synthetic anonymized fixtures in `tests/fixtures/`; never commit private PDFs |
| ASM-014 retention duration open | Implement delete/expire hooks; duration config placeholder |

---

## 5. Proposed migrations (Apply — not created now)

Suggested single or split migrations (names indicative):

1. `YYYYMMDDHHMMSS_pack006_transport_order_domain.sql`
   - Tables: `transport_order_documents`, `transport_order_extraction_runs`, `transport_order_extractions`, `transport_orders` (`version`, `updated_at`, `updated_by`, stop-order review state), `transport_order_stops` (`stop_id` PK/UUID, unique `(order_id, sequence)`), `transport_order_partial_load_positions`, `transport_order_legs`, `transport_order_field_reviews` (entity_type/entity_id/field_name), `transport_order_field_review_events`, idempotency tables/keys
   - FKs by `stop_id`; CHECK on `review_status`; no array-index identity
2. `YYYYMMDDHHMMSS_pack006_transport_order_rls.sql`
   - RLS: authenticated read for admin/manager/viewer; write for admin/manager only; service-role for Storage server paths as designed
3. `YYYYMMDDHHMMSS_pack006_transport_order_rpcs.sql`
   - RPCs (search_path pinned): e.g. `mutate_transport_order_review(...)`, `reorder_transport_order_stops(...)`, `complete_transport_order_review(...)` — each CAS on `expected_version`, transactional, audit writes inside TX

Storage: private bucket `transport-order-pdfs` (or equivalent) via Supabase config / migration comments; signed/authorized access only.

---

## 6. Implementation increments

### INC-01 — Foundation: types, schemas, errors, auth helpers

| | |
|---|---|
| **Purpose** | Shared domain types, Zod schemas, error codes, role helpers; no DB yet |
| **Files** | `src/lib/transport-orders/types.ts`, `schema.ts`, `errors.ts`, `review/states.ts`; extend `src/lib/auth/roles.ts`, `session.ts` |
| **Migrations** | none |
| **API** | none |
| **Auth** | helpers only |
| **TX** | n/a |
| **Tests** | unit: state transitions; schema reject malformed; role matrix helpers |
| **ACs** | AC-006-18…24 (state semantics), AC-006-29…30 (state labels contract) |
| **Rollback** | delete new lib folder; revert auth helper additions |
| **Depends on** | — |

### INC-02 — Database + RLS + CAS RPCs

| | |
|---|---|
| **Purpose** | Persist domain; enforce CAS, uniqueness, RLS |
| **Files** | migrations above; regenerate `src/lib/supabase/types.ts` if project practice |
| **Migrations** | domain + RLS + RPCs |
| **API** | none yet (RPC callable later) |
| **Auth** | RLS admin/manager write; viewer read |
| **TX** | all mutators via RPC single TX; version increment once |
| **Tests** | DB/int: CAS conflict; unique sequence; invalid stop FK reject; viewer cannot write |
| **ACs** | AC-006-49…55, 63; structural uniqueness |
| **Rollback** | migration down; drop RPCs/tables |
| **Depends on** | INC-01 |

### INC-03 — Upload + private Storage + upload idempotency

| | |
|---|---|
| **Purpose** | PDF upload path with validation and idempotency |
| **Files** | `src/lib/transport-orders/upload/*`; server action or `app/api/transport-orders/upload/route.ts`; Storage helper |
| **Migrations** | none beyond INC-02 |
| **API** | upload action/route (admin/manager) |
| **Auth** | `requireAdminOrManager` |
| **TX** | document row + idempotency key record; hash stored |
| **Tests** | non-PDF, MIME mismatch, bad signature, oversized, same key+payload, key reuse mismatch, no silent hash merge |
| **ACs** | AC-006-64…67, 58…60, 75 (no body logs) |
| **Rollback** | disable route; leave orphan Storage cleanup job documented |
| **Depends on** | INC-02 |

### INC-04 — Provider adapter (mock only) + extraction idempotency

| | |
|---|---|
| **Purpose** | `PdfExtractionProvider` interface + `MockPdfExtractionProvider`; orchestration without live AI |
| **Files** | `src/lib/transport-orders/providers/types.ts`, `mock.ts`, `registry.ts` (default `mock` until DS-005); `extraction/run.ts` |
| **Migrations** | none |
| **API** | start-extraction action (admin/manager) |
| **Auth** | admin/manager |
| **TX** | run row + attempts auditable; no duplicate order on retry; terminal → `extraction_failed` |
| **Tests** | malformed JSON fixture → controlled failure; timeout simulation; retry limit; explicit retry after terminal; idempotent key |
| **ACs** | AC-006-61…62, 68…70; TM-24…25, 56 |
| **Rollback** | leave mock registry default |
| **Depends on** | INC-03 |
| **Hard gate** | Gemini/xAI adapters may be stubbed but **must not** call network while DS-005 OPEN |

### INC-05 — Snapshot, working order, provenance, partial loads, legs

| | |
|---|---|
| **Purpose** | Materialize immutable snapshot + working graph with `stop_id`s |
| **Files** | `src/lib/transport-orders/persist/*`; mapping from internal schema |
| **Migrations** | none |
| **API** | internal after extraction |
| **Auth** | server-only |
| **TX** | create snapshot + order + stops + positions + legs + field_reviews in one TX; `version=1` |
| **Tests** | snapshot immutable after edit; null cargo not invented; shared delivery FK; roundtrip separate stops; provenance entity keys |
| **ACs** | AC-006-32, 47, 48, 73…74, 77; FR-006-20/24/49 |
| **Rollback** | delete order cascade in test cleanup |
| **Depends on** | INC-04 |

### INC-06 — Review APIs: Save, edit, confirm (CAS + TX)

| | |
|---|---|
| **Purpose** | Explicit Save + field confirm/missing/N/A with version |
| **Files** | `src/lib/transport-orders/review/actions.ts`; gate helpers; RPC wrappers |
| **Migrations** | none (use INC-02 RPCs) |
| **API** | server actions: saveFields, confirmFields, markMissing, markNotApplicable |
| **Auth** | admin/manager mutate; viewer 403 |
| **TX** | each mutate: CAS `expected_version` → write fields + audits → increment version; confirm+audit atomic |
| **Tests** | stale edit 409 `ORDER_VERSION_CONFLICT`; duplicate confirm safe; viewer denied; revoke on edit |
| **ACs** | AC-006-20…27, 31, 35, 49…57, 72 |
| **Rollback** | feature-flag routes off |
| **Depends on** | INC-05 |

### INC-07 — Stop reorder (drag + keyboard contract on API)

| | |
|---|---|
| **Purpose** | Persist new sequences by `stop_id`; revoke stop-order confirmation |
| **Files** | `review/reorder.ts`; RPC `reorder_transport_order_stops` |
| **Migrations** | none |
| **API** | reorderStops(orderId, orderedStopIds[], expected_version) |
| **Auth** | admin/manager |
| **TX** | CAS; rewrite sequences uniquely; audit old/new `stop_id` arrays; invalidate stop-order confirm |
| **Tests** | identity preserved; FKs intact; stale reorder 409; audit payload |
| **ACs** | AC-006-36…47, 63 |
| **Rollback** | disable action |
| **Depends on** | INC-06 |

### INC-08 — Weiter / completion gate

| | |
|---|---|
| **Purpose** | Server completion per ADR-009 §12 |
| **Files** | `review/gate.ts`; RPC `complete_transport_order_review` |
| **API** | completeReview(orderId, expected_version) |
| **Auth** | admin/manager |
| **TX** | one TX: version + catalog + structural minimum + `review_completed` audit; else 409 incomplete/conflict |
| **Tests** | incomplete → `ORDER_REVIEW_INCOMPLETE` with stable targets; stale → `ORDER_VERSION_CONFLICT`; duplicate completion safe; unresolved conflict/extraction_failed blocks |
| **ACs** | AC-006-26…28, 44…45, 53, 57, 78 |
| **Rollback** | leave progression status unchanged |
| **Depends on** | INC-06, INC-07 |

### INC-09 — Review UI (explicit Save, reorder, status chips)

| | |
|---|---|
| **Purpose** | Settings UI for upload + review |
| **Files** | `app/settings/orders/page.tsx`, `[orderId]/page.tsx`, components: field chips, stop list (drag + move up/down), unsaved warning, Weiter button disabled until client predicate (server authoritative) |
| **Migrations** | none |
| **API** | consumes INC-03…08 actions |
| **Auth** | page gated; viewer read-only controls |
| **TX** | n/a (client) |
| **Tests** | Playwright/smoke later: keyboard reorder, unsaved warning, viewer RO; unit for disable Weiter |
| **ACs** | AC-006-29…30, 39…41, 72; NFR-006-06/08 |
| **Rollback** | remove routes from nav |
| **Depends on** | INC-08 |

### INC-10 — Audit completeness + static Maps link helper

| | |
|---|---|
| **Purpose** | Ensure full audit catalog wired; optional static Maps URL builder (no Directions API) |
| **Files** | `review/audit.ts`; `maps/staticLink.ts` |
| **Tests** | event presence for upload/extract/edit/confirm/reorder/gate/stale/idempotency; Maps helper builds URL only |
| **ACs** | AC-006-31, 46, 71, 78; FR-006-36/38 |
| **Depends on** | INC-08…09 |

### INC-11 — Integration / acceptance suite (mocks + synthetic fixtures)

| | |
|---|---|
| **Purpose** | Close TM-24…61 with mocks; optional local ignored manifest checks **without** sending PDFs externally |
| **Files** | `tests/transport-orders/**`; `tests/fixtures/transport-orders/synthetic/*` |
| **Tests** | happy path mock extract → review → complete; concurrency; idempotency; provenance Line Haul/Grand Total via **synthetic** fixtures mirroring private rules (no private bytes in git) |
| **ACs** | AC-006-01…78 coverage map in TRACEABILITY |
| **Depends on** | INC-01…10 |
| **Still blocked** | Live provider accuracy vs private PDFs until DS-005 |

---

## 7. Cross-cutting behaviors (must appear in Apply)

| Behavior | Plan location |
|---|---|
| Upload idempotency | INC-03; codes `IDEMPOTENCY_KEY_REUSE_MISMATCH`, `UPLOAD_DUPLICATE_CONTENT` |
| Extraction idempotency | INC-04; max 3 attempts; explicit retry after terminal |
| Duplicate completion | INC-08; idempotent ack |
| Optimistic locking / CAS | INC-02/06/07/08; `expected_version` |
| Stale-write rejection | 409 `ORDER_VERSION_CONFLICT` |
| Transactional review completion | INC-08 RPC |
| Stable stop identity after reorder | INC-05/07 |
| Audit old/new `stop_id` arrays | INC-07/10 |
| Immutable extraction snapshot | INC-05 |
| Field-level provenance | INC-05/06 (`entity_type`+`entity_id`+`field_name`) |
| null / missing_confirmed / not_applicable | INC-01/06/08 gate |
| No invented partial-load cargo | INC-05 mapping rules |
| 409 `ORDER_VERSION_CONFLICT` / `ORDER_REVIEW_INCOMPLETE` | INC-06/08; structured JSON unresolved targets |

---

## 8. Authorization matrix (Apply)

| Action | admin | manager | viewer |
|---|---|---|---|
| Upload / extract (mock) | yes | yes | no |
| Save / edit / confirm / reorder | yes | yes | no |
| Weiter / complete | yes | yes | no |
| Read order + audit (non-raw) | yes | yes | yes |
| Sensitive raw provider payload | yes (gated) | no | no |

Server-side enforcement required; UI disable is UX only.

---

## 9. Test strategy summary

| Layer | Focus |
|---|---|
| Unit | states, schema, gate predicate, Maps static URL, cargo non-invention |
| Auth | role matrix |
| DB/Int | CAS, TX rollback, FK/sequence uniqueness, RLS |
| API | idempotency, 409 codes, duplicate completion |
| UI | Save warning, keyboard reorder, color+label |
| Fixture | synthetic + optional local-ignored private path checks offline |
| Regression | Excel import / assignments unchanged |

Default CI: **mock provider only**; no network to Gemini/xAI/Maps.

---

## 10. Rollout / rollback

| Phase | Approach |
|---|---|
| Rollout | Ship behind settings nav flag; provider=`mock`; no real customer PDF processing |
| Rollback | Feature-flag off UI/actions; keep tables (data-preserving); RPC replace if needed; Storage objects retained per ASM-014 |
| Live provider later | Separate Apply slice after DS-005: real adapters + deletion SLA + cost ceilings (OQ-006-02/09) |

---

## 11. Expected file tree (Apply — do not create in Dry-Run)

```
src/lib/transport-orders/
  types.ts schema.ts errors.ts
  providers/{types,mock,registry}.ts
  upload/* extraction/* persist/*
  review/{states,actions,reorder,gate,audit}.ts
  maps/staticLink.ts
app/settings/orders/...
supabase/migrations/*_pack006_*.sql
tests/transport-orders/**
tests/fixtures/transport-orders/synthetic/**
```

---

## 12. Traceability (Dry-Run → Apply)

| Increment | Primary FR | Primary AC | Primary TM |
|---|---|---|---|
| INC-01 | FR-006-21…28 | AC-006-18…24 | TM-33…36 |
| INC-02 | FR-006-45…47,49 | AC-006-49…55,63 | TM-49…54 |
| INC-03 | FR-006-01…05,12 | AC-006-58…60,64…67,75 | TM-52,55,59 |
| INC-04 | FR-006-06…11 | AC-006-61…62,68…70 | TM-24…25,53,56 |
| INC-05 | FR-006-20,23…24,44,49 | AC-006-32,47…48,73…74,77 | TM-26,42,48,58,60 |
| INC-06 | FR-006-25…37,46,48 | AC-006-20…35,49…57,72 | TM-34…44,50…51,57 |
| INC-07 | FR-006-39…42 | AC-006-36…47,63 | TM-45…48,54 |
| INC-08 | FR-006-29…31,50 | AC-006-26…28,44…45,53,57,78 | TM-38…39,47,50,61 |
| INC-09 | FR-006-28,39…40,48 | AC-006-29…30,39…41,72 | TM-40,46,57 |
| INC-10 | FR-006-36,38 | AC-006-31,46,71,78 | TM-41,48,57,61 |
| INC-11 | all | AC-006-01…78 | TM-24…61 |

---

## 13. Blockers

| Blocker | Blocks |
|---|---|
| Separate **Apply authorization** | Product implementation start |
| **DS-005** | Live Gemini/xAI; real PDF → provider; live accuracy eval |
| Commit hygiene A/B | Clean Apply branch baseline |
| ASM-014 duration | Production retention SLA only (security already designed) |
| OQ-006-02/06/09 | Apply-time tuning (models/locale/cost) |

---

## 14. Dry-Run outcome

| Item | Result |
|---|---|
| Outcome | **READY_FOR_APPLY_AFTER_SEPARATE_AUTH** (non-provider) |
| Live-provider Apply | **NOT READY** (DS-005) |
| Product code changed in Dry-Run | **No** |
| Migrations created in Dry-Run | **No** |
| External API calls | **None** |

## 15. Exact next human decision

1. Commit candidates A then B (optional but recommended).  
2. Explicitly authorize **Builder Apply** for non-provider increments INC-01…11.  
3. Keep DS-005 open until legal/ops approval for live providers.
