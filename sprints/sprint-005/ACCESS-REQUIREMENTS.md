# PACK-005 Access Requirements

> Status: access preparation — evidence suite **not** executed
> Secret file: `scripts/pack005-evidence/.env.local` (**gitignored**)
> Check: `node scripts/pack005-evidence/check-access.mjs`

---

## 1. Variable contract

| Variable | Purpose | Mandatory | Obtain from | Sensitivity | Store in | Use in | Validation | Cleanup |
|---|---|---|---|---|---|---|---|---|
| `PACK005_NON_PRODUCTION_CONFIRMED` | Human attestation that target is isolated **development** | **Yes** (`true`) | Human decision | public flag | `.env.local` only | evidence tooling | must equal `true` | clear when done |
| `PACK005_SUPABASE_PROJECT_REF` | Non-secret project identifier | **Yes** | Supabase Dashboard → Project Settings → General | public-ish | `.env.local` | evidence tooling | `[a-z0-9]{15,30}` | n/a |
| `PACK005_SUPABASE_URL` | API URL for Auth + PostgREST | **Yes** | Project Settings → API → Project URL | sensitive (env-specific) | `.env.local` | evidence tooling (server-side scripts) | `http(s)` URL, no embedded credentials | n/a |
| `PACK005_SUPABASE_ANON_KEY` | Publishable/anon key for user JWT sessions | **Yes** | Project Settings → API → `anon` / **publishable** (`sb_publishable_…` or legacy `eyJ…`) | sensitive | `.env.local` | evidence tooling / browser-like clients | `sb_publishable_…` or `eyJ…` | rotate if leaked |
| `PACK005_SUPABASE_SERVICE_ROLE_KEY` | Secret/service_role for Auth Admin + fixture setup/cleanup | **Required for provisioning**; optional for check-access only | Project Settings → API → **secret** / `service_role` (`sb_secret_…` or legacy `eyJ…`) | **highly sensitive** | `.env.local` only | evidence tooling server-side **only** | `sb_secret_…` or `eyJ…` | rotate if leaked; never browser |
| `PACK005_ADMIN_EMAIL` | Admin test user login | **Yes** | Auth → Users (created by you) | sensitive | `.env.local` | evidence sign-in | email format | deactivate/delete user after pack |
| `PACK005_ADMIN_PASSWORD` | Admin test password | **Yes** | You generate | **highly sensitive** | `.env.local` only | evidence sign-in | length ≥8 | rotate/delete with user |
| `PACK005_MANAGER_EMAIL` | Manager test user | **Yes** | Auth → Users | sensitive | `.env.local` | evidence sign-in | email format | deactivate/delete |
| `PACK005_MANAGER_PASSWORD` | Manager password | **Yes** | You generate | **highly sensitive** | `.env.local` only | evidence sign-in | length ≥8 | rotate/delete |
| `PACK005_VIEWER_EMAIL` | Viewer test user | **Yes** | Auth → Users | sensitive | `.env.local` | evidence sign-in | email format | deactivate/delete |
| `PACK005_VIEWER_PASSWORD` | Viewer password | **Yes** | You generate | **highly sensitive** | `.env.local` only | evidence sign-in | length ≥8 | rotate/delete |
| `PACK005_RUN_ID` | Fixture namespace suffix `p5ev_<runId>_…` | Optional | You choose | public | `.env.local` | fixtures/cleanup | `[a-zA-Z0-9_-]{4,32}` | reuse or new per run |

### Explicit rules

- Supabase **URL** and **anon key** are required.
- Admin, manager, and viewer test users are required.
- Authoritative role is JWT claim **`app_metadata.role`** (`admin` \| `manager` \| `viewer`) — see `docs/AUTH-ROLES.md`.
- **`user_metadata.role` is not authoritative** and must not be used as the role source.
- Service role is optional and **never** proof of end-user RLS.
- No production account or production data.
- **Do not** paste any value into chat, Cursor prompts, or tracked files.

---

## 2. Manual actions required from the user

### Completed (authoritative — see `ACCESS-VERIFICATION.md`)

1. Non-production project confirmed; `.env.local` present and ignored.
2. `check-access.mjs` → **overall: READY**.
3. `provision-test-users.mjs provision` → **overall: PASS** (admin/manager/viewer created; roles verified).
4. Do **not** re-provision unless identities are lost or credentials rotated.

### Remaining

5. Await explicit **Apply** authorization for live evidence execution (`READY_FOR_EVIDENCE_EXECUTION`).
6. After evidence completion: deactivate/delete test users; rotate secrets if exposed.

