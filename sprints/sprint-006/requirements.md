# Sprint 006 Requirements — PACK-006 (AI + field confirmation)

> Status: **PACK_006_ADR_ACCEPTED_DRY_RUN**  
> DS-004 complete · ADR-009 ACCEPTED · non-provider Dry-Run complete · DS-005 blocks live AI · Apply not authorized  
> Documentation / Dry-Run only — no product implementation

## Smallest testable outcome

Admin/manager uploads PDF (idempotent) → AI suggestions with every review target `pending_review` → explicit Save + confirm/edit/reorder under CAS → **Weiter** only when catalog + structural minimum + `expected_version` pass → server rejects incomplete/stale progression → viewer cannot edit/confirm/reorder.

## Binding decisions

| Topic | Lock |
|---|---|
| AI trust | Suggestions only; never operational until field confirmed |
| Confirm roles | `admin` + `manager` only |
| Viewer | Read-only; no edit/confirm/reorder |
| New `dispatcher` role | **Forbidden** without separate ADR |
| Review SoT | Persisted `review_status` in DB |
| Auto-confirm | **Never** |
| Edit after confirm | Revoke → `edited_pending_review` |
| Weiter | UI disable + **server 409** `ORDER_REVIEW_INCOMPLETE` |
| Stale write | **409** `ORDER_VERSION_CONFLICT` |
| Stop identity | Immutable `stop_id`; `sequence` mutable only |
| Save | Explicit Save; no autosave |
| Providers | Gemini primary; xAI optional (ADR-009); DS-005 for live |
| Samples | 26 local ignored; 8 human_verified |

## Functional requirements

### Upload / AI / security

| ID | Requirement |
|---|---|
| FR-006-01 | Authenticated PDF upload (admin/manager) with client idempotency key |
| FR-006-02 | Validate extension, MIME, PDF magic bytes, size ≤20 MiB, pages ≤50; sanitize filename; generated storage key |
| FR-006-03 | Reject non-PDF / MIME mismatch / invalid signature / oversized / malicious → audit `upload_rejected` |
| FR-006-04 | Private Storage only; authorized/signed access; no public bucket |
| FR-006-05 | Store PDF content hash; duplicate content must not silently merge distinct orders |
| FR-006-06 | Extraction run with idempotency key; provider adapter; audit attempts |
| FR-006-07 | Strict schema validation; persist provider/model/prompt/schema versions |
| FR-006-08 | Immutable extraction snapshot + working order/stops/partial-loads/legs |
| FR-006-09 | Timeout (design 60s) + bounded retries (max 3); retryable vs non-retryable |
| FR-006-10 | No silent provider fallback; fallback needs DS-005 + config + audit |
| FR-006-11 | Malformed/timeout/terminal failure → controlled `extraction_failed`; retry after terminal needs explicit user action |
| FR-006-12 | No PDF body / business dumps / credentials in application logs |
| FR-006-20 | No silent invention of absent fields |

### Field confirmation / gate / reorder

