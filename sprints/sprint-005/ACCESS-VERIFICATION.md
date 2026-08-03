# PACK-005 Access Verification

> Evidence classification: **authenticated identity preparation**
> Current status: **PACK_005_ACCESS_READY** / **PACK_005_TEST_IDENTITIES_READY**
> Live evidence suites: **executed** (see `EVIDENCE-RUN-RESULTS.json`; pack accepted)
> Authoritative verification timestamp: **2026-08-03** (successful retry; exact clock local to runner)

---

## Current authoritative result (successful retry)

| Field | Value |
|---|---|
| `check-access.mjs` | **overall: READY** |
| `provision-test-users.mjs provision` | **overall: PASS** |
| Non-production confirmed | `true` |
| Project ref (sanitized) | `ootsmrriuyesieblxudc` |
| URL ↔ ref alignment | PASS |
| Anon/publishable key shape | PASS |
| Service/secret key shape | PASS (corrected after first attempt) |
| Secrets printed | none |
| `.env.local` | ignored / untracked |

### Identity matrix

| Role | Provision | Auth sign-in | `app_metadata.role` | `auth.uid()` | `user_metadata.role` |
|---|---|---|---|---|---|
| admin | created | **PASS** | **PASS** (`admin`) | available | absent (not authoritative) |
| manager | created | **PASS** | **PASS** (`manager`) | available | absent (not authoritative) |
| viewer | created | **PASS** | **PASS** (`viewer`) | available | absent (not authoritative) |

### Authorization-source confirmation

- Role present in JWT **`app_metadata.role`** for each user.
- No profile table required for role authority.
- `user_metadata.role` not used as proof.
- `auth.uid()` available for later RLS evidence.

### Cleanup / retained identities (acceptance decision)

| Item | Status |
|---|---|
| Test users (admin / manager / viewer) | **Intentionally retained** for repeatable non-prod evidence |
| Environment | Isolated non-production only (ref sanitized above) |
| Credentials | Local untracked `.env.local` only — never in git |
| Ownership | Project operator / Architect |
| Future cleanup | Deactivate or delete when evidence tooling is no longer needed; rotate secrets if ever exposed |
| Required before PACK-005 acceptance? | **No** — retention is an accepted residual (D) |

### Evidence classification

**authenticated identity preparation — COMPLETE (READY)**
Subsequent live suites executed under PACK-005; see `EVIDENCE-LOG.md` / `ACCEPTANCE-RECORD.md`.

---

## Historical attempt (superseded — 2026-08-03 ~09:20Z)

First provisioning attempt **failed** and is preserved only as history:

| Field | Historical value |
|---|---|
| Service/secret key shape | FAIL (not `sb_secret_…` / not legacy `eyJ…`) |
| Auth Admin API | FAIL — `Invalid API key` |
| Users created | none |
| Classification then | INCOMPLETE |

No unrelated users were modified in that attempt. Later retry with a corrected secret key superseded this result.

---

## Next gate

**READY_FOR_EVIDENCE_EXECUTION** — await explicit Apply authorization for live JWT/RLS and DB evidence runners. Do not re-provision users unless identities are lost or credentials rotated.
