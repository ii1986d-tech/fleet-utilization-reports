# PACK-006 — PDF transport order extraction (AI + field confirmation)

> Status: **PACK_006_ADR_ACCEPTED_DRY_RUN**  
> DS-004: **COMPLETE** (26 PDF + 26 manifests local ignored; 8 human_verified)  
> DS-005: **OPEN** (live-provider blocker)  
> ADR-009: **ACCEPTED (design binding)** — 2026-08-04 · I. Dimitrov  
> Non-provider Dry-Run: **COMPLETE** · Apply: **not authorized**  
> Baseline: MVP **v1.0.0**  
> Binding: ADR-003 · **ADR-009 ACCEPTED**

## Purpose

Upload a transport-order PDF; extract structured **suggestions** via multimodal AI (Gemini primary; xAI optional); require **explicit per-field human confirmation** by admin or manager before **Weiter** / operational use / PACK-007.

## Binding business rule

AI results are suggestions only. No extracted field becomes operational until an authorized human explicitly confirms it (or confirms missing / not applicable where allowed).

## Phased plan

| Pack | In | Out |
|---|---|---|
| **PACK-006** | Upload, Storage, AI extract, snapshot, field review/confirm, stable stops, partial loads/legs, provenance, static Maps link + stored km, CAS/idempotency, server-gated **Weiter** | Route corridors, km comparison, route optimization |
| **PACK-007** | Corridors, route/direct/paid km, alternatives, optimization | Extraction redesign |
| **PACK-008** | PDF/Excel export | New extraction engine |

## Roles (OQ-006-01 RESOLVED)

| Role | Upload/extract | Edit/Save/Reorder | Confirm | Weiter | Read |
|---|---|---|---|---|---|
| admin | yes | yes | yes | when complete | yes |
| manager | yes | yes | yes | when complete | yes |
| viewer | no | no | no | no | yes |

No Auth role named `dispatcher`.

## Provider strategy (summary)

Gemini primary; xAI optional non-default (no silent fallback); provider-neutral interface; server-only keys; DS-005 for real customer PDFs. See ADR-009 §§2–5, §23.

## Field review states (DB SoT)

`pending_review` · `edited_pending_review` · `confirmed` · `missing_confirmed` · `not_applicable` · `conflict` · `extraction_failed`

Color is not SoT. Explicit Save. Aggregate CAS (`ORDER_VERSION_CONFLICT`).

## Weiter gate

Review-resolution catalog + structural minimum (ADR-009 §12 / OQ-006-11 **RESOLVED**).  
Server TX; **HTTP 409** `ORDER_REVIEW_INCOMPLETE` or `ORDER_VERSION_CONFLICT`.

## Data (design — no migrations now)

documents · extraction_runs · extractions (immutable) · working orders (versioned) · stops (`stop_id`) · partial_load_positions · legs · field reviews · audit events

## Samples

Local ignored path complete (DS-004). Tracked docs must not contain operational values.

## Out of scope

Code, migrations, SDKs, provider calls, PACK-007/008, Frotcom, new dispatcher Auth role, PACK-001…005 behavior changes.

## Open questions

| ID | Status |
|---|---|
| OQ-006-01 | **RESOLVED** |
| OQ-006-02 | Apply-phase (model IDs) |
| OQ-006-03 | Legal residual (retention duration) |
| OQ-006-04…05 | RESOLVED design |
| OQ-006-06 | Apply-phase (locale) |
| OQ-006-07 / OQ-006-10 | Blocked by DS-005 |
| OQ-006-08 | Legal/ops residual (raw retention) |
| OQ-006-09 | Apply-phase (cost ceiling) |
| OQ-006-11 | **RESOLVED** |

## Evidence

`DRY-RUN-READINESS.md` · `ARCHITECT-REVIEW.md` · redacted `HUMAN-GROUND-TRUTH-REVIEW.md` · `architecture/ADR-009.md`
