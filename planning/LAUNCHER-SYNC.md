# Project Launcher — Mandatory Synchronization Workflow

> Binding from **2026-08-05** for PACK-006 onward
> Reconciled **2026-08-06** (Mission Control HTML import recorded FRESH)
> Canonical SoT (agents): `planning/STATE.md` + `project-state.json`
> Supporting: `PACK-REGISTRY.md` · `WORK-BACKLOG.md` · `EXECUTION-STATE.json` · `ARCHITECT-BRIEFING.md`
> HTML launcher: `Project-Launcher-Professional-v4.4.1/01-Launcher/project-launcher-professional-v4.4.1.html` (localStorage; **not auto-live**)
> Package index / role: `planning/LAUNCHER-FOLDER-INDEX.md` (static method kit — **do not modify**; live SoT is repo root)

## Ownership (binding)

| Fact | Primary owner | Notes |
|---|---|---|
| Pack lifecycle | `planning/PACK-REGISTRY.md` + `planning/EXECUTION-STATE.json` | Must agree |
| Next action | `planning/STATE.md` | Briefing / PROJECT_CONTEXT only link here |
| Decisions (DS/ASM) | `planning/OPEN-DECISION-STOPS.md` | ASSUMPTIONS mirrors durations |
| ADR status | `architecture/ADR-*.md` + `architecture/DECISION-REGISTER.md` | `planning/DECISIONS.md` is mirror |
| Tasks | `planning/WORK-BACKLOG.md` | Does not override pack lifecycle |
| Machine import payload | `project-state.json` | HTML consumes this; never invent status here alone |
| Evidence verdict | Sprint closeout / ACCEPTANCE-RECORD | Required before pack **COMPLETE** |
| Session index | `PROJECT_CONTEXT.md` | **Index only** — not a status owner |

## Rule (hard)

**A pack may not be marked COMPLETE if the HTML launcher display and the canonical SoT disagree.**

Repository evidence beats stale launcher localStorage. Stale SoT beats chat memory.

### Standing operating rules (binding)

1. **Pack start:** Mission Control consistency check before implementation begins.
2. **Milestone end:** Mission Control synchronization (this document §C).
3. **HTML launcher:** presentation only — never a second source of truth.
4. **Canonical SoT:** `project-state.json` · `planning/STATE.md` · `EXECUTION-STATE.json` · `PACK-REGISTRY.md` · `WORK-BACKLOG.md` · `DECISIONS.md` (plus briefing / open stops when affected).
5. **COMPLETE** requires formal closeout/acceptance evidence. Code on master alone is not COMPLETE.
6. Do not set `launcherImportAt` unless a human HTML import/rescan actually occurred.

---

## A. Canonical pack lifecycle model

Use these states for Mission Control / EXECUTION-STATE `lifecycle` mapping.

| State | Meaning |
|---|---|
| `NOT_STARTED` | Pack exists in plan only |
| `ARCHITECTURE` | ADR / pack docs in progress or under review |
| `READY_FOR_APPLY` | Dry-run approved; human Apply authorization required |
| `IN_PROGRESS` | Builder Apply / implementation underway |
| `EVIDENCE_PENDING` | Code present; gates/evidence/UAT not yet green |
| `DECISION_REQUIRED` | Hard stop on DS/ASM/OQ |
| `CLOSEOUT_OPEN` | Implementation present; formal close / acceptance still open |
| `READY_FOR_STAGING` | Human authorized staging; SoT says ready |
| `COMMITTED` | Checkpoint commit exists on branch |
| `PUSHED` | Commit on tracking remote |
| `COMPLETE` | Formal acceptance recorded; SoT + launcher agree |
| `BLOCKED` | Cannot proceed until named blocker clears |

Allowed **status codes** (must map to a lifecycle state above):

| Status code | Maps to | Meaning |
|---|---|---|
| `IMPLEMENTED_PENDING_CLOSEOUT` | `CLOSEOUT_OPEN` | Code/migrations on branch; formal closeout missing |
| `IMPLEMENTED_PENDING_PILOT` | `PUSHED` | Shipped implementation; operational pilot/DoD still open |

### Current mapping (2026-08-06)

| Pack | Lifecycle | Status code |
|---|---|---|
| PACK-001…005 | `COMPLETE` | `PACK_00x_ACCEPTED…` |
| PACK-006 | `COMPLETE` | `PACK_006_COMPLETE` |
| PACK-007 | `CLOSEOUT_OPEN` | `IMPLEMENTED_PENDING_CLOSEOUT` |
| PACK-008 | `PUSHED` | `IMPLEMENTED_PENDING_PILOT` |

DS-005 **APPROVED**; ASM-014 durations **SET** (legal auto-purge follow-up). Gemini free-tier pilot **SUCCESS**. HEAD SoT refresh: `86bcf2f`. `launcherImportAt=2026-08-06T18:46:23.000Z` (**FRESH**; human HTML import visually verified).

---

## B. Missed launcher-process steps (historical)

