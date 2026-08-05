# ASM-014 — Retention duration decision template

> Status: **DURATION SET (pragmatic defaults) / ACCEPTED (security behavior)**
> Purpose: Capture retention durations for PACK-006 artifacts.
> Related: ASM-014 · ADR-009 §24 · OQ-006-03 · OQ-006-08 · AC-006-75…76
> Security behavior binding: private Storage; no public URLs; deletion/expiry must be auditable.
> **Legal validation:** REQUIRED before enabling **production auto-purge** (documented follow-up; non-blocking for PACK-006 staging).

## Decision header

| Field | Value |
|---|---|
| Assumption / decision ID | ASM-014 |
| Title | Transport-order PDF, snapshot, order, and audit retention |
| Duration status | **SET (pragmatic defaults — 2026-08-05)** |
| Security behavior status | ACCEPTED (private Storage + audited delete/expire) |
| Responsible decision owner | I. Dimitrov (product) + Legal (validation follow-up) |
| Legal/compliance validation | **Required before production auto-purge** (follow-up) |
| Approval date | 2026-08-05 (pragmatic defaults) |

## Scope of artifacts

| Artifact | Description |
|---|---|
| Source PDF | Original uploaded transport-order document in private Storage |
| Extraction snapshot | Immutable AI extraction snapshot (`transport_order_extracted_snapshots`) |
| Reviewed working order | Confirmed/edited aggregate (`transport_orders` + stops/legs/positions/reviews) |
| Audit events | `transport_order_field_review_events` (and related upload/extraction audits) |
| Provider-side copies | Governed by DS-005 / provider Standard Terms |

## 1. Source PDF retention

| Field | Value |
|---|---|
| Retain after successful review? | Yes |
| Retain if review never completed? | Yes (until expire/hold rules apply) |
| Retention duration | **7 years** |
| Storage location | Private Supabase Storage bucket (binding) |
| Encryption / access | Server-authorized / signed access only (binding) |
| Auto-expire job required? | **YES (yearly)** |
| Evidence of deletion required? | Yes (audited delete/expire) |

## 2. Extraction snapshot retention

| Field | Value |
|---|---|
| Retain independently of working-order edits? | Yes (content immutability binding) |
| Retention duration | **7 years** |
| May snapshot be deleted while order retained? | Prefer aligned expiry with order unless legal hold |
| May snapshot outlive source PDF? | Prefer aligned 7-year window unless legal hold |

## 3. Reviewed order retention

| Field | Value |
|---|---|
| Operational order retention duration | **7 years** |
| Soft-delete vs hard-delete | Soft/hold-aware until purge job; hard delete only via audited expire |
| Relationship to PACK-007/008 downstream use | Downstream packs consume reviewed data within retention window |
| Anonymization alternative to deletion | TBD with Legal if required later |

## 4. Audit-event retention

| Field | Value |
|---|---|
| Audit retention duration | **10 years** |
| Minimum audit retention vs order retention | Audits **≥** order (10y > 7y) |
| Tamper-evidence / append-only expectation | Append-only events; purge only via audited expire after retention |
| Export of audit for legal hold | Supported via legal-hold behavior below |

## 5. Deletion workflow

| Step | Owner | Notes |
|---|---|---|
| Trigger (time-based / request / account closure) | Ops + Legal | Yearly auto-expire job; legal hold suspends |
| Delete Storage object | Engineering / ops | Must not leave public URL |
| Delete or anonymize DB rows | Engineering / ops | Respect FK/immutability rules |
| Write deletion / expiry audit event | Engineering / ops | Binding |
| Confirm provider-side deletion (if sent) | Ops | Per DS-005 / Standard Terms |
| Operator runbook location | TBD post-commit ops | |

**Legal/compliance validation:** **Required before enabling automated purge in production** (follow-up; non-blocking for PACK-006 staging/commit).

## 6. Legal-hold behavior

| Field | Value |
|---|---|
| Legal hold suspends deletion? | **YES** |
| Who can place / release hold | Product owner + Legal |
| Hold recorded in audit? | Yes (required when implemented) |
| Interaction with provider retention | Per DS-005 Standard Terms |

## 7. Backup deletion expectations

| Field | Value |
|---|---|
| Backups contain PDFs / snapshots / audits? | Assume yes until infra inventory says otherwise |
| Backup purge lag after primary delete | **30 days** |
| Backup access controls | Same as production sensitivity |
| Responsibility | Ops / infra under product owner |

## 8. Responsible decision owner

| Role | Name | Accountability |
|---|---|---|
| Legal / compliance | Legal (validation follow-up) | Confirm pragmatic defaults before production auto-purge |
| Product owner | **I. Dimitrov** | Pragmatic defaults set 2026-08-05 |
| Engineering / ops | Engineering | Implement yearly expire + hold after legal OK for auto-purge |
| Security | Security/ops | Access, private Storage, logging |

## Explicit decision statement

**ASM-014 durations are SET (pragmatic defaults, 2026-08-05):** PDF/snapshot/order **7 years**; audit **10 years**; yearly auto-expire **YES**; legal hold **YES**; backup purge lag **30 days**.
**Legal validation before production auto-purge** remains a documented **non-blocking follow-up** (PACK-006 COMPLETE; does not block PACK-007 start).
