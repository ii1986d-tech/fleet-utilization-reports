# PACK-006 — Manual browser smoke checklist (Settings → Orders)

> Status: **PASS** (human executed)
> Lifecycle: PACK-006 → **COMPLETE** (closeout docs finalize)
> Provider during smoke: **mock**
> Maps: static link only — **no routing API**
> Related: `SYNTHETIC-UAT-RESULTS.md` · `CLOSEOUT-AUDIT.md`

## Rules

1. Mark a step **PASS** only after a human executes it and records dated evidence.
2. Do **not** claim PASS from API/UAT/static source checks alone.
3. Allowed: `PASS` · `FAIL` · `BLOCKED` · `SKIP` (with reason).
4. Use synthetic orders only (**Create synthetic order** / mock extract).

## Preconditions

| # | Check | Result |
|---|---|---|
| P-01 | Local app reachable (`npm run dev` or equivalent) | PASS |
| P-02 | Local Supabase up; admin/manager/viewer can sign in | PASS |
| P-03 | `TRANSPORT_ORDER_PROVIDER` / DS-005: mock path only during smoke | PASS |
| P-04 | At least one synthetic order creatable from `/settings/orders` | PASS |

---

## Admin

| ID | Actor | Action | Expected visible | Expected persisted | Version | Audit | Evidence |
|---|---|---|---|---|---|---|---|
| A-01 | admin | Sign in | Lands authenticated; can open Settings | Session role=admin | n/a | n/a | PASS |
| A-02 | admin | Open `/settings/orders` | Order list; Create synthetic order visible | List readable | n/a | n/a | PASS |
| A-03 | admin | Create synthetic order (mock) | New row appears; navigable | Document + order + extraction persisted | +extract | `extraction_completed` | PASS |
| A-04 | admin | Open order detail | Fields, stops, status chips, actions | Same order loaded | unchanged | n/a | PASS |
| A-05 | admin | Edit one field (draft) | Input changes; “Unsaved changes” shown | Not persisted until Save | unchanged | none yet | PASS |
| A-06 | admin | Attempt navigate/close with dirty form | Unsaved-change warning (`beforeunload` / leave prompt) | No silent persist | unchanged | none | PASS |
| A-07 | admin | Speichern (Save) | Dirty cleared; value shown; status → edited_pending_review (or equivalent) | Field current_value updated | +1 | `field_edited` (and revoke if was terminal) | PASS |
| A-08 | admin | Bestätigen on a pending field | Status label **Bestätigt** + non-color indicator | `review_status=confirmed` | +1 | `field_confirmed` | PASS |
| A-09 | admin | Fehlt on a null/absent field | Status **Fehlend bestätigt** | `review_status=missing_confirmed` | +1 | `missing_confirmed` | PASS |
| A-10 | admin | Nicht zutreffend on field with extracted/current value | Confirm dialog states field treated as not applicable for this order | No change until confirm | unchanged until confirm | none until confirm | PASS |
| A-11 | admin | Accept N/A dialog | Status **Nicht zutreffend** + `⊘` (or equivalent text+indicator) | `review_status=not_applicable` | +1 | `not_applicable_confirmed` | PASS |
| A-12 | admin | Edit that N/A field + Speichern | Status → **Geändert – Bestätigung erforderlich** | `edited_pending_review`; confirmed_* cleared | +1 | `confirmation_revoked_by_edit` / `field_edited` | PASS |
| A-13 | admin | Reorder stops (drag) | Sequence numbers update in UI | Sequences updated; stop_id stable | +1 | `stops_reordered` | PASS |
| A-14 | admin | Keyboard reorder (Move up/down) | Sequence changes; buttons keyboard-reachable | Same as reorder RPC | +1 | `stops_reordered` | PASS |
| A-15 | admin | Stoppreihenfolge bestätigen | Stop-order chip confirmed | `stop_order_review_status=confirmed` | +1 | `stop_order_confirmed` | PASS |
| A-16 | admin | Weiter while incomplete | Weiter disabled and/or error; incomplete message | `review_completed_at` null; no completion | 0 | no `review_completed` | PASS |
| A-17 | admin | Resolve remaining fields + stop order + Weiter | Success; review completed shown | `review_completed_at` set | +1 on complete | `review_completed` | PASS |
| A-18 | admin | Audit panel | Recent actions match A-07…A-17 | Events in `transport_order_field_review_events` | n/a | as above | PASS |

