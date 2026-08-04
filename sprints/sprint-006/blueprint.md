# Blueprint — PACK-006 AI extract + field confirmation

> Status: **PACK_006_ARCHITECTURE_REMEDIATION**  
> Design only. No Apply.

## Runtime flow

```
admin/manager uploads PDF (+ idempotency key)
  → validate extension/MIME/magic/size/pages → private Storage
  → audit upload_created | upload_rejected
  → extraction_run (+ idempotency key; timeout; ≤3 attempts)
  → PdfExtractionProvider (Gemini default; no silent fallback)
  → strict schema validate → immutable snapshot
  → working order (version=1) + stops (stop_id UUIDs)
       + optional partial_load_positions + transport_legs
       every review target.review_status = pending_review
       (or conflict / extraction_failed)
  → Review UI (explicit Save)
       edit → Save (CAS expected_version) → edited_pending_review
       confirm / missing / N/A (transactional + CAS)
       per-stop independent review (entity_type+entity_id+field_name)
       manual stop reorder (drag + keyboard) → Save
         → sequence only; stop_id unchanged
         → invalidate stop-order confirmation
         → audit stops_reordered (old/new stop_id arrays)
         → require explicit stop_order_confirmed
  → Weiter (client disabled until complete)
  → Server TX: expected_version + review catalog + structural minimum
       OK → review_completed; progression ready for PACK-007
       incomplete → 409 ORDER_REVIEW_INCOMPLETE
       stale → 409 ORDER_VERSION_CONFLICT
```

Edit of confirmed field: revoke → `edited_pending_review` → audit `confirmation_revoked_by_edit`.

Manual reorder does **not** change the immutable extraction snapshot. PACK-006 does not auto-optimize routes; PACK-007 owns distance/route comparison. Static Maps link generation from reviewed stops is allowed; Maps routing API is not.

## Module map (indicative Apply — do not create yet)

| Area | Path |
|---|---|
| Field review state machine | `src/lib/transport-orders/review/states.ts` |
| Confirm / edit / Save actions | `src/lib/transport-orders/review/actions.ts` |
| Aggregate CAS / version | `src/lib/transport-orders/review/version.ts` |
| Stop reorder (working order) | `src/lib/transport-orders/review/reorder.ts` + stop-list UI |
| Weiter gate | `src/lib/transport-orders/review/gate.ts` |
| Idempotency | `src/lib/transport-orders/idempotency.ts` |
| Audit events | `src/lib/transport-orders/review/audit.ts` |
| Review UI | `app/settings/orders/...` + status chips + sequence controls |
| Providers | `src/lib/transport-orders/providers/*` |
| Schema / provenance | `src/lib/transport-orders/schema.ts` |

## Data design

| Entity | Role |
|---|---|
| `transport_order_documents` | Original PDF + hash + upload idempotency |
| `transport_order_extraction_runs` | Provider audit + prompt/schema/model + retries |
| `transport_order_extractions` | Immutable AI snapshot (stop order never overwritten) |
| `transport_orders` | Working header + Maps URL/km + **`version` CAS aggregate** |
| `transport_order_stops` | `stop_id` immutable; `sequence` mutable unique |
| `transport_order_partial_load_positions` | position ↔ pickup/delivery `stop_id` |
| `transport_order_legs` | origin/destination `stop_id`; no auto route calc |
| `transport_order_field_reviews` | SoT keyed by entity_type + entity_id + field_name |
| `transport_order_field_review_events` | Append-only full audit catalog |

Identity examples (persisted): `entity_type=stop`, `entity_id=<stop_uuid>`, `field_name=city`.  
UI-only display paths like `stops[0].city` are not identity.

## Review state machine (conceptual)

```
extract → pending_review
edit+Save → edited_pending_review
confirm → confirmed
mark missing → missing_confirmed
mark N/A → not_applicable
detect contradiction → conflict → (resolve) → edited_pending_review | confirmed
failed extract → extraction_failed → (manual value)+Save → edited_pending_review → confirmed

confirmed --edit+Save--> edited_pending_review  (confirmation revoked)
sequence confirmed --reorder+Save--> edited_pending_review  (stop-order revoked; audit stops_reordered)
```

## UI status language

| State | Label |
|---|---|
| pending_review | Ungeprüft |
| edited_pending_review | Geändert – Bestätigung erforderlich |
| confirmed | Bestätigt |
| missing_confirmed | Fehlend bestätigt |
| not_applicable | Nicht zutreffend |
| conflict | Konflikt – Prüfung erforderlich |
| extraction_failed | Extraktion fehlgeschlagen |

Confirmed visual (dark blue) only when persisted state warrants it. Unsaved-changes warning before navigation.

## Group confirm

Optional; never hidden; server-enforced preconditions; transactional + CAS.

## Auth

admin/manager mutate (upload, Save, reorder, confirm, Weiter); viewer read. No new role.
