# PACK-006 — Security and Operations Readiness Report (Pilot)

> Date: **2026-08-05**  
> Scope: Pilot production readiness for PACK-006 transport-order PDF extract/review  
> Baseline commit: `08acb65`  
> Mode: **READ ONLY review** (no product code changes; no migrations applied; no provider calls; no secrets printed)  
> Classification: **READY_WITH_FOLLOW_UPS**

## Executive summary

PACK-006 ships with strong **data-plane** controls for the mock Apply path: private Storage helpers, RLS select + RPC-only mutations, viewer deny, CAS/idempotency, controlled extraction failure/retry, and DS-005 logging/secrets rules documented as binding.

Gaps that prevent a clean **READY_FOR_PILOT** (no follow-ups): live provider adapters not registered; Manual mode not implemented; cost ceiling / rate limiting / monitoring / alerting absent; ASM-014 auto-purge not implemented; npm audit reports **4 high / 2 moderate** (Next/postcss/sharp/uuid via exceljs); production backup/restore not evidenced.

**Pilot recommendation:** Proceed only with **mock or carefully gated live config after follow-ups**, under DS-005 APPROVED constraints, with explicit acceptance of the open ops items below.

---

## 1. Secrets handling

| Check | Result | Evidence |
|---|---|---|
| `.env.local` ignored | **PASS** | `.gitignore` lines for `.env.local`, `scripts/pack006-evidence/.env.local`; `git check-ignore` confirms |
| `references/private/**` ignored | **PASS** | `.gitignore` `references/private/` |
| No keys in tracked files | **PASS** (templates only) | Tracked env files are `.env.example` variants with empty placeholders |
| No `NEXT_PUBLIC_*` provider keys | **PASS** | `.env.example` exposes only `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`; no Gemini/Groq/Qwen public keys |
| Service role not browser-exposed | **PASS** (design) | `getSupabaseServiceRoleKey()` / `createSupabaseServiceClient()` in `src/lib/supabase/server.ts` + `env.ts`; used from `store/storage.ts` (server). Doc: `docs/AUTH-ROLES.md` |
| Evidence tooling secret hygiene | **PASS** (design) | pack006-evidence lib rejects `NEXT_PUBLIC_*` service-role misuse; redacts secrets in provisioner output |

**Follow-ups**

- Confirm production secret manager / Render env groups never set provider keys as `NEXT_PUBLIC_*`.  
- Rotate any keys if ever pasted into chat or logs (ops discipline; not evidenced as leaked in git).

---

## 2. RLS readiness

| Check | Result | Evidence |
|---|---|---|
| PACK-006 tables RLS enabled | **PASS** | Migration enables RLS on documents, runs, orders, snapshots, stops, PL positions, legs, field_reviews, events |
| Authenticated SELECT policies | **PASS** | `for select using (public.is_authenticated_role())` on all listed tables |
| No direct INSERT/UPDATE/DELETE for authenticated | **PASS** | Comment + absence of write policies; table grants revoked from `public`/`anon`/`authenticated` |
| Mutations via RPCs | **PASS** | `register_*`, `persist_*`, `mark_*_failed`, `mutate_*`, `reorder_*`, `confirm_*`, `complete_*` with `GRANT EXECUTE` to `authenticated` |
| Admin/manager write control | **PASS** | `transport_order_assert_manager_or_admin()` → `FORBIDDEN` / `UNAUTHENTICATED` |
| Viewer read-only | **PASS** (app + RPC) | Server actions return `FORBIDDEN` for viewer mutate; RPC assert blocks non-manager/admin; browser smoke Viewer V-01…V-07 PASS |

**Follow-ups**

- Re-verify RLS on **production** project after migration apply (local evidence exists; remote apply not part of this review).  
- Confirm Storage bucket RLS/policies in hosted Supabase match private-bucket expectation.

---

## 3. Storage readiness

| Check | Result | Evidence |
|---|---|---|
| Private bucket expected | **PASS** | `PRIVATE_STORAGE_BUCKET = "transport-order-pdfs"`; `assertPrivateTransportOrderBucket()` fails if missing or `public` |
| No public URL assumptions | **PASS** | Helpers use `createSignedUrl` (default 300s); no `getPublicUrl` in transport-order store |
| Server-only access pattern | **PASS** | Upload/download/signed URL via service client on server |

**Follow-ups**

- Production: create private bucket before first upload; fail closed if misconfigured.  
- Document signed-URL TTL for pilot ops.

---

## 4. Logging safety

| Check | Result | Evidence |
|---|---|---|
| No PDF bytes in app logs (code scan) | **PASS** (static) | No `console.log/debug/info` in `src/lib/transport-orders`; failed runs store `p_safe_error` message only |
| No extracted business value dumps in logs | **PASS** (static) | No stringify dumps of addresses/freight found in transport-order lib |
| Safe error codes | **PASS** (design) | App/RPC errors: `FORBIDDEN`, `EXTRACTION_FAILED`, `ORDER_VERSION_CONFLICT`, `ORDER_REVIEW_INCOMPLETE`, `INVALID_PDF`, etc. |
| DS-005 binding rules | **DOCUMENTED** | Approved template: no PDF bytes / no operational dumps; secrets server-only |

**Follow-ups**

