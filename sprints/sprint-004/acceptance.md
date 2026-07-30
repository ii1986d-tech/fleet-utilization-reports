# Acceptance — PACK-004 (corrected)

> Status: **PACK_004_ACCEPTED_WITH_FOLLOW_UPS**> Baseline: `a68d8f9` · ADR-008 implemented · Architect **ACCEPT_WITH_FOLLOW_UPS** · Focused §9 correction accepted> Formal acceptance: `ACCEPTANCE-RECORD.md` · Checkpoint: see `git log -1`

## Formal rule

PACK-004 **must not** be accepted on unit tests alone. FU items close **only with evidence**.

---

## Blockers

- [ ] Error-report download (FU-003-01) absent → fail
- [ ] Formula safety (`= + - @`) absent → fail
- [ ] Atomic `persist_assignment_import_row` absent → fail
- [ ] Orphan-master rollback not proven → fail
- [ ] persistence_errors still missing or validation_* overwritten → fail
- [ ] Raw SQL details exposed in audit/API/report → fail
- [ ] CAS search_path not hardened → fail
- [ ] Mandatory migration not Local==Remote / dry-run up to date → fail
- [ ] Admin auth or RLS weakened → fail
- [ ] FU-003-01 / 02 / 03 lacking required evidence → fail
- [ ] Double-confirm 409 `IMPORT_ALREADY_CONFIRMED` broken → fail
- [ ] Partial success / counters wrong → fail
- [ ] `npm test` / lint / build / `git diff --check` fail → fail
- [ ] FU IDs renumbered/removed → fail
- [ ] PACK-005 / Frotcom / reports dashboard started inside pack → fail

## Mandatory but externally dependent

- [ ] Live JWT RLS: admin allow; manager/viewer/unauth deny (masters, assignments, import_*, RPCs) — FU-002-01
- [ ] Best-effort multi-client CAS evidence — OQ-004-04
- [ ] FU-002-03 live/integration bypass → 409
- [ ] FU-002-04 end/deactivate preserve asserts
- [ ] FU-002-05 correction locking review completed

## Accepted residual (explicit sign-off)

- Concurrency harness unavailable after documented attempt (FU-002-02 / OQ-004-04)
- FU-002-06 local Docker env note

## Optional polish

- `buffer as any` removal- Stronger UI submit lock- Durable uploaded/parsed runtime transitions (OQ-004-03: **not required**)

---

## Mandatory test list (Apply)

### Error report

admin download · manager/viewer/unauth denied · invalid rows included · failed persist included · persisted excluded · deterministic columns · safe filename · formula prefixes `= + - @` · no raw SQL

### Atomic persistence

create OFF/ON · concurrent duplicate-master prevention · orphan driver/customer rollback · duplicate skip · overlap fail · success · row update atomic · validation_* preserved · persistence_errors separate · unknown → PERSISTENCE_FAILED · invalid cannot invoke RPC · already processed protected

### Confirmation

double-confirm 409 · best-effort concurrent CAS · partial success · counters · completed / completed_with_errors · successful rows not reprocessed

### Security / live

live admin/manager/viewer/unauth · RPC grants · import + master + assignment RLS

### Gates

tests · lint · build · git diff --check · migration local == remote · remote dry-run up to date

---

## Checklist before Apply

- [x] Dry-run complete (`BUILDER-DRY-RUN.md`)
- [x] OQ-004-01…04 resolved
- [x] ADR-008 corrected to design ACCEPTED
- [ ] Human approval of these corrections
- [ ] Explicit **Apply** authorization
