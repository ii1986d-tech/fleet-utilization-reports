# DS-005 — External AI processing decision template

> Status: **APPROVED**
> Purpose: Written approval for external AI processing of transport-order PDFs.
> Related: `planning/OPEN-DECISION-STOPS.md` · ADR-009 · ASM-016 · ASM-017 · RSK-022 · OQ-006-07/10
> Runtime note: Live provider **wiring** is committed (`09fb2a6`, `3bbd605`). Default remains `mock`. Gemini free-tier pilot is ops-gated (no live calls required for PACK-006 closeout).

## Decision header

| Field | Value |
|---|---|
| Decision ID | DS-005 |
| Title | External AI processing of transport-order PDFs |
| Status | **APPROVED** |
| Approval owner (name / role) | I. Dimitrov (product / decision owner) |
| Approval date | 2026-08-05 |
| Effective from | 2026-08-05 |
| Review / re-approval due | On provider terms change or revocation |
| Revocation owner | I. Dimitrov (or delegate) |

## 1. Allowed provider names

| Provider key | Allowed? (Y/N) | Notes |
|---|---|---|
| `mock` | Y (dev/test only) | Deterministic synthetic extract |
| `gemini` | Y | **Primary** — free tier for pilot |
| `xai` / `grok` | Y | Fallback Tier 2 |
| `groq` | Y | Fallback Tier 2 (OpenAI-compatible alt) |
| `qwen` | Y | Fallback Tier 3 |
| `manual` | Y | Fallback Tier 4 — no external AI |

**Approved allowed provider names:** `mock`, `gemini` (primary), `grok`/`xai` (Tier 2), `groq` (Tier 2 alt), `qwen` (Tier 3), `manual` (Tier 4).

## 2. Primary provider

| Field | Value |
|---|---|
| Primary provider name | **Gemini** |
| Primary model ID(s) | **`GEMINI_MODEL_ID`** (canonical; wired in `3bbd605`; legacy `GEMINI_MODEL` fallback) |
| Primary prompt/schema versions | `PROMPT_VERSION_LIVE` / `pack006.extraction.v1` |

## 3. Optional fallback provider

| Field | Value |
|---|---|
| Fallback allowed? | **YES** (tiered) |
| Fallback provider names | **grok**, **qwen**, **manual** (and optional **groq**) |
| Silent fallback permitted? | **NO** — explicit `TRANSPORT_ORDER_FALLBACK_PROVIDERS` config required |

## 4. Permitted document / data categories

| Category | Permitted? | Conditions |
|---|---|---|
| Synthetic generated PDFs | YES | Dev/test |
| Anonymized / redacted PDFs | YES | Allowed |
| Real customer / shipper PDFs | **YES** (permitted from day 1) | Under this approval + provider Standard Terms |
| Real driver / plate / address data | YES | As present on permitted PDFs |
| Financial amounts / freight | YES | As present on permitted PDFs |
| Internal-only test PDFs (non-customer) | YES | |

## 5. Real business PDFs — prohibition or permission

| Option | Selected? |
|---|---|
| Prohibited until further notice | ☐ |
| Permitted to named primary provider only under DPA/terms | ☐ |
| **Permitted to primary + approved fallback under Standard Terms** | ☑ |
| Forbidden for all external AI | ☐ |

**Written statement:** Real customer PDFs are **PERMITTED from day 1**. **AVV / separate DPA: NOT REQUIRED** — provider **Standard Terms** are sufficient per approval owner.

## 6. Provider data retention

| Topic | Decision |
|---|---|
| Provider-side retention of uploaded PDF bytes | Per provider **Standard Terms** |
| Provider-side retention of prompts / completions | Per provider **Standard Terms** |
| Maximum retention before deletion request | Per provider **Standard Terms** |
| Alignment with ASM-014 (app-side retention) | App-side durations per ASM-014 pragmatic defaults |

## 7. Provider training / data-use restrictions

| Restriction | Decision |
|---|---|
| Training / human review / subprocessors | **Per provider Standard Terms** |
| Contractual DPA / AVV | **NO — not required** (Standard Terms sufficient) |

## 8. Processing region requirements

| Field | Value |
|---|---|
| Required region(s) | **Per provider Standard Terms** |
| Data residency / cross-border basis | **Per provider Standard Terms** |

## 9. Logging restrictions

| Rule | Binding |
|---|---|
| No PDF bytes in application logs | **Yes (binding)** |
| No full extracted address/plate/freight dumps in logs | **Yes (binding)** |
| Provider request/response bodies in logs | Forbidden (safe errors / correlation IDs only) |

## 10. Secrets management

| Rule | Decision |
|---|---|
| Provider API keys server-only (never `NEXT_PUBLIC_*`) | **Binding — Yes** |
| Secrets in env / secret manager only (never git) | **Binding — Yes** |
| Key revocation on DS-005 revocation | Required |

## 11. Fallback approval rules

| Rule | Decision |
|---|---|
| Fallback requires this DS-005 to name the fallback provider | **Yes** — grok, qwen, manual (groq optional Tier 2 alt) |
| Fallback requires explicit runtime configuration (not silent) | **Yes** |
| Fallback requires audit event with provider/model | **Yes** |

## 12. Approval

| Field | Value |
|---|---|
| Approver name | **I. Dimitrov** |
| Approver role | Product / decision owner |
| Signature / recorded acknowledgment | **APPROVED** (2026-08-05) |
| Date | **2026-08-05** |
| Conditions / caveats | Logging + secrets rules remain binding. AVV not required. Live free-tier pilot is ops-gated. |

## 13. Revocation procedure

1. Approval owner records **DS-005 REVOKED** with date and reason.
2. Set `TRANSPORT_ORDER_PROVIDER=mock` immediately; disable live config.
3. Rotate/revoke provider API keys.
4. Notify engineering + ops; open incident if required.
5. Update `planning/OPEN-DECISION-STOPS.md`, `planning/STATE.md`, and ADR register mirror.
6. Re-approval requires a new completed copy of this template.

## Explicit approval statement

**DS-005 is APPROVED (2026-08-05) by I. Dimitrov.** Real customer PDFs are permitted. AVV not required (Standard Terms). Primary: Gemini (free tier for pilot). Fallbacks: Grok (Tier 2), Qwen (Tier 3), Manual (Tier 4); Groq allowed as Tier 2 alt. `GEMINI_MODEL_ID` is canonical.
