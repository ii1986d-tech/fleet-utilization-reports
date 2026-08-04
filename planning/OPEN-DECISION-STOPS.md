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

## DS-004 — Sample transport-order PDFs (blocks PACK-006 PACK_READY / Apply)

**Question:** Which anonymized Bordero/transport-order PDF layouts must the AI extractor support, and what are the expected-field manifests?

**Required samples:**

1. **SPL-006-001** — simple digital PDF; one pickup + one delivery + expected-field manifest  
2. **SPL-006-002** — multiple pickup/delivery; references and tables + manifest  
3. **SPL-006-003** — different layout; multi-page or scanned if used in ops + manifest  

**Status: RESOLVED / COMPLETE (2026-08-04 final evidence check)**

Local ignored path `references/private/pack-006/` now holds **26 PDFs + 26 expected manifests** (perfect pairing). **8** manifests are `human_verified` including the three required profiles (SPL-006-001/002/003) plus SPL-006-004/007/013/017/020. **18** remain intentional `template_empty` scaffolds (not fabricated). Path remains gitignored; samples are not tracked.

**Residual (non-blocking for DS-004):** additional empty templates may be filled later for broader coverage; content-duplicate PDFs SPL-006-010 ≡ SPL-006-011 documented via SHA-256 / `rename-map.csv`.

**Related:** SPL-006-*; RSK-018 mitigated; ADR-009 **ACCEPTED**; non-provider Dry-Run complete; DS-005 still open; `sprints/sprint-006/BUILDER-DRY-RUN.md`.

## DS-005 — External AI processing of transport-order PDFs (blocks real-customer provider use)

**Question:** May transport-order PDFs be sent to Gemini and/or xAI, under which terms?

**Must approve:**

- Whether **real customer PDFs** may be sent to Gemini  
- Whether **real customer PDFs** may be sent to xAI  
- Free-tier vs paid/approved processing  
- Data-processing terms / DPA as applicable  
- Retention/deletion behavior (remote provider files)  
- Provider region, where relevant  
- Company/legal approval  
- Whether documents must be anonymized before send  

**Options:**

1. Anonymized/synthetic only until legal sign-off; then paid/approved mode for real docs (recommended default until resolved)  
2. Approve named provider(s) for real customer PDFs with documented terms + deletion SLA  
3. Forbid external AI entirely (forces strategy rewrite — out of current ADR-009)

**Recommendation:** Option 1 until written approval. Until resolved: **no real customer document** may be sent to Gemini or xAI during development. Free-tier limited to anonymized/synthetic samples.

**Impact:** Unapproved external processing creates legal/privacy exposure (RSK-022).

**Related:** ADR-009; ASM-016; RSK-022; OQ-006-10.