| Missed step | Affected pack | Impact | Already repaired? | Remaining action |
|---|---|---|---|---|
| Continuous SoT update during Apply (status → IN_PROGRESS) | PACK-006 | Launcher showed Dry-Run / no code while impl existed | **Yes** (2026-08-05 Mission Control update) | Keep syncing after each milestone |
| Evidence update after DB suite / UAT | PACK-006 | UAT/DB results invisible in Mission Control | **Yes** | Re-import HTML after future runs |
| UAT-DEF / defect status update | PACK-006 | DEF-001 open in prose after fix | **Yes** | — |
| Active-pack update (`activePack`) | PACK-006 | EXECUTION stuck on PACK-005 complete | **Yes** | — |
| Next-action update | PACK-006 | Still said “authorize Apply / commit docs” | **Yes** → browser smoke | Execute browser smoke |
| Blocker refresh (Docker unavailable residual as current) | PACK-005→006 | Implied local evidence still blocked | **Partial** (current STATE fixed; PACK-005 GIT-CHECKPOINT left historical) | Optional hygiene only |
| HTML launcher re-import / workspace rescan | All | UI can lag SoT indefinitely | **Yes** (2026-08-06T18:46:23.000Z recorded) | Re-import after future SoT edits |
| Commit/push status for PACK-006 | PACK-006 | Historical row; 006 later committed/pushed | **Yes** (COMPLETE) | — |
| Post-006 pack ladder drift (007/008 code vs NOT_STARTED SoT) | PACK-007/008 | Split Mission Control | **Yes** (2026-08-06 reconciliation + HTML import) | Keep SoT/HTML aligned after milestones |
| Acceptance-record checkpoint sentence after later commit | PACK-002, PACK-003 | Docs say commit not created; commits exist | **No** (non-blocking) | Optional doc footnote |
| Freshness / stale warning | All | No visible SoT vs import mismatch | **Yes** (fields + this doc) | Fill `launcherImportAt` on import |
| Status update after v1.0.0 tag in EXECUTION | PACK-005 | EXECUTION focused on pack accept; tag exists | **Partial** | Tag noted in STATE / backfill |

---

## C. Mandatory synchronization sequence

After **any** of: architecture approval · Builder Apply · code review · test pass/fail · evidence pass/fail · UAT pass/fail · human decision · commit · push · pack closure:

1. **Update canonical SoT** — at least `planning/STATE.md`; also `PACK-REGISTRY.md` / `WORK-BACKLOG.md` / `ARCHITECT-BRIEFING.md` / `DECISIONS.md` when pack status or tasks change.
2. **Update `project-state.json`** — `meta.updatedAt`, `status` / `statusHistory`, tasks, `quality.evidence`, `operations.techDebt`, `launcherFreshness`.
3. **Validate JSON** — `node -e "JSON.parse(...)"` on `project-state.json` and `EXECUTION-STATE.json`.
4. **Update `planning/EXECUTION-STATE.json`** — `activePack`, `packStatus`, evidence counts, blockers, `nextRecommendedAction`, freshness.
5. **Import or rescan launcher** — import `project-state.json` into HTML Mission Control **or** connect workspace and rescan.
6. **Visually verify** displayed status, blockers, next action, pack ladder.
7. **Record synchronization** — set `launcherFreshness.launcherImportAt` (ISO) and confirm `sourceCommitHash` / dirty-tree flag.
8. **Only then** proceed to the next pack milestone or mark COMPLETE.

### Completeness gate

Marking `COMPLETE` requires:

- acceptance evidence in sprint docs
- SoT status = complete
- `project-state.json` agrees
- HTML launcher agrees after import/scan
- freshness: `launcherImportAt >= sotUpdatedAt` (or explicit documented override)

---

## D. Freshness control (minimal)

Stored in `project-state.json` → `launcherFreshness` and mirrored in `EXECUTION-STATE.json` → `freshness`:

| Field | Meaning |
|---|---|
| `sotUpdatedAt` | Last canonical SoT edit (ISO) |
| `launcherImportAt` | Last successful HTML import/scan (ISO); `null` = never recorded |
| `sourceCommitHash` | `git rev-parse --short HEAD` at SoT update |
| `workingTreeDirty` | `true` if uncommitted pack work exists |
| `staleWarning` | Human-readable warning when import missing or older than SoT |

**Stale when:** `launcherImportAt` is null **or** `launcherImportAt < sotUpdatedAt`.

HTML dashboard already shows `meta.updatedAt` after import; operators must re-import after SoT edits. No large Mission Control rewrite in this task.

---

## E. Event → SoT checklist (quick)

| Event | Minimum SoT touch |
|---|---|
| Architecture approval | STATE, DECISIONS, PACK-REGISTRY, ARCHITECT-BRIEFING, project-state history |
| Builder Apply start | STATE activePack=IN_PROGRESS; EXECUTION; tasks |
| Review result | ARCHITECT-BRIEFING / review path; blockers |
| Tests pass/fail | EXECUTION gates; STATE evidence table |
| Evidence / UAT | EXECUTION evidence; STATE; RESULTS pointers |
| Human decision (DS/ASM) | OPEN-DECISION-STOPS; ASSUMPTIONS; STATE blockers |
| Commit | STATE/EXECUTION COMMITTED + hash; GIT-CHECKPOINT |
| Push | EXECUTION PUSHED; remote tracking note |
| Pack closure | COMPLETE only after sync sequence + launcher verify |

---

## F. Updates: automatic or manual?

**Manual.** The HTML launcher does not watch the filesystem. Agents/humans update SoT files; humans re-import or rescan. Future automation is out of scope unless explicitly approved.

## G. Recommended operating model (post second-folder audit)

**Option A — Launcher presentation only (selected).**

- Truth: root `project-state.json` + `planning/STATE.md` (+ registry/backlog/execution).
- `Project-Launcher-Professional-v4.4.1/` stays a static vendor kit; HTML is optional human UI.
- After milestones: SoT update → JSON validate → human HTML import → set `launcherImportAt`.
- Do not duplicate live state into `03-Blank-Project/` or rewrite the HTML app.
