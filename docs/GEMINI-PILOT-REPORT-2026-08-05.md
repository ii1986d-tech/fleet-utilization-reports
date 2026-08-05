# Gemini free-tier pilot report — 2026-08-05

| Field | Value |
|---|---|
| Pilot date | **2026-08-05** |
| Executor | **I. Dimitrov** |
| Provider | Gemini (free tier) |
| Model ID | `gemini-2.5-flash` |
| PDFs tested | **1** (real customer PDF) |
| Overall result | **SUCCESS** |
| Monetary cost | **0 EUR** (free tier) |
| Quota used | Check Google AI Studio console (not recorded in this report) |

## What worked (PASS)

- PDF upload (drag-and-drop + file picker)
- Gemini extraction
- Field recognition (baseline / simple layouts)
- Google Maps static link
- Review workflow (field confirm / edit path)

## Issues observed

Minor extraction errors on complex multi-stop orders:

- 2–3 pickup addresses
- 2–3 delivery addresses
- Complex multi-stop layout recognition

Tracked as backlog **FU-AI-001** (prompt tuning; optional schema adjustments).

## Recommendation

1. Proceed with **PACK-007** architect preparation (route corridors, Maps API, KM comparison).
2. Treat AI tuning for complex multi-stop layouts as a **separate follow-up** (FU-AI-001), after PACK-007 or when more PDF templates are available.

## Related

- `docs/GEMINI-PILOT-READINESS-CHECKLIST.md`
- `docs/GEMINI-FREE-TIER-PILOT-CHECKLIST.md`
- `docs/LIVE-AI-PROVIDER-SETUP.md`
- DS-005 APPROVED
