# PACK-005 evidence tooling

> Evidence Closure only — **not** product code.
> Baseline product checkpoint: `dbe59da`
> Do **not** import these scripts from `app/` or `src/`.

## Purpose

Secure local preparation for PACK-005 empirical evidence. This folder holds:

- access check (non-mutating)
- local secret contract (untracked `.env.local`)
- planned runner stubs (documented below; **not implemented yet**)

## Non-production guard

All tooling requires:

```text
PACK005_NON_PRODUCTION_CONFIRMED=true
```

You must also confirm the configured Supabase project is the **isolated development** project (not production).

Tooling must **stop** when:

- production status is uncertain
- project ref does not match the approved development project
- required access is incomplete
- secrets would need to be printed
- cleanup permissions are unavailable

## Setup (manual)

1. Copy `.env.example` → `.env.local` (local only; **never commit**).
2. Fill values from the Supabase **development** project and three Auth test users.
   See `sprints/sprint-005/ACCESS-REQUIREMENTS.md`.
3. Run access check:

```bash
node scripts/pack005-evidence/check-access.mjs
```

4. Provision / verify Auth test users (requires valid **secret** key):

```bash
node scripts/pack005-evidence/provision-test-users.mjs provision
node scripts/pack005-evidence/provision-test-users.mjs verify
```

5. Optional sanitize key-shape diagnostic (never prints values):

```bash
node scripts/pack005-evidence/diagnose-keys.mjs
```

6. Do **not** paste secrets into chat, Cursor prompts, or tracked files.

Key shapes: anon/publishable = `sb_publishable_…` or `eyJ…`; service/secret = `sb_secret_…` or `eyJ…`.

## Service role / secret

Required for Auth Admin provisioning and optional for fixture setup/cleanup.
**Never** acceptable as proof of end-user RLS.

## Planned runners (not implemented in this step)

| File | Purpose | Status |
|---|---|---|
| `run-live-jwt.mjs` | FU-002-01 JWT/RLS matrix | planned |
| `run-confirm-suite.mjs` | FU-003-02 confirm suite | planned |
| `run-orphan-rollback.mjs` | FU-003-03 orphan proof | planned |
| `run-concurrency.mjs` | FU-002-02 / OQ-004-04 | planned |
| `fixtures.mjs` | `p5ev_*` seed helpers | planned |
| `cleanup.mjs` | reverse-order cleanup | planned |
| `redact.mjs` | sanitize logs | planned |

See `ACCESS-REQUIREMENTS.md` and `EVIDENCE-PLAN.md` for contracts. Do not mark executed until Apply runs them.

## Allowed now

| Script | Behavior |
|---|---|
| `check-access.mjs` | Presence/format checks only; no DB mutations; no user creation |
| `provision-test-users.mjs` | Auth Admin create/update + anon sign-in role verify (sanitized) |
| `diagnose-keys.mjs` | Key-shape bands only; never prints values |

## Forbidden

- Frotcom / n8n / reports / exports
- Product modules under `app/` or `src/`
- Printing JWTs, passwords, or full API keys
- Using production credentials
- Closing follow-ups without empirical evidence
