-- FUR-001 PACK-001 RLS stubs
-- Role claim path: auth.jwt() -> 'app_metadata' ->> 'role'
-- Roles: admin | manager | viewer (ASM-003 single tenant)

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'manager');
$$;

create or replace function public.is_authenticated_role()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'manager', 'viewer');
$$;

alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.customers enable row level security;
alter table public.vehicle_assignments enable row level security;
alter table public.vehicle_daily_reports enable row level security;
alter table public.import_jobs enable row level security;
alter table public.sync_runs enable row level security;
alter table public.utilization_settings enable row level security;

-- Master data: all roles read; admin writes
create policy vehicles_select on public.vehicles for select using (public.is_authenticated_role());
create policy vehicles_write on public.vehicles for all using (public.is_admin()) with check (public.is_admin());

create policy drivers_select on public.drivers for select using (public.is_authenticated_role());
create policy drivers_write on public.drivers for all using (public.is_admin()) with check (public.is_admin());

create policy customers_select on public.customers for select using (public.is_authenticated_role());
create policy customers_write on public.customers for all using (public.is_admin()) with check (public.is_admin());

create policy assignments_select on public.vehicle_assignments for select using (public.is_authenticated_role());
create policy assignments_write on public.vehicle_assignments for all using (public.is_admin()) with check (public.is_admin());

-- Reports: all roles read; admin write/correct
create policy daily_reports_select on public.vehicle_daily_reports for select using (public.is_authenticated_role());
create policy daily_reports_write on public.vehicle_daily_reports for all using (public.is_admin()) with check (public.is_admin());

-- Settings: authenticated read; admin write
create policy settings_select on public.utilization_settings for select using (public.is_authenticated_role());
create policy settings_write on public.utilization_settings for all using (public.is_admin()) with check (public.is_admin());

-- Import / sync ops: admin only
create policy import_jobs_admin on public.import_jobs for all using (public.is_admin()) with check (public.is_admin());
create policy sync_runs_admin on public.sync_runs for all using (public.is_admin()) with check (public.is_admin());
create policy sync_runs_select_manager on public.sync_runs for select using (public.is_manager_or_admin());
