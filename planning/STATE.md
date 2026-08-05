# State — Fleet Utilization Reports (FUR-001)

- Updated: **2026-08-05**
- SoT freshness: see `project-state.json` → `launcherFreshness` · process: `planning/LAUNCHER-SYNC.md`
- Binding operating model: **Mission Control at repository root** (vendor launcher = presentation only)
- Release baseline: **v1.0.0** (`a0b96a1`) — PACK-001…005 accepted
- PACK-006 status: **COMPLETE** (Apply `08acb65`; provider wiring `09fb2a6`/`3bbd605`; closeout finalize docs)
- ADR-009: **ACCEPTED (design binding)**
- DS-005: **RESOLVED / APPROVED** (I. Dimitrov, 2026-08-05)
- ASM-014: **RESOLVED** — Duration SET (7y/7y/7y/10y); legal validation before production auto-purge = follow-up
- Security: npm audit **safe fixes** applied (`55eabf3`); **5 vulnerabilities remain** as **FU-SEC-001** / **FU-SEC-002**
- Remaining npm audit items: **deferred to post-pilot**; **not** blocking PACK-006 closure or PACK-007 start
- `readyForStaging`: **false** (already staged, committed, and pushed)
- HTML launcher: re-import when convenient (`launcherImportAt` may still be null)

## Pack ladder

| Pack | Status |
|---|---|
| PACK-001…005 | **COMPLETE** |
| PACK-006 | **COMPLETE** (2026-08-05) — smoke 30/30; DS-005 APPROVED; ASM-014 SET; provider wiring done (mock default) |
| PACK-007 | **NOT_STARTED** — Routenlogik + KM-Vergleich |
| PACK-008 | **NOT_STARTED** |

## PACK-006 evidence (final closeout)

| Gate | Result |
|---|---|
| Technical quality gates | **PASS** |
| Live DB evidence | **PASS** — 11 / 1 skip / 0 fail |
| Synthetic UAT | **PASS** — 19/19 |
| Manual browser smoke | **PASS** — 30/30 · I. Dimitrov · 2026-08-05 |
| DS-005 | **APPROVED / RESOLVED** |
| ASM-014 | **RESOLVED** (durations set; legal auto-purge follow-up) |
| Live AI provider wiring | **DONE** (`09fb2a6`, `3bbd605`) — default mock; free-tier pilot pending |
| Git commit / push | **DONE** |
| npm audit safe fixes | **DONE** (`55eabf3`) — remaining → FU-SEC-001/002 |

## Security follow-ups (deferred)

| ID | Summary | Priority | Blocks PACK-007? |
|---|---|---|---|
| FU-SEC-001 | Next.js 15→16 (postcss + sharp highs) | MEDIUM (before 50-disponent) | **No** |
| FU-SEC-002 | exceljs → uuid moderate | LOW | **No** |
| RSK-SEC-001 | Deferred npm audit residual | OPEN / MITIGATING | **No** |

## Next authorized action

1. Gemini free-tier pilot (local ops) under DS-005 when product authorizes first live call.
2. **PACK-007** (Routenlogik + KM-Vergleich) when product authorizes start.
3. Schedule FU-SEC-001 before 50-disponent rollout.

## Evidence pointers

- `sprints/sprint-006/CLOSEOUT-AUDIT.md`
- `sprints/sprint-006/SECURITY_OPERATIONS_READINESS_REPORT.md`
- `sprints/sprint-006/MANUAL-BROWSER-SMOKE-CHECKLIST.md`
- `docs/GEMINI-FREE-TIER-PILOT-CHECKLIST.md`
- `planning/WORK-BACKLOG.md` (FU-SEC-001 / FU-SEC-002)
- `planning/RISKS.md` (RSK-SEC-001)
