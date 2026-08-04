# Auth role claim path (PACK-001)

## Claim

- Path: `app_metadata.role`
- Allowed values: `admin` | `manager` | `viewer`
- Helper: `src/lib/auth/roles.ts`
- RLS helper SQL: `public.current_app_role()` in `supabase/migrations/20260729120100_rls_policies.sql`

## How to set (local / staging)

In Supabase Auth user metadata (service role / dashboard):

```json
{ "role": "manager" }
```

under **App Metadata** (not user_metadata).

## PACK-002 write matrix

| Role | Masters / assignments |
|---|---|
| admin | create, update, deactivate, end, in-place correct |
| manager | read only |
| viewer | read only |

## PACK-003 write matrix

| Role | Assignment Excel import |
|---|---|
| admin | upload, preview, confirm (create-masters **default OFF**), download error report |
| manager | no |
| viewer | no |

Existing `import_jobs_admin` RLS remains admin-only; do not widen.

Hard DELETE is not a product path (ADR-006). Import never auto-creates vehicles (ADR-007).

## PACK-006 matrix (Architect — **OQ-006-01 RESOLVED**; not yet applied in code)

| Role | PDF upload/extract | Edit fields/stops (Save) | Reorder stops | Confirm fields / missing / N/A | Progress **Weiter** | Read orders | Sensitive raw provider payloads |
|---|---|---|---|---|---|---|---|
| admin | yes | yes | yes | yes | yes when review complete | yes | yes (server-gated) |
| manager | yes | yes | yes | yes | yes when review complete | yes | no |
| viewer | no | no | no | no | no | yes | no |

### Binding notes

- AI extraction values are **suggestions** until field-level confirmation.  
- **No** Auth role `dispatcher`. UX “Disponent” = manager or admin performing dispatch work.  
- Introducing a dedicated dispatcher role requires a **separate** architecture decision / ADR.  
- Excel assignment import remains admin-only; do not widen `import_jobs` RLS.  
- AI provider calls server-only (`GEMINI_API_KEY` / `XAI_API_KEY`). Never `NEXT_PUBLIC_*` AI keys.  
- Mutating actions require aggregate `expected_version` (CAS); stale → `ORDER_VERSION_CONFLICT`.  
- Reorder changes `sequence` only; `stop_id` immutable.

## Client rules

- Browser uses anon key only (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never prefix with `NEXT_PUBLIC_`.
