# Risk Register

> Updated 2026-07-30 — PACK-002 accepted with follow-ups

| ID | Risk | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| RSK-001 | Unverified Frotcom API → wrong integration | High | High | ADR-004 mocks; DS-001 gate before Phase 5 | Architect | OPEN |
| RSK-002 | Secrets leak into repo or reuse of chat credentials | Medium | Critical | `.env.example` only; gitignore; rotate offline | Architect | OPEN |
| RSK-003 | Wrong timezone day boundaries skew reports | Medium | High | UTC storage + configurable TZ (ASM-004) | Architect | OPEN |
| RSK-004 | Overlapping assignments corrupt historical attribution | Medium | High | ADR-005 mandatory GiST exclusion + app validation + 409; remote constraint verified | Architect | MITIGATING |
| RSK-011 | Hard DELETE / CASCADE wipes assignment history | Medium | High | ADR-006: no product DELETE; end/deactivate; FK RESTRICT applied | Architect | MITIGATING |
| RSK-012 | PACK-002 accepted follow-ups (test/hardening gaps) | Medium | Medium | Tracked FU-002-01…06; do not silently drop or move to PACK-003 | Architect | **ACCEPTED** |
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
