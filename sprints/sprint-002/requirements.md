# Sprint 002 Requirements — PACK-002 Phase 2 Assignments

> Updated 2026-07-30 after dry-run corrections

## Smallest testable outcome

Admins maintain masters (no hard delete) and assignments (create / in-place correct / end) with mandatory DB+app overlap rejection (409 `ASSIGNMENT_OVERLAP`); non-admins read-only.

## In scope

- TASK-007 + supporting master CRUD
- ADR-005 (mandatory exclusion), ADR-006 (lifecycle + in-place correction)
- Full detail: `PACK-002.md`

## Out of scope

- Excel import (PACK-003)
- Hard DELETE product APIs
- Close+create as the correction method
- Manager write elevation
- Daily reports / live Frotcom
