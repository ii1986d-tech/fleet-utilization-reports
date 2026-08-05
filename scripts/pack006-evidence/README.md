# PACK-006 database evidence tooling

> Evidence preparation only — **not** product code.
> Do **not** import these scripts from `app/` or `src/`.
> Live suite must **not** be marked PASS until it actually runs against a DB.

## Purpose

Reproducible preflight + live RPC/RLS/CAS/Storage evidence for PACK-006 against:

1. **local** Supabase (Docker Desktop required), or
2. an **explicitly approved non-production** disposable Supabase project.

## Non-production guards

All tooling requires:

```text
PACK006_NON_PRODUCTION_CONFIRMED=true
PACK006_TARGET=local   # or remote
```

Destructive remote operations additionally require:

```text
PACK006_ALLOW_DESTRUCTIVE_TEST_PROJECT_RESET=true
```

**Never** run `db reset`, wipe, or destructive push against production.
**Never** put service-role keys in `NEXT_PUBLIC_*` variables.
**Never** read `references/private/**`.

## Setup

1. Copy `.env.example` → `.env.local` (gitignored).
2. Fill local or remote non-production values and three Auth users with
   `app_metadata.role` ∈ `{admin,manager,viewer}`.
3. Apply migrations (see below).
4. Preflight, then live suite.

## Local execution (Docker available)

```bash
# Start engine, then:
npx supabase start
npx supabase db reset
# WARNING: resets local DB only. Never use against production.

# Fill scripts/pack006-evidence/.env.local (users + NON_PRODUCTION + TARGET=local).
# Prefer JWT ANON_KEY / SERVICE_ROLE_KEY from `npx supabase status -o env`.
# Local preflight overlays those status JWTs by default
# (PACK006_USE_SUPABASE_STATUS_KEYS=true).

# Idempotent local-only Auth user provision (app_metadata.role):
npm run pack006:provision-local-users

node scripts/pack006-evidence/preflight.mjs
npm run test:pack006-db-evidence
```

Equivalent vitest entry (after `.env.local` is loaded by the runner):

```bash
PACK006_DB_EVIDENCE=1 npm test -- tests/transport-orders/db-evidence.live.test.ts
```

`npm run test:pack006-db-evidence` runs preflight then the live vitest file.

## Remote non-production execution

```bash
# Only on an approved disposable test project.
# Set PACK006_TARGET=remote and PACK006_NON_PRODUCTION_CONFIRMED=true

# Optional destructive reset of THAT test project only:
# PACK006_ALLOW_DESTRUCTIVE_TEST_PROJECT_RESET=true
# npx supabase link --project-ref <TEST_REF>
# npx supabase db reset --linked
# NEVER point --linked at production.

node scripts/pack006-evidence/preflight.mjs
npm run test:pack006-db-evidence
```

Without `PACK006_ALLOW_DESTRUCTIVE_TEST_PROJECT_RESET=true`, operators must apply
migrations via non-destructive `db push` to the test project and acknowledge risk separately.

## Required variables checklist

| Variable | Purpose |
|---|---|
| `PACK006_NON_PRODUCTION_CONFIRMED=true` | Hard gate |
| `PACK006_TARGET=local\|remote` | Mode |
| `PACK006_SUPABASE_URL` | API URL |
| `PACK006_SUPABASE_ANON_KEY` | JWT user sessions |
| `PACK006_SUPABASE_SERVICE_ROLE_KEY` | Bucket/fixtures/cleanup only (server) |
| `PACK006_PRIVATE_BUCKET` | Default `transport-order-pdfs` |
| `PACK006_ADMIN_EMAIL` / `PASSWORD` | admin role user |
| `PACK006_MANAGER_EMAIL` / `PASSWORD` | manager role user |
| `PACK006_VIEWER_EMAIL` / `PASSWORD` | viewer role user |
| `PACK006_SUPABASE_PROJECT_REF` | Optional remote host check |
| `PACK006_ALLOW_DESTRUCTIVE_TEST_PROJECT_RESET` | Required for remote reset |

## Coverage (live suite)

When `PACK006_DB_EVIDENCE=1` and preflight passes, `db-evidence.live.test.ts` covers:

- private bucket present / missing-bucket fail-closed
- admin + manager RPC mutations
- viewer mutate denial + authenticated direct write denial
- CAS `ORDER_VERSION_CONFLICT` + version + audit
- upload/extraction idempotency across clients
- `IDEMPOTENCY_KEY_REUSE_MISMATCH`
- stop reorder under unique sequence; stable `stop_id`; PL/leg refs; audit arrays
- snapshot update/delete immutability
- completion gate incomplete + atomic complete + duplicate completion
- storage cleanup after failed register
- public URL not anonymously readable

## Local DB evidence status

- Local Docker Supabase + preflight: **PASS** (`PACK006_PREFLIGHT_PASS`)
- Live suite: **PASS** (11 passed / 1 intentional skip / 0 failed) via `npm run test:pack006-db-evidence`
- Synthetic UAT: `npm run pack006:synthetic-uat` (see `sprints/sprint-006/SYNTHETIC-UAT-RESULTS.md`)
- Still out of suite scope: end-to-end Next.js cookie-session browser path (RPC/Storage JWT clients are covered)

## Static SQL/adapter review notes (preparation)

| Check | Status |
|---|---|
| Snapshot table name consistency | `transport_order_extracted_snapshots` only |
| RPC names/params vs `SupabaseTransportOrderStore` | Aligned (`p_*` names) |
| Idempotency error | ADR `IDEMPOTENCY_KEY_REUSE_MISMATCH` |
| SECURITY DEFINER + `search_path=public` | Present on mutators |
| JWT role via `is_manager_or_admin()` / `current_app_role()` | Used in assert helper |
| RLS select-only for authenticated | Direct writes denied by missing policies |
| Bucket name | `transport-order-pdfs` (constants + migration + evidence) |
| Memory store production import | Factory only; requires dual test flags |
| Failed register cleanup | Adapter `removePrivatePdf` on RPC error |
| Local `seed.sql` | Empty file added so `db reset` does not fail on missing seed |

## Forbidden

- Gemini / xAI / Grok / Maps routing APIs
- Real operational sample values / `references/private/**`
- Claiming live database evidence passed without a green live run
- Replacing live tests with memory-store tests
