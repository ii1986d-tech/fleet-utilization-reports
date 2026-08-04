# Acceptance — PACK-006 (AI + field confirmation)

> Status: **PACK_006_ADR_ACCEPTED_DRY_RUN** — ADR-009 ACCEPTED; non-provider Dry-Run complete  
> DS-004: complete · DS-005: still blocks live-provider · Apply not authorized

## Architect checklist

- [x] Field-level review states defined (DB SoT)
- [x] Provenance via stable entity identity (not array index)
- [x] Aggregate versioning + CAS + ORDER_VERSION_CONFLICT
- [x] Transactional confirmation / no partial persist
- [x] Idempotent upload / extraction / completion
- [x] Partial-load + transport-leg entities
- [x] OQ-006-11 Weiter catalog closed (ADR-009 §12)
- [x] Full audit action catalog
- [x] Provider robustness (timeout/retry/schema/fallback policy)
- [x] File security + log redaction + retention residual noted
- [x] Maps static link vs PACK-007 routing boundary
- [x] Explicit Save UX
- [x] Manual stop reordering (drag + keyboard; stop_id stable)
- [x] Roles: admin/manager; viewer RO; reorder column in AUTH-ROLES
- [x] Tracked human-review notes redacted (H4)
- [x] No product code / migrations / SDKs / provider calls

## Blockers before Dry-Run / Apply

- [x] SPL-006-001…003 + expected-field manifests (DS-004) — **COMPLETE**
- [ ] DS-005 external AI processing approval — **still OPEN**
- [x] OQ-006-11 mandatory catalog — **RESOLVED** (ADR-009 §12)
- [x] ADR-009 Architect Re-Review → **ACCEPTED** (design) — I. Dimitrov 2026-08-04
- [x] Explicit non-provider Dry-Run auth — **COMPLETE** (`BUILDER-DRY-RUN.md`)
- [ ] Explicit **Apply** authorization — **not granted**
- [ ] OQ-006-03 / OQ-006-08 retention duration (ASM-014) — legal residual (security rules still bind)

## Acceptance criteria (Apply)

Prior AC-006-01…17 remain. Additional:

