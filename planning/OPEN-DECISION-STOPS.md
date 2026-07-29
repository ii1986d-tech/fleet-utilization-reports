# Open Decision Stops — FUR-001

> Durable stops for Architect/Builder. Chat is not SoT.

## DS-001 — Frotcom API contract (blocks Phase 5 / PACK-005)

**Question:** Which auth method, endpoints, fields, token lifetime, and rate limits are actually enabled for this account?

**Options:**

1. Provide official API docs + sandbox credentials via secure channel (recommended)
2. Schedule a supervised discovery session with a read-only account
3. Defer live integration and continue on mocks indefinitely (delays operational value)

**Recommendation:** Option 1. Until then keep ADR-004 mocks.

**Impact:** Wrong endpoints waste build effort and poison data quality.

## DS-002 — Business timezone & PDF org name (non-blocking if defaults OK)

**Question:** Confirm `Europe/Berlin` and the legal/display organization name for PDF headers?

**Options:**

1. Accept defaults (`Europe/Berlin`; placeholder org name in settings) — recommended for now
2. Provide exact IANA timezone + org string before PACK-001
3. Make both mandatory settings screens before any report UI

**Recommendation:** Option 1 for PACK-001; configure in `utilization_settings` early.

## DS-003 — Credential rotation confirmation (security, non-code)

**Question:** Has the operator rotated any Frotcom password previously exposed in chat?

**Options:**

1. Confirm rotated + new secrets only in env/n8n (recommended)
2. Confirm unused/no production access yet
3. Unknown — treat as incident until confirmed

**Recommendation:** Option 1 or 2 in writing; never paste secrets into the repo.