- Before live Gemini/Groq/Qwen: add provider-adapter logging review (request/response bodies must stay forbidden).  
- Ensure hosting platform log drains do not capture multipart bodies.

---

## 5. Error handling

| Check | Result | Evidence |
|---|---|---|
| `extraction_failed` controlled | **PASS** | Review state + `mark_transport_order_extraction_failed` RPC; gate treats status |
| Timeout behavior | **PASS** (mock + constant) | `PROVIDER_TIMEOUT_MS = 60_000`; mock `timeout` mode; extract passes `timeoutMs` |
| Retry limits | **PASS** | `PROVIDER_MAX_ATTEMPTS = 3`; non-retryable breaks loop; terminal failure requires `forceRetry` |
| Manual fallback possible | **PARTIAL** | DS-005 approves Manual (Tier 4); **no Manual provider registered in code** — humans can still complete fields after failed extract / mock path |

**Follow-ups**

- Implement Manual mode / live adapters under DS-005 (post-deploy config task).  
- Update `resolveExtractionProvider` (still throws for `gemini`/`xai`/`grok`; does not yet know `groq`/`qwen`) before enabling live pilot traffic.

---

## 6. Dependencies

| Item | Result |
|---|---|
| `npm audit` (2026-08-05 local) | **6 vulnerabilities: 0 critical, 4 high, 2 moderate** |
| High | `next` → `postcss` (XSS / source map file disclosure advisories); `sharp` (libvips CVEs via Next) |
| Moderate | `uuid` via `exceljs` |
| Suggested fix path | `npm audit fix --force` pulls **Next 16** / exceljs downgrade — **breaking**; not applied in this review |
| Outdated notables | Next 15.5.22 (latest 16.x); `@supabase/ssr` 0.6.1 vs 0.12.x; zod 3 vs 4 |

**Follow-ups (non-blocking for mock pilot if accepted)**

- Schedule controlled Next/sharp upgrade or vendor patch review before wide production.  
- Track exceljs/uuid moderate separately (import path).  
- Do not force-upgrade in this readiness task.

---

## 7. Operations gaps

| Gap | Status | Notes |
|---|---|---|
| Monitoring / APM | **MISSING** | No Sentry/Datadog/etc. wired in repo |
| Alerting | **MISSING** | No extraction-failure / cost / auth alert hooks |
| Rate limiting | **MISSING** | No upload/extract rate limit at app edge |
| Cost ceiling (OQ-006-09) | **MISSING** | Required before live provider spend |
| Backup / restore tested | **UNTESTED** | Quality strategy historically OPEN; ASM-014 backup lag 30d not evidenced |
| Auto-expire / legal hold jobs | **NOT IMPLEMENTED** | ASM-014 durations set; production auto-purge blocked pending legal + engineering |
| Live provider config | **NOT DONE** | Intentional; mock-only runtime until adapters + secrets |
| Remote migration apply | **OPS STEP** | Local migration present; production apply separate |

---

## Classification rationale

| Class | When |
|---|---|
| READY_FOR_PILOT | Core controls green **and** live-path follow-ups closed **and** audit highs accepted/mitigated **and** minimal monitoring |
| **READY_WITH_FOLLOW_UPS** | **← Selected** — security foundations OK for controlled pilot; live AI + ops + dependency follow-ups open |
| BLOCKED | Secrets/RLS/Storage fail-open, or critical unpatched RCE in direct path, or DS-005 denied |

Not **BLOCKED**: fail-closed provider registry, private Storage checks, RLS/RPC model, and DS-005 APPROVED with binding logging/secrets rules.

---

## Pilot go / no-go checklist

**Allowed now (with acceptance of follow-ups)**

- Pilot on **mock** extract + human field confirm in a controlled environment  
- Or live extract **only after** provider adapters, server-only keys, cost ceiling, and logging review  

**Do not**

- Call Gemini/Groq/Qwen until adapters + keys + cost controls exist  
- Enable production auto-purge before legal validation  
- Commit `references/private/**` or `.env.local`  
- Treat HTML launcher as security SoT  

---

## Follow-up register (ordered)

1. Production Supabase: apply PACK-006 migration; create private `transport-order-pdfs` bucket; smoke RLS.  
2. Implement/register Gemini (+ Groq/Qwen/Manual) under DS-005; keep secrets server-only.  
3. Set OQ-006-09 cost ceiling + basic rate limit on upload/extract.  
4. Add minimal monitoring/alerting (extract fail rate, 5xx, Storage errors).  
5. Plan Next/sharp/postcss remediation without blind `--force`.  
6. Legal validation before ASM-014 production auto-purge; design yearly job + legal hold.  
7. Backup/restore drill for Storage + Postgres (document RPO/RTO).  

---

## Sources (non-secret)

- Commit `08acb65`  
- `supabase/migrations/20260804160000_pack006_transport_order_domain.sql`  
- `src/lib/transport-orders/**`, `src/lib/supabase/**`  
- `sprints/sprint-006/DS-005-DECISION-TEMPLATE.md`, `ASM-014-RETENTION-DECISION-TEMPLATE.md`  
- `npm audit` / `npm outdated` (local, 2026-08-05)  
- `.gitignore`, `.env.example`

---

## Final classification

**READY_WITH_FOLLOW_UPS**