| ID | Criterion |
|---|---|
| AC-006-18 | AI-extracted field starts `pending_review` (unconfirmed) |
| AC-006-19 | High-confidence field remains unconfirmed until explicit confirm |
| AC-006-20 | Admin can confirm |
| AC-006-21 | Manager can confirm |
| AC-006-22 | Viewer cannot edit or confirm |
| AC-006-23 | Edited field is not auto-confirmed (`edited_pending_review`) |
| AC-006-24 | Confirmed field becomes unconfirmed after edit |
| AC-006-25 | Manually added address/stop requires confirmation |
| AC-006-26 | Unresolved review target blocks Weiter (UI) |
| AC-006-27 | Frontend bypass still fails server-side 409 `ORDER_REVIEW_INCOMPLETE` |
| AC-006-28 | Catalog + structural minimum satisfied allows progression |
| AC-006-29 | Blue/dark style only when persisted state is confirmed-family |
| AC-006-30 | Color-independent text/icon status present |
| AC-006-31 | Confirmation audit record stored |
| AC-006-32 | Original extracted value unchanged after edit/confirm |
| AC-006-33 | Multiple stops confirmable independently |
| AC-006-34 | Changing stop sequence requires renewed confirmation |
| AC-006-35 | `conflict` blocks progression |
| AC-006-36 | Admin can reorder stops |
| AC-006-37 | Manager can reorder stops |
| AC-006-38 | Viewer cannot reorder stops |
| AC-006-39 | Mouse drag reorder works and updates sequence |
| AC-006-40 | Keyboard move-up / move-down reorder works |
| AC-006-41 | Reorder updates visible sequence numbers |
| AC-006-42 | Reorder revokes previous stop-order confirmation |
| AC-006-43 | Reordered sequence requires explicit confirmation |
| AC-006-44 | Unconfirmed stop order blocks Weiter (UI) |
| AC-006-45 | Server rejects unconfirmed reordered sequence (409 `ORDER_REVIEW_INCOMPLETE`) |
| AC-006-46 | Audit stores old and new ordered `stop_id` arrays (`stops_reordered`) |
| AC-006-47 | Immutable extracted stop order remains unchanged after reorder |
| AC-006-48 | Incomplete address remains incomplete; street not invented |
| AC-006-49 | Two reviewers: loser gets 409 `ORDER_VERSION_CONFLICT`; no lost update |
| AC-006-50 | Stale field edit rejected with `ORDER_VERSION_CONFLICT` |
| AC-006-51 | Stale stop reorder rejected with `ORDER_VERSION_CONFLICT` |
| AC-006-52 | Stale confirmation rejected with `ORDER_VERSION_CONFLICT` |
| AC-006-53 | Stale Weiter rejected with `ORDER_VERSION_CONFLICT` |
| AC-006-54 | Reload + successful retry after conflict |
| AC-006-55 | Confirm + audit persist transactionally; failure rolls back completely |
| AC-006-56 | Duplicate confirmation submit is safe (no conflicting state) |
| AC-006-57 | Duplicate completion submit does not duplicate domain/audit side effects |
| AC-006-58 | Upload idempotency: same key+payload returns original |
| AC-006-59 | Upload idempotency: same key+different payload rejected |
| AC-006-60 | Duplicate content hash does not silently merge distinct orders |
| AC-006-61 | Extraction retry does not duplicate runs/orders; attempts auditable |
| AC-006-62 | Retry after terminal failure requires explicit user action |
| AC-006-63 | Reorder does not corrupt confirmations / provenance / partial-load / leg / audit `stop_id` refs |
| AC-006-64 | Non-PDF upload rejected |
| AC-006-65 | MIME mismatch rejected |
| AC-006-66 | Invalid PDF signature rejected |
| AC-006-67 | Oversized file rejected |
| AC-006-68 | Malformed provider JSON → controlled failure / `extraction_failed` |
| AC-006-69 | Provider timeout handled; bounded retries; terminal failure persisted |
| AC-006-70 | Retry limit exhausted → terminal failure; no silent fallback |
| AC-006-71 | Static Maps link generation allowed; no Maps routing API call |
| AC-006-72 | Explicit Save required; unsaved warning; confirm uses persisted values |
| AC-006-73 | Line Haul Units → paid km provenance fixture (SPL-006-017/020 private) |
| AC-006-74 | Grand Total → freight provenance fixture (SPL-006-017/020 private) |
| AC-006-75 | Sensitive-log redaction: no PDF body / operational dumps in logs |
| AC-006-76 | Retention/deletion: remote delete audited; duration residual ASM-014 documented |
| AC-006-77 | Roundtrip / shared delivery / three partial loads / incomplete address fixtures covered |
| AC-006-78 | `completion_gate_rejected` and `stale_write_rejected` audit events recorded |

## Test strategy

| Class | Focus |
|---|---|
| Unit | State machine; revoke-on-edit; gate predicate; CAS; reorder identity |
| Auth | Admin/manager allow; viewer deny (edit/confirm/reorder) |
| Int | 409 ORDER_REVIEW_INCOMPLETE; 409 ORDER_VERSION_CONFLICT; TX rollback |
| UI | Labels/icons; drag + keyboard reorder; unsaved warning |
| Audit | Full action catalog incl. gate/stale/idempotency |
| Fixture | Local ignored manifests; provenance rules; no invented streets |
| Security | Upload validation; private Storage; log redaction |
| Regression | Excel import unchanged; no PACK-007 route auto-opt |

## Residuals

DS-004 complete · DS-005 open · ASM-014 retention duration · ADR-009 Architect Re-Review · Dry-Run auth · Apply auth
