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

## Client rules

- Browser uses anon key only (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never prefix with `NEXT_PUBLIC_`.
