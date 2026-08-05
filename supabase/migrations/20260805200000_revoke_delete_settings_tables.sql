-- Soft-delete-only: authenticated must not hard-delete settings / import masters.
-- service_role retains DELETE for internal/admin tooling.
-- Does not modify SELECT/INSERT/UPDATE or RLS policies.

revoke delete on table public.customers from authenticated;
revoke delete on table public.vehicles from authenticated;
revoke delete on table public.drivers from authenticated;
revoke delete on table public.vehicle_assignments from authenticated;
revoke delete on table public.utilization_settings from authenticated;
revoke delete on table public.import_jobs from authenticated;
