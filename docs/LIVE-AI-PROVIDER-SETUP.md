# Live AI provider setup (PACK-006)

> DS-005: **APPROVED** (2026-08-05)
> Default runtime provider remains **`mock`** until you set live env vars.
> Do **not** send real customer PDFs until keys, cost ceiling, and logging review are ready.
> Secrets are **server-only**. Never use `NEXT_PUBLIC_*` for AI keys.

## Provider ladder

| Tier | Provider | Env name | Role |
|---|---|---|---|
| Primary | **Gemini** | `gemini` | Default live primary |
| Fallback 2 | **Grok** (xAI) | `grok` (alias `xai`) | OpenAI-compatible |
| Fallback 2b | **Groq** (optional) | `groq` | OpenAI-compatible; DS-005 Tier-2 alt |
| Fallback 3 | **Qwen** | `qwen` | OpenAI-compatible |
| Fallback 4 | **Manual** | `manual` | No external AI; human skeleton order |
| Dev/test | **Mock** | `mock` | Deterministic synthetic extract |

Default fallbacks when primary is a live provider and `TRANSPORT_ORDER_FALLBACK_PROVIDERS` is unset: `grok,qwen,manual`.

For the **Gemini free-tier pilot**, set fallbacks explicitly to `manual` only (do not enable Grok/Qwen unless separately approved).

## Environment variables

Copy from `.env.example` into `.env.local` (gitignored). Never commit `.env.local`.

```bash
# Normal development — keep mock
TRANSPORT_ORDER_PROVIDER=mock

# Gemini free-tier pilot (local .env.local only):
# TRANSPORT_ORDER_PROVIDER=gemini
# TRANSPORT_ORDER_FALLBACK_PROVIDERS=manual

# Gemini (server-only)
GEMINI_API_KEY=
# Canonical model id from Google AI Studio (multimodal / PDF-capable):
GEMINI_MODEL_ID=
# Legacy fallback only (accepted if GEMINI_MODEL_ID is unset/blank):
# GEMINI_MODEL=
# GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# Grok / xAI (optional; not part of free-tier pilot)
GROK_API_KEY=
# or XAI_API_KEY=
# GROK_MODEL=grok-2-latest
# GROK_API_BASE_URL=https://api.x.ai/v1

# Groq (optional)
GROQ_API_KEY=
# GROQ_MODEL=llama-3.3-70b-versatile
# GROQ_API_BASE_URL=https://api.groq.com/openai/v1

# Qwen (DashScope OpenAI-compatible; optional)
QWEN_API_KEY=
# QWEN_MODEL=qwen-vl-max
# QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## Gemini Free-Tier Pilot

Gemini free tier is intended for **pilot use only** (not production rollout).

1. Create the API key in **Google AI Studio**.
2. Store the key **only** in local `.env.local`.
3. Never commit the key, paste it into chat, or print it in logs/terminals shared with others.
4. Model ID must be a **multimodal** Gemini model capable of PDF/document input.
5. Take the **exact** model ID from Google AI Studio — do not invent or assume a model string. Set it as **`GEMINI_MODEL_ID`** (canonical). Legacy `GEMINI_MODEL` is accepted only if `GEMINI_MODEL_ID` is unset or blank.
6. Check quota **manually** in Google AI Studio before and during the pilot.
7. Relevant quota dimensions (verify current values in the console; do not assume fixed numbers such as “60 RPM”):
   - requests per minute
   - requests per day
   - tokens per minute
   - tokens per day
   - maximum context / file size
8. If quota is exhausted, the system must fall back to **manual** (when configured) or fail controlled with **`EXTRACTION_FAILED`**.
9. No endless retry loops.
10. No PDF bytes in logs.
11. No extracted business values (addresses, plates, freight, etc.) in logs.

Pilot scope: one pilot user (I. Dimitrov, admin), one PDF template initially, controlled local testing only.
See also: `docs/GEMINI-FREE-TIER-PILOT-CHECKLIST.md`.

## Free-Tier Pilot Cost Ceiling

| Control | Value |
|---|---|
| Monetary budget | **0 EUR** (free tier only) |
| Pilot scope | One PDF template, one pilot user |
| Maximum extractions per day | **20** |
| Warning threshold | **80%** of observed daily quota, or **16** requests/day (whichever is reached first for ops judgment) |
| Kill switch | `TRANSPORT_ORDER_PROVIDER=mock` |
| Fallback for free-tier pilot | `manual` (`TRANSPORT_ORDER_FALLBACK_PROVIDERS=manual`) |
| Production on free tier | **Not allowed** without separate approval |

Ops must track extraction count manually during the pilot (no automated billing dashboard required while monetary budget is 0 EUR). If the daily max or quota warning is hit, set the kill switch immediately.

## Binding security rules

1. AI keys only in server env / secret manager — **never** `NEXT_PUBLIC_*`.
2. No PDF bytes or operational dumps in application logs.
3. Browser uploads only to the Next.js server; providers are called from server code.
4. Prefer synthetic/mock until the free-tier pilot checklist and cost ceiling are accepted.
5. Manual mode creates a null-heavy skeleton for human confirmation — no provider call.

## How resolution works

`resolveExtractionProvider()` in `src/lib/transport-orders/providers/registry.ts`:

1. Reads `TRANSPORT_ORDER_PROVIDER` (default `mock`).
2. Builds the named adapter.
3. For live names (`gemini` / `grok` / `groq` / `qwen`), wraps with `ChainedPdfExtractionProvider` using `TRANSPORT_ORDER_FALLBACK_PROVIDERS`.
4. `mock` and `manual` are not chained.

## Local verification (synthetic only)

```bash
# Unit tests — mocked fetch; no external calls
npm test -- tests/transport-orders/providers.test.ts

# Keep product on mock for UI/DB smoke
TRANSPORT_ORDER_PROVIDER=mock npm run dev
```

Do **not** point live keys at real customer PDFs until the Gemini free-tier pilot checklist is complete and a human has authorized the first live call.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Missing server-only secret GEMINI_API_KEY` | Key not set in server env |
| `Unknown TRANSPORT_ORDER_PROVIDER` | Typo; allowed: mock, gemini, grok, groq, qwen, manual, xai |
| `Missing server-only secret GROK_API_KEY` at startup | Default fallbacks include `grok`; set `TRANSPORT_ORDER_FALLBACK_PROVIDERS=manual` for free-tier pilot |
| Chain falls through to Manual | Upstream HTTP/schema failures; check status without logging bodies |
| Accidental browser key | Remove any `NEXT_PUBLIC_*` AI keys immediately and rotate |
