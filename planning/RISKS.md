# Risk Register

> Updated 2026-08-03 — PACK-005 formally accepted with follow-ups

| ID | Risk | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| RSK-001 | Unverified Frotcom API → wrong integration | High | High | ADR-004 mocks; DS-001 gate before Phase 5 | Architect | OPEN |
| RSK-002 | Secrets leak into repo or reuse of chat credentials | Medium | Critical | `.env.example` only; gitignore; rotate offline | Architect | OPEN |
| RSK-003 | Wrong timezone day boundaries skew reports | Medium | High | UTC storage + configurable TZ (ASM-004) | Architect | OPEN |
| RSK-004 | Overlapping assignments corrupt historical attribution | Medium | High | ADR-005 mandatory GiST exclusion + app validation + 409; remote constraint verified; PACK-005 live evidence | Architect | MITIGATED |
| RSK-011 | Hard DELETE / CASCADE wipes assignment history | Medium | High | ADR-006: no product DELETE; end/deactivate; FK RESTRICT applied; PACK-005 preserve evidence | Architect | MITIGATED |
| RSK-012 | PACK-002 accepted follow-ups (test/hardening gaps) | Medium | Low | PACK-005 closed FU-002-01…06 (05 with residual); residual FOR UPDATE gap remains visible | Architect | **MITIGATED** (residual documented) |
| RSK-013 | Malicious or corrupt Excel upload | Medium | High | `.xlsx` allowlist; size/row caps; values-only parse; admin-only; formula-safe error report delivered | Architect | MITIGATING |
| RSK-015 | Double-confirm / concurrent confirm of same import job | Medium | High | CAS + 409 + search_path; OQ-004-04 PACK-005 BEST-EFFORT evidence satisfied | Architect | MITIGATED |
| RSK-016 | PACK-003 accepted follow-ups (error report; confirm tests; create+insert TX) | Medium | Low | FU-003-01 **CLOSED**; FU-003-02 **CLOSED_WITH_RESIDUAL**; FU-003-03 **CLOSED** (PACK-005) | Architect | **MITIGATED** (C14 residual) |
| RSK-017 | PACK-004 scope creep into reports UI or Frotcom | Medium | High | Hard out-of-scope held this Apply; OQ-004-01 defers TASK-009 | Architect | MITIGATED |
| RSK-005 | Partial vehicle sync failure loses whole day | Medium | High | Per-vehicle error collection; bounded retry (n8n) | Architect | OPEN |
| RSK-006 | Silent bad data (suspicious km/times) misleads managers | Medium | High | data_quality_status visible in UI | Architect | OPEN |
| RSK-007 | Scope creep into TMS/map/payroll | Medium | Medium | Explicit non-goals; pack scope guards | Architect | OPEN |
| RSK-008 | Dual documentation structures fork truth | Low | High | Ban architect/builder/.project-launcher for new project | Architect | MITIGATED |
| RSK-009 | Local Docker/WSL unavailable on builder workstation | High | Low | Remote Supabase validation substitute; FU-002-06 **CLOSED** as env note | Architect | **ACCEPTED** (env note) |
| RSK-010 | Remote-only validation diverges from future local stacks | Medium | Medium | Forward-only migrations; re-run local when Docker/WSL available | Architect | OPEN |

## RSK-012 detail (PACK-002 accepted follow-ups — historical OPEN → PACK-005 closure)

| ID | Follow-up | Historical class | PACK-005 status |
|---|---|---|---|
| FU-002-01 | Automated RLS validation with real Auth/JWT users | Required follow-up | **CLOSED** (2026-08-03) |
| FU-002-02 | Parallel-client race harness | Accepted residual risk | **CLOSED** (2026-08-03) |
| FU-002-03 | Live DB-bypass → HTTP 409 `ASSIGNMENT_OVERLAP` | Required follow-up | **CLOSED** (2026-08-03) |
| FU-002-04 | Explicit end/deactivate row-preservation assertions | Required follow-up | **CLOSED** (2026-08-03) |
| FU-002-05 | ADR-006 correction hardening (`SELECT FOR UPDATE` or equivalent) | Required follow-up | **CLOSED_WITH_RESIDUAL** (2026-08-03) |
| FU-002-06 | Local Docker unavailability | Environment note only | **CLOSED** (2026-08-03) |

IDs must not be renumbered. Historical OPEN origin remains part of the record.

## RSK-016 detail (PACK-003 accepted follow-ups — historical OPEN → PACK-005 closure)

| ID | Follow-up | Historical class | PACK-005 status |
|---|---|---|---|
| FU-003-01 | Downloadable error-report `.xlsx` from `import_job_rows` | Required follow-up | **CLOSED** (Architect Review 2026-07-30) |
| FU-003-02 | Automated confirm / partial-success / create-on-confirm tests | Required follow-up — was OPEN | **CLOSED_WITH_RESIDUAL** (C14 unit; 2026-08-03) |
| FU-003-03 | Atomic per-row master create + assignment insert | Required follow-up — was OPEN | **CLOSED** (empirical O01–O03; 2026-08-03) |

IDs must not be renumbered.

### Accepted residuals after PACK-005

| Residual | Treatment |
|---|---|
| `correctAssignment` missing `FOR UPDATE` | Documented; GiST exclusion authoritative; no immediate correction |
| C14 remote transport inject not performed | Unit coverage retained; not a product defect |
| Local Docker daemon / local Supabase unavailable | Env note; remote evidence used |
| Retained Auth test identities | Intentional non-prod retention; credentials untracked |

## PACK-004 OQs (resolved)

| OQ | Resolution |
|---|---|
| OQ-004-01 | ACCEPT DEFAULT — reports UI deferred |
| OQ-004-02 | DATABASE RPC — `persist_assignment_import_row` |
| OQ-004-03 | DOCUMENT CURRENT BEHAVIOR — direct validated OK |
| OQ-004-04 | BEST-EFFORT WITH MANUAL EVIDENCE — **CLOSED / SATISFIED** (PACK-005) |