---

## 3. Test-user provisioning plan

> **Status:** identities **READY** (successful retry). Procedure below retained for re-provision only if needed.

### Authoritative role assignment (this project)

Repository contract:

- Claim path: `app_metadata.role`
- SQL: `auth.jwt() -> 'app_metadata' ->> 'role'` via `current_app_role()`
- App: `parseRoleFromAppMetadata` in `src/lib/auth/roles.ts`

**Safest supported method:** Supabase Dashboard → Authentication → Users → create/update user → set **App Metadata** JSON:

```json
{ "role": "admin" }
```

(or `"manager"` / `"viewer"`).

Alternative (same contract): Supabase Admin API / Dashboard “User Management” with service role — still sets **app_metadata**, not raw `auth` table hacks.

**Do not:**

- put role only in `user_metadata`
- invent a `profiles.role` mechanism (not used by this RLS)
- directly SQL-update auth internals unless Supabase explicitly documents that path for your project (prefer Dashboard/Admin API)

### Per-user checklist

| User | Suggested email pattern | `app_metadata.role` | Password | Confirm |
|---|---|---|---|---|
| PACK-005 admin | `pack005.admin+dev@…` (your domain) | `admin` | strong temporary | Confirm email if project requires |
| PACK-005 manager | `pack005.manager+dev@…` | `manager` | strong temporary | same |
| PACK-005 viewer | `pack005.viewer+dev@…` | `viewer` | strong temporary | same |

For each user:

1. Create in **development** Auth only.
2. Set App Metadata `{ "role": "<role>" }`.
3. Confirm account if email confirmation is enabled (or disable confirm for these test users in dev only).
4. Disable MFA on these test users (or document a non-interactive auth path).
5. Verify sign-in once in Dashboard or a private session (do not paste JWT into chat).
6. Store email/password only in `.env.local`.
7. After PACK-005 evidence completion: deactivate or delete the three users; rotate any leaked secrets.

### Access scope

Test users inherit normal RLS. They must not be granted service-role. Prefer empty/dev data; fixtures use `p5ev_*` namespace only.

---

## 4. Non-production safety guard

| Guard | Behavior |
|---|---|
| `PACK005_NON_PRODUCTION_CONFIRMED=true` | Required by `check-access.mjs` and README |
| Human project confirmation | Required before filling `.env.local` |
| Project ref | Must match approved development project (human check; tooling validates format only) |
| Incomplete access | `check-access.mjs` exits non-zero |
| Secret printing | Forbidden; script never prints values |
| Cleanup rights | Required before Apply mutates data (admin JWT and/or service role) |

---

## 5. Planned evidence runners (structure only — not implemented)

| Runner | Required vars | Fixtures | Outputs | Cleanup | Evidence artifact | Stop when |
|---|---|---|---|---|---|---|
| `run-live-jwt.mjs` | non-prod, URL, anon, 3 user pairs, run id | minimal `p5ev_*` masters/assignments/jobs | allow/deny matrix | reverse delete | `EVIDENCE-LOG` FU-002-01 | unexpected allow; missing users |
| `run-confirm-suite.mjs` | + admin pair; service role optional | import job/rows + vehicle | C01–C13 results | namespace purge | FU-003-02 | CAS/counter mismatch; defect |
| `run-orphan-rollback.mjs` | + admin; create-on path | overlap seed + unique names | O01–O03 | verify no orphans | FU-003-03 | orphan remains |
| `run-concurrency.mjs` | + admin (optional 2nd) | validated job / overlap pair | race outcomes | purge | FU-002-02 / OQ-004-04 | residual OK |
| `fixtures.mjs` | admin or service role | create `p5ev_*` | ids map | used by cleanup | setup note | cannot isolate namespace |
| `cleanup.mjs` | admin or service role | — | zero remaining `p5ev_<runId>` | self | cleanup verify | cleanup fail |
| `redact.mjs` | n/a | — | sanitized strings | n/a | supports logs | n/a |

All runners: **planned** / **not executed**.

---

## 6. Access status and follow-ups

| Item | Status |
|---|---|
| Access preparation | **READY** |
| Test identities | **READY** |
| FU-002-05 | partial review only — see `EVIDENCE-LOG.md` |
| FU-002-06 | passed env note — see `EVIDENCE-LOG.md` |
| Live JWT / DB confirm / orphan / concurrency | **planned** — access no longer blocking; **not executed** |

Next gate: **READY_FOR_EVIDENCE_EXECUTION** (explicit Apply required).
