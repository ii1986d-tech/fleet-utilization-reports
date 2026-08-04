# PACK-006 Builder Dry-Run readiness

> Prepared: 2026-08-04  
> ADR-009: **ACCEPTED (design binding)** — I. Dimitrov  
> Non-provider Dry-Run: **COMPLETE** (`BUILDER-DRY-RUN.md`)  
> External AI (DS-005): **still OPEN** — not approved

## Verdict

| Gate | Status |
|---|---|
| DS-004 sample PDFs + expected manifests on disk | **PASS / COMPLETE** |
| Human-verified ground truth (≥ required SPL profiles) | **PASS** — 8/8 (values private) |
| Critical/High review findings remediated in docs | **YES** |
| Private path gitignored; samples not tracked | **PASS** |
| Tracked review docs redacted (H4) | **PASS** |
| ADR-009 Architect Re-Review | **PASS** |
| ADR-009 ACCEPTED | **YES** (design) |
| Non-provider Builder Dry-Run | **COMPLETE** |
| DS-005 external AI processing approval | **OPEN** |
| Builder Apply (product code / migrations) | **NOT AUTHORIZED** |
| Live Gemini/xAI or real customer PDFs | **NOT READY** until DS-005 |

## Local sample evidence (gitignored)

| Metric | Value |
|---|---|
| PDFs | 26 |
| Expected manifests | 26 |
| Pairing orphans | 0 |
| JSON parse failures | 0 |
| `human_verified` | 8 |
| `template_empty` | 18 |

**Verified IDs:** SPL-006-001, 002, 003, 004, 007, 013, 017, 020  

**Duplicate PDF content (documented, not deleted):** SPL-006-010 ≡ SPL-006-011 (identical SHA-256); both remain `template_empty`.

## Scope boundary (binding)

**PACK-006:** PDF upload; safe validation; approved-provider extraction; raw snapshot + provenance; human review/correction; field + stop-order confirmation; manual stop reordering; CAS/idempotency; audit; Weiter/409 gate; static Maps link + stored km values only.

**PACK-007:** route calculation; sequence alternatives; shortest-route suggestions; corridors; Maps/direct-route comparison (routing APIs).

## Builder Dry-Run may include (after Re-Review PASS)

- Schema / review-state / CAS / gate design validation against ADR-009  
- Fixture harness wiring to **local ignored** manifests (no provider calls)  
- Auth matrix checks (admin/manager/viewer) without live AI  

## Builder Dry-Run must not include

- Gemini / xAI / Maps routing API calls  
- Sending real customer PDFs to any external provider  
- Migrations / product Apply without separate Apply authorization  
- Populating the 18 `template_empty` manifests by invention  
- Committing `references/private/**`

## Remaining human / Architect actions

1. Optional: commit candidates A (`env.ts`) then B (PACK-006 docs).  
2. Explicit **Builder Apply** authorization for non-provider INC-01…11.  
3. Resolve **DS-005** in writing before any live Gemini/xAI.  
4. Optional later: populate additional empty templates if broader layout coverage is required.
