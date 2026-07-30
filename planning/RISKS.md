# Risk Register

> Updated 2026-07-30 — PACK-004 formally accepted with follow-ups

| ID | Risk | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| RSK-001 | Unverified Frotcom API → wrong integration | High | High | ADR-004 mocks; DS-001 gate before Phase 5 | Architect | OPEN |
| RSK-002 | Secrets leak into repo or reuse of chat credentials | Medium | Critical | `.env.example` only; gitignore; rotate offline | Architect | OPEN |
| RSK-003 | Wrong timezone day boundaries skew reports | Medium | High | UTC storage + configurable TZ (ASM-004) | Architect | OPEN |
| RSK-004 | Overlapping assignments corrupt historical attribution | Medium | High | ADR-005 mandatory GiST exclusion + app validation + 409; remote constraint verified | Architect | MITIGATING |
| RSK-011 | Hard DELETE / CASCADE wipes assignment history | Medium | High | ADR-006: no product DELETE; end/deactivate; FK RESTRICT applied | Architect | MITIGATING |
| RSK-012 | PACK-002 accepted follow-ups (test/hardening gaps) | Medium | Medium | FU-002-01…06 still open after PACK-004 Apply (live JWT/concurrency residual); **IDs preserved** | Architect | **ACCEPTED** (open items) |
| RSK-013 | Malicious or corrupt Excel upload | Medium | High | `.xlsx` allowlist; size/row caps; values-only parse; admin-only; formula-safe error report delivered | Architect | MITIGATING |
| RSK-015 | Double-confirm / concurrent confirm of same import job | Medium | High | CAS + 409 + search_path; concurrent multi-client evidence still residual (OQ-004-04) | Architect | MITIGATING |
| RSK-016 | PACK-003 accepted follow-ups (error report; confirm tests; create+insert TX) | Medium | Medium | FU-003-01 **CLOSED**; FU-003-02/03 open; transport finalize correction tracked | Architect | **ACCEPTED** (partially open) |
| RSK-017 | PACK-004 scope creep into reports UI or Frotcom | Medium | High | Hard out-of-scope held this Apply; OQ-004-01 defers TASK-009 | Architect | MITIGATED |
| RSK-005 | Partial vehicle sync failure loses whole day | Medium | High | Per-vehicle error collection; bounded retry (n8n) | Architect | OPEN |
| RSK-006 | Silent bad data (suspicious km/times) misleads managers | Medium | High | data_quality_status visible in UI | Architect | OPEN |
| RSK-007 | Scope creep into TMS/map/payroll | Medium | Medium | Explicit non-goals; pack scope guards | Architect | OPEN |
| RSK-008 | Dual documentation structures fork truth | Low | High | Ban architect/builder/.project-launcher for new project | Architect | MITIGATED |
| RSK-009 | Local Docker/WSL unavailable on builder workstation | High | Low | Remote Supabase validation substitute; local runtime ergonomics note only | Architect | **ACCEPTED** (env note) |
| RSK-010 | Remote-only validation diverges from future local stacks | Medium | Medium | Forward-only migrations; re-run local when Docker/WSL available | Architect | OPEN |

## RSK-012 detail (PACK-002 accepted follow-ups)

| ID | Follow-up | Class |
|---|---|---|
| FU-002-01 | Automated RLS validation with real Auth/JWT users | Required follow-up |
| FU-002-02 | Parallel-client race harness | Accepted residual risk |
| FU-002-03 | Live DB-bypass → HTTP 409 `ASSIGNMENT_OVERLAP` integration test | Required follow-up |
| FU-002-04 | Explicit end/deactivate row-preservation assertions | Required follow-up |
| FU-002-05 | ADR-006 correction hardening (`SELECT FOR UPDATE` or equivalent) | Required follow-up |
| FU-002-06 | Local Docker unavailability | Environment note only |

These do **not** block `PACK_002_ACCEPTED_WITH_FOLLOW_UPS`. They must remain visible until closed with evidence.

## RSK-016 detail (PACK-003 accepted follow-ups)

| ID | Follow-up | Class |
|---|---|---|
| FU-003-01 | Downloadable error-report `.xlsx` from `import_job_rows` | **CLOSED** (Architect Review 2026-07-30) |
| FU-003-02 | Automated confirm / partial-success / create-on-confirm tests | Required follow-up — **OPEN** |
| FU-003-03 | Atomic per-row master create + assignment insert | Required follow-up — **OPEN** (SQL proven; empirical test missing) |

These do **not** block `PACK_003_ACCEPTED_WITH_FOLLOW_UPS`. Remaining open items must stay visible until closed with evidence. IDs must not be renumbered.

### Architect Review residual (PACK-004)

| Finding | Class | Treatment |
|---|---|---|
| Confirm transport pending | Targeted correction **ACCEPTED**; pack **PACK_004_ACCEPTED_WITH_FOLLOW_UPS** | FU-003-02 still open for broader confirm suite |
| Live JWT / concurrent CAS | Residual | FU-002-01 / OQ-004-04 |

### Documented residual findings (PACK-003; not renumbered FUs)

| Finding | Class | PACK-004 treatment |
|---|---|---|
| Jobs skip durable `uploaded`/`parsed` → direct `validated` | Accepted residual / doc drift | **RESOLVED OQ-004-03** — document current behavior; optional implement |
| Persist `markRow` may overwrite preview errors/warnings | Documented polish | **Mandatory** audit fix (Workstream F / ADR-008) |
| CAS RPC `search_path` hardening | Hardening recommendation | **Mandatory** (Workstream E) |
| `buffer as any` typing cleanup | Polish | Optional |
| UI duplicate-submit lock beyond pending | Optional UX | Optional |
| Multi-client confirm race harness | Accepted residual (CAS; RSK-015) | **RESOLVED OQ-004-04** — best-effort; residual with sign-off |
| Live JWT RLS smoke | Remains FU-002-01 / RSK-012 | **Mandatory** (Workstream D) |

## PACK-004 OQs (resolved 2026-07-30)

| OQ | Resolution |
|---|---|
| OQ-004-01 | ACCEPT DEFAULT — reports UI deferred |
| OQ-004-02 | DATABASE RPC — `persist_assignment_import_row` |
| OQ-004-03 | DOCUMENT CURRENT BEHAVIOR — direct validated OK |
| OQ-004-04 | BEST-EFFORT WITH MANUAL EVIDENCE |
