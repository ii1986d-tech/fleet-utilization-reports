# State — Fleet Utilization Reports (FUR-001)

- Updated: **2026-08-05**
- SoT freshness: see `project-state.json` → `launcherFreshness` · process: `planning/LAUNCHER-SYNC.md`
- Binding operating model: **Mission Control at repository root** (vendor launcher = presentation only)
- Release baseline: **v1.0.0** (`a0b96a1`) — PACK-001…005 accepted
- PACK-006 status: **COMPLETE** (committed `08acb65`, pushed)
- ADR-009: **ACCEPTED (design binding)**
- DS-005: **RESOLVED / APPROVED** (I. Dimitrov, 2026-08-05)
- ASM-014: **Duration SET** (pragmatic); legal validation before production auto-purge = follow-up
- Security: npm audit **safe fixes** applied (`55eabf3`, 2026-08-05); **5 vulnerabilities remain** as **FU-SEC-001** / **FU-SEC-002**
- Remaining npm audit items: **deferred to post-pilot**; **not** blocking PACK-006 closure or PACK-007 start
- HTML launcher: re-import when convenient (`launcherImportAt` may still be null)

## Pack ladder

| Pack | Status |
|---|---|
| PACK-001…005 | **COMPLETE** |
| PACK-006 | **COMPLETE** (pushed) — live provider config post-deploy; security FU-SEC-001/002 open |
| PACK-007 | **NOT_STARTED** |
| PACK-008 | **NOT_STARTED** |

## PACK-006 evidence (final closeout)

| Gate | Result |
|---|---|
| Technical quality gates | **PASS** |
| Live DB evidence | **PASS** — 11 / 1 skip / 0 fail |
| Synthetic UAT | **PASS** — 19/19 |
| Manual browser smoke | **PASS** — 30/30 · I. Dimitrov · 2026-08-05 |
| DS-005 | **APPROVED** |
| ASM-014 | Durations set; legal auto-purge validation follow-up |
| Git commit / push | **DONE** (`08acb65`) |
| npm audit safe fixes | **DONE** (`55eabf3`) — brace-expansion; remaining → FU-SEC-001/002 |

## Security follow-ups (deferred)

| ID | Summary | Priority | Blocks PACK-007? |
|---|---|---|---|
| FU-SEC-001 | Next.js 15→16 (postcss + sharp highs) | MEDIUM (before 50-disponent) | **No** |
| FU-SEC-002 | exceljs → uuid moderate | LOW | **No** |
| RSK-SEC-001 | Deferred npm audit residual | OPEN / MITIGATING | **No** |

## Next authorized action

1. Pilot / post-deploy: private bucket + migration on target env; configure Gemini/Groq/Qwen under DS-005 when ready.
2. PACK-007 may start when product authorizes (not blocked by FU-SEC-001/002).
3. Schedule FU-SEC-001 before 50-disponent rollout.

## Evidence pointers

- `sprints/sprint-006/CLOSEOUT-AUDIT.md`
- `sprints/sprint-006/SECURITY_OPERATIONS_READINESS_REPORT.md`
- `sprints/sprint-006/MANUAL-BROWSER-SMOKE-CHECKLIST.md`
- `planning/WORK-BACKLOG.md` (FU-SEC-001 / FU-SEC-002)
- `planning/RISKS.md` (RSK-SEC-001)
