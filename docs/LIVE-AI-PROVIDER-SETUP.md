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

Default fallbacks when primary is a live provider: `grok,qwen,manual`.

## Environment variables

Copy from `.env.example` into `.env.local` (gitignored).

```bash
# Primary selection
TRANSPORT_ORDER_PROVIDER=mock
# For live pilot (after keys set):
# TRANSPORT_ORDER_PROVIDER=gemini
# TRANSPORT_ORDER_FALLBACK_PROVIDERS=grok,qwen,manual

# Gemini (primary)
GEMINI_API_KEY=
# GEMINI_MODEL=gemini-2.0-flash
# GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# Grok / xAI
GROK_API_KEY=
# or XAI_API_KEY=
# GROK_MODEL=grok-2-latest
# GROK_API_BASE_URL=https://api.x.ai/v1

# Groq (optional)
GROQ_API_KEY=
# GROQ_MODEL=llama-3.3-70b-versatile
# GROQ_API_BASE_URL=https://api.groq.com/openai/v1

# Qwen (DashScope OpenAI-compatible)
QWEN_API_KEY=
# QWEN_MODEL=qwen-vl-max
# QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## Binding security rules

1. AI keys only in server env / secret manager — **never** `NEXT_PUBLIC_*`.  
2. No PDF bytes or operational dumps in application logs.  
3. Browser uploads only to the Next.js server; providers are called from server code.  
4. Prefer synthetic/mock until ops cost ceiling (OQ-006-09) is configured.  
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

Do **not** point live keys at real customer PDFs until pilot checklist (bucket, cost ceiling, logging) is complete.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Missing server-only secret GEMINI_API_KEY` | Key not set in server env |
| `Unknown TRANSPORT_ORDER_PROVIDER` | Typo; allowed: mock, gemini, grok, groq, qwen, manual, xai |
| Chain falls through to Manual | Upstream HTTP/schema failures; check status without logging bodies |
| Accidental browser key | Remove any `NEXT_PUBLIC_*` AI keys immediately and rotate |
