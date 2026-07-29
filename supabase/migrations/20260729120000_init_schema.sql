-- FUR-001 PACK-001 initial schema
-- Source: data/DATA-MODEL.md
-- Forward-only; rollback = drop schema objects / reset local DB

create extension if not exists "pgcrypto";

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  external_frotcom_id text,
  registration_number text not null,
  display_name text not null,
  vehicle_type text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index vehicles_registration_number_uidx on public.vehicles (registration_number);
create unique index vehicles_external_frotcom_id_uidx on public.vehicles (external_frotcom_id) where external_frotcom_id is not null;
create index vehicles_active_idx on public.vehicles (active) where active = true;

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  external_frotcom_id text,
  full_name text not null,
  employee_number text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index drivers_external_frotcom_id_uidx on public.drivers (external_frotcom_id) where external_frotcom_id is not null;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  external_reference text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  driver_id uuid references public.drivers (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  valid_from date not null,
  valid_until date,
  source text not null check (source in ('manual', 'excel_import', 'system')),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_assignments_valid_range check (valid_until is null or valid_until >= valid_from)
);

create index vehicle_assignments_vehicle_id_idx on public.vehicle_assignments (vehicle_id);
create index vehicle_assignments_valid_from_idx on public.vehicle_assignments (valid_from);

create table public.vehicle_daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  actual_driver_id uuid references public.drivers (id) on delete set null,
  assigned_driver_id uuid references public.drivers (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  start_location_text text,
  end_location_text text,
  start_latitude double precision,
  start_longitude double precision,
  end_latitude double precision,
  end_longitude double precision,
  distance_km numeric(12, 2) not null default 0,
  driving_seconds integer not null default 0,
  driver_driving_seconds integer,
  standing_seconds integer not null default 0,
  idle_seconds integer,
  operation_window_seconds integer not null default 0,
  utilization_status text not null,
  source_type text not null default 'mock',
  source_reference text,
  data_quality_status text not null check (
    data_quality_status in ('complete', 'partial', 'missing', 'suspicious', 'manually_corrected')
  ),
  sync_status text not null default 'pending',
  synchronized_at timestamptz,
  raw_payload_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_daily_reports_vehicle_date_uidx unique (vehicle_id, report_date)
);

create index vehicle_daily_reports_report_date_idx on public.vehicle_daily_reports (report_date);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  status text not null,
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  imported_rows integer not null default 0,
  error_report_reference text,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  report_date date not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  records_received integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_failed integer not null default 0,
  error_summary text,
  retry_count integer not null default 0
);

create table public.utilization_settings (
  id uuid primary key default gen_random_uuid(),
  minimum_target_driving_seconds integer not null default 32400,
  warning_target_driving_seconds integer not null default 25200,
  business_timezone text not null default 'Europe/Berlin',
  report_generation_time time not null default time '05:30',
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.utilization_settings (
  minimum_target_driving_seconds,
  warning_target_driving_seconds,
  business_timezone
) values (32400, 25200, 'Europe/Berlin');
