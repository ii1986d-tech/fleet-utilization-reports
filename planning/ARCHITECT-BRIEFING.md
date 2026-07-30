# Architect Briefing

> Updated 2026-07-30 — PACK-002 formally accepted with follow-ups

## Where things stand

**PACK_002_ACCEPTED_WITH_FOLLOW_UPS** · checkpoint proposal ready (**PACK_002_CHECKPOINT_READY**).

- Baseline: PACK-001 `20f2698`
- Review: `sprints/sprint-002/ARCHITECT-REVIEW.md`
- Acceptance: `sprints/sprint-002/ACCEPTANCE-RECORD.md`
- Builder: `sprints/sprint-002/BUILDER-REPORT.md`
- No commit created yet; PACK-003 **not** started

## Gates

`npm test` 20/20 · lint · build · `git diff --check` — all PASS

## Binding rules (unchanged)

ADR-005 mandatory GiST exclusion · ADR-006 no hard delete + in-place correction · admin-only writes · historical integrity

## Accepted follow-ups (must stay visible)

Tracked as RSK-012 and TASK-012…016 — not silently deferred into PACK-003:

1. Real Auth/JWT RLS automation
2. Parallel-client race harness
3. Live DB-bypass → 409 integration
4. End/deactivate preserve-row asserts
5. Correction `FOR UPDATE` hardening review
6. Local Docker — environment note only

## Next

Explicit human approval for checkpoint commit. Separate approval to start PACK-003.
