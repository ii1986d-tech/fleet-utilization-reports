# Scaling assessment — 50 dispatchers

> Updated: **2026-08-06**  
> Related: `planning/RISKS.md` (RSK-SCALE-001) · `planning/WORK-BACKLOG.md` (FU-SCALE-001…008)  
> Baseline: PACK-007 Part 2 complete (`3d73d76`)

## Current architecture assessment

### What works well (1–5 users)

- Next.js + Supabase architecture
- Security (RLS, no DELETE, soft-delete pattern)
- Test coverage (185 passed, 30 skipped at Part 2 baseline)
- Code quality (lint, build, typecheck all pass)
- AI extraction (Gemini) for individual PDFs
- Maps API client with caching for individual requests

### Critical bottlenecks for 50 users

#### Bottleneck 1: Gemini Free Tier rate limit

| Field | Value |
|---|---|
| Current limit | ~60 requests/minute |
| Failure mode | 50 users uploading simultaneously → limit exceeded immediately → 429, extraction fails |
| Solution | Upgrade to Gemini Paid Tier + implement queue/worker |
| Priority | **CRITICAL** |
| Estimated effort | 2–3 days |

#### Bottleneck 2: Google Maps budget

| Field | Value |
|---|---|
| Current budget | $50/month |
| Load estimate | 50 users × 20 orders/day ≈ 30,000 requests/month |
| Cost estimate | ~$150/month without caching; ~$30/month with ~80% caching |
| Solution | Increase budget to $100/month **or** switch to HERE/TomTom |
| Priority | **MEDIUM** |
| Estimated effort | 0.5 days (budget) or 2–3 days (provider switch) |

#### Bottleneck 3: Supabase Free Tier storage

| Field | Value |
|---|---|
| Current limit | 5 GB |
| Load estimate | 50 users × 10 PDFs/day × 2 MB/PDF ≈ 1 GB/day |
| Failure mode | Storage full after ~5 days |
| Solution | Upgrade to Supabase Paid Tier (100 GB) **or** PDF archival |
| Priority | **CRITICAL** |
| Estimated effort | 0.5 days (upgrade) or 2 days (archival) |

#### Bottleneck 4: In-memory caching

| Field | Value |
|---|---|
| Current | JavaScript `Map` in server memory (Maps route cache / cost counters) |
| Problem | Cache lost on restart; not shared across instances |
| Solution | Redis **or** Supabase table for shared cache |
| Priority | **MEDIUM** |
| Estimated effort | 1–2 days |

#### Bottleneck 5: No queue/worker for PDF processing

| Field | Value |
|---|---|
| Current | Synchronous PDF extraction |
| Problem | 50 simultaneous uploads → 50 simultaneous Gemini requests |
| Solution | Async queue/worker (e.g. Supabase Edge Functions + queue) |
| Priority | **CRITICAL** |
| Estimated effort | 3–5 days |

#### Bottleneck 6: No rate limiting

| Field | Value |
|---|---|
| Current | No rate limiting on API calls |
| Problem | Single user could send hundreds of requests |
| Solution | Rate limiting per user and globally |
| Priority | **MEDIUM** |
| Estimated effort | 1 day |

## Scaling phases

### Phase 1: Pilot (1–5 users) — CURRENT

- Status: **READY**
- No additional infrastructure needed
- Gemini Free Tier sufficient
- $50 Maps budget sufficient
- Supabase Free Tier sufficient

### Phase 2: Small scale (10–20 users)

- Gemini Paid Tier
- Maps budget increase to $100/month
- Redis for caching
- Rate limiting
- Estimated effort: **5–7 days**

### Phase 3: Full scale (50 users)

- Queue/worker for async PDF processing
- Supabase Paid Tier (100 GB storage)
- Load testing with simulated 50 users
- Monitoring and alerting
- Consider HERE/TomTom for Maps (truck-specific routing)
- Estimated effort: **10–15 days**

## Recommendations

1. Start pilot with **1–5 users NOW** (current code is ready for Phase 1).
2. Collect feedback for **1–2 weeks**.
3. Plan scaling based on **actual** usage patterns.
4. Implement **Phase 2** before scaling to 10–20 users.
5. Implement **Phase 3** before scaling to 50 users.
6. Do **not** try to support 50 users immediately (over-engineering).

## Follow-up task index

| ID | Phase | Priority |
|---|---|---|
| FU-SCALE-001 | 2 | HIGH |
| FU-SCALE-002 | 3 | HIGH |
| FU-SCALE-003 | 3 | HIGH |
| FU-SCALE-004 | 2 | MEDIUM |
| FU-SCALE-005 | 2 | MEDIUM |
| FU-SCALE-006 | 2 | MEDIUM |
| FU-SCALE-007 | 3 | HIGH |
| FU-SCALE-008 | 3 | MEDIUM |

See `planning/WORK-BACKLOG.md` and risk **RSK-SCALE-001**.