| ID | Requirement |
|---|---|
| FR-006-21 | Every review target persists `review_status` in the seven-state enum |
| FR-006-22 | Post-extract default: `pending_review` (or conflict/extraction_failed) |
| FR-006-23 | Provenance via `entity_type`+`entity_id`+`field_name` + extracted/current/confidence/source/provider/model/run/review/edited/confirmed metadata |
| FR-006-24 | Immutable snapshot never overwritten by edits/confirms/reorders |
| FR-006-25 | Confirm unchanged, edit, confirm edited, mark missing_confirmed / not_applicable where allowed |
| FR-006-26 | No automatic confirmation under any non-explicit condition |
| FR-006-27 | Edit of confirmed field → revoke → `edited_pending_review`; re-confirm required |
| FR-006-28 | UI: color + icon + DE label + tooltip; color not SoT |
| FR-006-29 | **Weiter** disabled until § catalog complete; server revalidates in TX; 409 `ORDER_REVIEW_INCOMPLETE` lists unresolved stable targets |
| FR-006-30 | Terminal resolution only: confirmed \| missing_confirmed \| not_applicable |
| FR-006-31 | Blocking: pending_review \| edited_pending_review \| conflict \| extraction_failed |
| FR-006-32 | Each stop field independently reviewable; manual stop starts edited_pending_review; stable `stop_id` |
| FR-006-33 | Confirming one stop does not confirm others / whole order |
| FR-006-34 | Changing stop sequence invalidates stop-order confirmation |
| FR-006-35 | Optional bulk confirm only with auth + constraints + server recheck + CAS |
| FR-006-36 | Persist full audit action catalog (ADR-009 §15) |
| FR-006-37 | Only admin/manager may edit/confirm/reorder/Save/Weiter; viewer denied (401/403) |
| FR-006-38 | PACK-006 may generate static Maps link from reviewed stops and store km under review rules; no Maps routing API |
| FR-006-39 | Admin/manager reorder via drag-and-drop; visible sequence numbers |
| FR-006-40 | Keyboard move-up / move-down required |
| FR-006-41 | Reorder invalidates stop-order confirmation → edited_pending_review until confirm; server validates |
| FR-006-42 | Audit `stops_reordered` with old/new ordered `stop_id` arrays; snapshot unchanged |
| FR-006-43 | No auto route calc / alternatives / optimization (PACK-007) |
| FR-006-44 | Incomplete addresses remain incomplete; do not invent streets |
| FR-006-45 | Aggregate `version` + CAS on every mutation; stale → 409 `ORDER_VERSION_CONFLICT` |
| FR-006-46 | Field confirm / review completion / audits are transactional; no partial confirm persist |
| FR-006-47 | Idempotent upload, extraction, and review completion with stable conflict codes |
| FR-006-48 | Explicit Save; unsaved-changes warning; confirm operates on persisted values only |
| FR-006-49 | Partial-load positions and transport legs are first-class; associations by `stop_id` only |
| FR-006-50 | Weiter catalog = review-resolution for all shown targets + structural minimum (ADR-009 §12); closes OQ-006-11 |
| FR-006-51 | Retention duration legal OPEN (ASM-014); deletion/remote-expire audited; security validation always binds |

## Non-functional

| ID | Requirement |
|---|---|
| NFR-006-01…05 | Secrets, no browser→provider, no Excel import regression, usage logging, raw payload access control |
| NFR-006-06 | Accessibility: status not color-only; sufficient contrast |
| NFR-006-07 | Audit trail complete for confirmation revoke/re-confirm and gate rejection |
| NFR-006-08 | Stop reorder fully operable without pointer |
| NFR-006-09 | No lost updates under concurrent reviewers (CAS) |
| NFR-006-10 | Sensitive-log redaction (no PDF body / operational dumps) |

## Open questions

| ID | Status |
|---|---|
| OQ-006-01 | **RESOLVED** — admin + manager write/confirm/reorder; viewer RO |
| OQ-006-02 | **Apply-phase** — concrete model IDs under DS-005 |
| OQ-006-03 | **Legal residual** — PDF retention duration (ASM-014) |
| OQ-006-04 | **RESOLVED design** — no auto plate master-match in PACK-006 |
| OQ-006-05 | **RESOLVED design** — 20 MiB / 50 pages |
| OQ-006-06 | **Apply-phase** — locale/normalization tuning |
| OQ-006-07 | **Blocked by DS-005** — xAI enablement |
| OQ-006-08 | **Legal/ops residual** — raw payload retention (ASM-014) |
| OQ-006-09 | **Apply-phase** — numeric cost ceiling |
| OQ-006-10 | **Blocked by DS-005** — real PDF → provider |
| OQ-006-11 | **RESOLVED** — ADR-009 §12 Weiter catalog |

## Out of scope

Implementation; migrations; SDKs; provider calls; automatic route optimization (PACK-007); management export (PACK-008); inventing manifests or missing address parts; committing private samples or operational values into tracked docs.
