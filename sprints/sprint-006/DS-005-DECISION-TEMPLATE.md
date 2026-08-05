# DS-005 — External AI processing decision template

> Status: **APPROVED**
> Purpose: Written approval for external AI processing of transport-order PDFs.
> Related: `planning/OPEN-DECISION-STOPS.md` · ADR-009 · ASM-016 · ASM-017 · RSK-022 · OQ-006-07/10
> Runtime note: provider SDKs/keys are configured **after** staging/commit; this decision authorizes that work.

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
| `mock` | Y (dev/test) | Local evidence / synthetic smoke |
| `gemini` | Y | **Primary** (Tier 1) — configure after staging |
| `groq` | Y | Fallback Tier 2 — configure after staging |
| `qwen` | Y | Fallback Tier 3 — configure after staging |
| Manual mode | Y | Fallback Tier 4 — human extraction path (no external AI) |
| `xai` / legacy `grok` naming | N (unless separately re-approved) | Superseded by Groq/Qwen tiering in this approval |

**Approved allowed provider names (post-sign-off):** `mock`, `gemini` (primary), `groq` (Tier 2), `qwen` (Tier 3), Manual mode (Tier 4).

## 2. Primary provider

| Field | Value |
|---|---|
| Primary provider name | **Gemini** |
| Primary model ID(s) | To be configured after staging/commit (OQ-006-02 apply config) |
| Primary prompt/schema versions | To be configured after staging/commit |

## 3. Optional fallback provider

| Field | Value |
|---|---|
| Fallback allowed? | **Yes** (tiered) |
| Fallback Tier 2 | **Groq** |
| Fallback Tier 3 | **Qwen** |
| Fallback Tier 4 | **Manual mode** |
| Silent fallback permitted? | **No** — explicit config + audit (ADR-009) |

## 4. Permitted document / data categories

| Category | Permitted? | Conditions |
|---|---|---|
| Synthetic generated PDFs | Y | Dev/test |
| Anonymized / redacted PDFs | Y | Allowed |
| Real customer / shipper PDFs | **Y — PERMITTED from day 1** | Under this approval + provider Standard Terms |
| Real driver / plate / address data | Y | As present on permitted PDFs |
| Financial amounts / freight | Y | As present on permitted PDFs |
| Internal-only test PDFs (non-customer) | Y | |

## 5. Real business PDFs — prohibition or permission

| Option | Selected? |
|---|---|
| Prohibited until further notice | ☐ |
| Permitted to named primary provider only under DPA/terms | ☐ |
| **Permitted to primary + approved fallback tiers under Standard Terms** | ☑ |
| Forbidden for all external AI | ☐ |

**Written statement:** Real customer PDFs are **PERMITTED from day 1** under this approval. **AVV / separate DPA: NOT REQUIRED** — provider **Standard Terms** are sufficient per approval owner.

## 6. Provider data retention

| Topic | Decision | Legal validation |
|---|---|---|
| Provider-side retention of uploaded PDF bytes | Per provider **Standard Terms** | Owner accepted Standard Terms path |
| Provider-side retention of prompts / completions | Per provider **Standard Terms** | Same |
| Maximum retention before deletion request | Per provider **Standard Terms** | Same |
| Deletion confirmation evidence required? | Follow provider Standard Terms + ops practice | Same |
| Alignment with ASM-014 (app-side retention) | App-side durations per ASM-014 pragmatic defaults | Cross-linked |

## 7. Provider training / data-use restrictions

| Restriction | Required? | Decision |
|---|---|---|
| No training on customer content | Per Standard Terms | **Per provider Standard Terms** |
| No human review of customer content by provider staff (except abuse/legal) | Per Standard Terms | **Per provider Standard Terms** |
| Contractual DPA / AVV | **NO — not required** | Standard Terms sufficient |
| Subprocessors disclosed and approved | Per Standard Terms | **Per provider Standard Terms** |

## 8. Processing region requirements

| Field | Value |
|---|---|
| Required region(s) | **Per provider Standard Terms** |
| Data residency constraints | **Per provider Standard Terms** |
| Cross-border transfer basis | **Per provider Standard Terms** |

## 9. Logging restrictions

| Rule | Binding |
|---|---|
| No PDF bytes in application logs | **Yes (binding)** |
| No full extracted address/plate/freight dumps in logs | **Yes (binding)** |
| Provider request/response bodies in logs | Forbidden (safe errors / correlation IDs only) |
| Safe error codes / correlation IDs only | **Yes (binding)** |

## 10. Secrets management

| Rule | Decision |
|---|---|
| Provider API keys server-only (never `NEXT_PUBLIC_*`) | **Binding — Yes** |
| Secrets in env / secret manager only (never git) | **Binding — Yes** |
| Key rotation owner | Engineering / ops under product owner |
| Key revocation on DS-005 revocation | Required |

## 11. Fallback approval rules

| Rule | Decision |
|---|---|
| Fallback requires this DS-005 to name the fallback provider | **Yes** — Groq, Qwen, Manual named |
| Fallback requires explicit runtime configuration (not silent) | **Yes** |
| Fallback requires audit event with provider/model | **Yes** |
| Emergency fallback without re-approval | **No** unless owner documents exception |

## 12. Approval

| Field | Value |
|---|---|
| Approver name | **I. Dimitrov** |
| Approver role | Product / decision owner |
| Signature / recorded acknowledgment | **APPROVED** (recorded 2026-08-05 in Mission Control closeout) |
| Date | **2026-08-05** |
| Conditions / caveats | Live Gemini/Groq/Qwen wiring is **post-commit configuration**. Logging + secrets rules remain binding. AVV not required. |

## 13. Revocation procedure

1. Approval owner records **DS-005 REVOKED** with date and reason.
2. Disable live provider env/config immediately; force `TRANSPORT_ORDER_PROVIDER=mock` or Manual mode.
3. Rotate/revoke provider API keys.
4. Notify engineering + ops; open incident if required.
5. Update `planning/OPEN-DECISION-STOPS.md`, `planning/STATE.md`, and ADR register mirror.
6. Re-approval requires a new completed copy of this template.

## Explicit approval statement

**DS-005 is APPROVED (2026-08-05) by I. Dimitrov.** Real customer PDFs are permitted. AVV not required (Standard Terms). Primary: Gemini. Fallbacks: Groq (Tier 2), Qwen (Tier 3), Manual (Tier 4). Provider configuration after staging/commit does not reopen this decision unless terms or scope change.
