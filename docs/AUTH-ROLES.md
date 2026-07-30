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

## PACK-003 write matrix (Architect — Apply pending)

| Role | Assignment Excel import |
|---|---|
| admin | upload, preview, confirm (create-masters **default OFF**), download error report |
| manager | no |
| viewer | no |

Existing `import_jobs_admin` RLS remains admin-only; do not widen.

Hard DELETE is not a product path (ADR-006). Import never auto-creates vehicles (ADR-007).

## Client rules

- Browser uses anon key only (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never prefix with `NEXT_PUBLIC_`.