---

## Manager

| ID | Actor | Action | Expected visible | Expected persisted | Version | Audit | Evidence |
|---|---|---|---|---|---|---|---|
| M-01 | manager | Sign in | Authenticated as manager | role=manager | n/a | n/a | PASS |
| M-02 | manager | Open list + detail of synthetic order | Read OK | Select OK | n/a | n/a | PASS |
| M-03 | manager | Speichern / Bestätigen / Fehlt / Nicht zutreffend (one path each) | Same controls available as admin | Mutations succeed | +1 each success | matching actions; `actor_role=manager` on events | PASS |
| M-04 | manager | Reorder + confirm stop order | Same as admin | Same RPC success | +1 each | `stops_reordered` / `stop_order_confirmed` | PASS |
| M-05 | manager | Complete review when valid (or verify Weiter gate if incomplete) | Complete or blocked correctly | Matches admin gate rules | +1 or 0 | `review_completed` or none | PASS |

---

## Viewer

| ID | Actor | Action | Expected visible | Expected persisted | Version | Audit | Evidence |
|---|---|---|---|---|---|---|---|
| V-01 | viewer | Sign in | Authenticated as viewer | role=viewer | n/a | n/a | PASS |
| V-02 | viewer | Open `/settings/orders` | List readable (or empty) | SELECT allowed | unchanged | none | PASS |
| V-03 | viewer | Open order detail | Detail readable; “Read-only (Viewer)” (or equivalent) | SELECT OK | unchanged | none | PASS |
| V-04 | viewer | Field inputs | `readOnly` / disabled | No write | unchanged | none | PASS |
| V-05 | viewer | Mutation buttons (Speichern, Bestätigen, Fehlt, Nicht zutreffend, reorder, Weiter, stop confirm) | Disabled and/or title explains admin/manager only | No RPC success | unchanged | none | PASS |
| V-06 | viewer | Create synthetic order (if shown) | Disabled or FORBIDDEN | No new order | n/a | none | PASS |
| V-07 | viewer | Optional: forced mutate via client/devtools against RPC | Error FORBIDDEN | Version/audit unchanged | 0 | no new mutate audits | PASS |

---

## Execution log (human)

| Field | Value |
|---|---|
| Executor | I. Dimitrov |
| Date (local) | 2026-08-05 |
| App URL | http://127.0.0.1:3000 |
| Synthetic order id(s) | SYN-TOUR-001, SYN-BIZ-1, SYN-EDITED-1, SYN-PARTIAL-001, SYN-ADMIN-E2E |
| Admin steps PASS/FAIL/BLOCKED counts | 18 PASS / 0 FAIL / 0 BLOCKED |
| Manager counts | 5 PASS / 0 FAIL / 0 BLOCKED |
| Viewer counts | 7 PASS / 0 FAIL / 0 BLOCKED |
| Defects found | None |
| Evidence | Human confirmed all 30 steps via browser interaction |
| Overall smoke verdict | **PASS** |

## After human execution (Mission Control discipline)

1. Evidence columns filled from human confirmation (2026-08-05).
2. Mission Control / closeout audit / builder report updated for PACK-006 COMPLETE.
3. Do **not** set `launcherImportAt` unless HTML import actually done.
4. Live Gemini free-tier pilot is separate ops work under DS-005 (wiring already committed; no live calls required for this smoke).
