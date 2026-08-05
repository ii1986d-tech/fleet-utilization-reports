-- Fix missing table privileges for settings / import masters.
-- RLS policies already exist; authenticated lacked SELECT/INSERT/UPDATE GRANTs
-- (permission denied for table customers on INSERT).
-- No DELETE for authenticated (soft-deactivate / no hard-delete pattern).
-- Does not modify RLS policies.

grant select, insert, update on table public.customers to authenticated;
grant select, insert, update on table public.vehicles to authenticated;
grant select, insert, update on table public.drivers to authenticated;
grant select, insert, update on table public.vehicle_assignments to authenticated;
grant select, insert, update on table public.utilization_settings to authenticated;

-- Import protocol tables: authenticated needs read/write for job lifecycle; no DELETE.
grant select, insert, update on table public.import_jobs to authenticated;

do $$
begin
  if to_regclass('public.import_job_rows') is not null then
    execute 'grant select, insert, update on table public.import_job_rows to authenticated';
  end if;
  if to_regclass('public.vehicle_assignment_daily_rows') is not null then
    execute 'grant select, insert, update on table public.vehicle_assignment_daily_rows to authenticated';
  end if;
end $$;

-- Service role: full DML for server-side/admin tooling (existing pattern).
grant select, insert, update, delete on table public.customers to service_role;
grant select, insert, update, delete on table public.vehicles to service_role;
grant select, insert, update, delete on table public.drivers to service_role;
grant select, insert, update, delete on table public.vehicle_assignments to service_role;
grant select, insert, update, delete on table public.utilization_settings to service_role;
grant select, insert, update, delete on table public.import_jobs to service_role;

do $$
begin
  if to_regclass('public.import_job_rows') is not null then
    execute 'grant select, insert, update, delete on table public.import_job_rows to service_role';
  end if;
  if to_regclass('public.vehicle_assignment_daily_rows') is not null then
    execute 'grant select, insert, update, delete on table public.vehicle_assignment_daily_rows to service_role';
  end if;
end $$;
