# Gemini free-tier pilot checklist

> Preparation only until a human authorizes the first live call.  
> No secrets in git. No secrets in chat. No production rollout on free tier.  
> DS-005 approved; monetary budget for this pilot: **0 EUR**.

## Scope

| Item | Value |
|---|---|
| Pilot user | I. Dimitrov (admin) |
| PDF templates | One template initially |
| Environment | Controlled local testing only |
| Primary provider | Gemini free tier |
| Fallback | `manual` |
| Kill switch | `TRANSPORT_ORDER_PROVIDER=mock` |
| Max extractions / day | 20 |
| Warning threshold | 80% of observed daily quota, or 16 requests/day |

## Before any live call

- [ ] Confirm DS-005 still approved (external AI + real customer PDFs permitted).
- [ ] Confirm free-tier cost ceiling accepted (`docs/LIVE-AI-PROVIDER-SETUP.md` § Free-Tier Pilot Cost Ceiling).
- [ ] Confirm `TRANSPORT_ORDER_PROVIDER` default in repo / CI remains `mock`.
- [ ] Confirm `.env.local` is gitignored and will not be committed.
- [ ] Create API key in **Google AI Studio** (do not paste the key into chat or tickets).
- [ ] Use **local `.env.local` only**.
- [ ] Enter `GEMINI_API_KEY` locally (never print / echo the value).
- [ ] Enter `GEMINI_MODEL_ID` locally — exact multimodal model ID from Google AI Studio (PDF/document capable). Do not invent the ID. (`GEMINI_MODEL_ID` is canonical; legacy `GEMINI_MODEL` is fallback only.)
- [ ] Set `TRANSPORT_ORDER_PROVIDER=gemini` **only** in local `.env.local`.
- [ ] Set `TRANSPORT_ORDER_FALLBACK_PROVIDERS=manual` in local `.env.local`.
- [ ] Do **not** configure Grok / Qwen keys for this pilot unless separately requested.
- [ ] Never use `NEXT_PUBLIC_*` for provider keys.
- [ ] Check quota dimensions manually in Google AI Studio (RPM, RPD, TPM, TPD, max context / file size). Do not assume fixed values (e.g. 60 RPM).
- [ ] Choose one known PDF template for the pilot; do not expand templates until first results are reviewed.
- [ ] Confirm logging rules: no PDF bytes, no request/response bodies, no extracted address/plate/freight dumps.
- [ ] Confirm kill switch procedure: set `TRANSPORT_ORDER_PROVIDER=mock` and restart the local server.
- [ ] Confirm daily count tracking plan (manual tally toward 20 max / 16 warning).

## First live extraction (human gate)

Do **not** proceed until all “Before any live call” items are checked.

- [ ] Human authorizes the first live Gemini call for this session.
- [ ] Start local app with `.env.local` loaded (no CI / no shared host).
- [ ] Upload only the approved single-template PDF as the pilot user.
- [ ] Verify extraction outcome (success → field confirmation UI, or controlled fallback/fail).
- [ ] On HTTP 429 / quota exhaustion: expect fallback to **manual** or terminal **`EXTRACTION_FAILED`** — no endless retries.
- [ ] Increment the daily extraction count.
- [ ] If warning threshold or max is reached: apply kill switch immediately.

## After each pilot session

- [ ] Set `TRANSPORT_ORDER_PROVIDER=mock` (or remove the gemini override) when finished.
- [ ] Do not leave live provider enabled overnight on shared machines.
- [ ] Record: date, template id/name, success/fail/fallback, count used that day (no PDF contents, no key material).
- [ ] If any key may have been exposed: rotate in Google AI Studio immediately.

## Explicit non-goals

- No PACK-007 work.
- No production / Render enablement of Gemini on free tier.
- No Grok / Qwen enablement unless newly requested.
- No committing `.env.local` or any real keys.
- No assuming fixed Google quotas without console verification.

## Model env notes

- Canonical: `GEMINI_MODEL_ID` (from Google AI Studio).
- Legacy: `GEMINI_MODEL` is accepted only when `GEMINI_MODEL_ID` is unset or blank.
- If neither is set, the adapter uses its built-in default model name (still override with AI Studio ID for the pilot).
