-- PACK-003: import protocol (import_jobs extend + import_job_rows)
-- Rollback (forward-fix): drop import_job_rows; drop added columns/checks on import_jobs.

-- ---------------------------------------------------------------------------
-- A. Extend import_jobs
-- ---------------------------------------------------------------------------

alter table public.import_jobs
  add column if not exists source_filename text,
  add column if not exists source_file_size integer,
  add column if not exists source_sha256 text,
  add column if not exists worksheet_name text,
  add column if not exists skipped_rows integer not null default 0,
  add column if not exists persisted_rows integer not null default 0,
  add column if not exists failed_rows integer not null default 0,
  add column if not exists import_config_version text,
  add column if not exists options jsonb not null default '{}'::jsonb,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid,
  add column if not exists confirmation_started_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill from legacy columns for any existing rows
update public.import_jobs
set
  source_filename = coalesce(nullif(source_filename, ''), file_name, 'unknown'),
  source_file_size = coalesce(source_file_size, 0),
  source_sha256 = coalesce(nullif(source_sha256, ''), 'legacy-unhashed'),
  import_config_version = coalesce(nullif(import_config_version, ''), 'p003-v1'),
  updated_at = coalesce(updated_at, created_at, now());

alter table public.import_jobs
  alter column source_filename set not null,
  alter column source_file_size set not null,
  alter column source_sha256 set not null,
  alter column import_config_version set not null;

alter table public.import_jobs
  drop constraint if exists import_jobs_status_check;

alter table public.import_jobs
  add constraint import_jobs_status_check
  check (
    status = any (
      array[
        'uploaded'::text,
        'parsed'::text,
        'validated'::text,
        'confirming'::text,
        'completed'::text,
        'completed_with_errors'::text,
        'failed'::text
      ]
    )
  );

create index if not exists import_jobs_created_at_idx
  on public.import_jobs (created_at desc);

create index if not exists import_jobs_status_idx
  on public.import_jobs (status);

create index if not exists import_jobs_source_sha256_idx
  on public.import_jobs (source_sha256);

comment on table public.import_jobs is
  'PACK-003 Excel assignment import jobs; admin-only RLS';

-- ---------------------------------------------------------------------------
-- B. import_job_rows
-- ---------------------------------------------------------------------------

create table if not exists public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.import_jobs (id) on delete cascade,
  source_row_number integer not null,
  normalized_payload jsonb not null,
  validation_status text not null
    check (
      validation_status = any (
        array[
          'OK'::text,
          'WARNING'::text,
          'ERROR'::text,
          'CONFLICT'::text,
          'NEW_MASTER'::text
        ]
      )
    ),
  validation_errors jsonb not null default '[]'::jsonb,
  validation_warnings jsonb not null default '[]'::jsonb,
  duplicate_key text,
  persistence_status text not null default 'pending'
    check (
      persistence_status = any (
        array[
          'pending'::text,
          'imported'::text,
          'skipped'::text,
          'failed'::text,
          'not_attempted'::text
        ]
      )
    ),
  assignment_id uuid references public.vehicle_assignments (id) on delete set null,
  driver_id uuid references public.drivers (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  persisted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_job_id, source_row_number)
);

create index if not exists import_job_rows_job_validation_idx
  on public.import_job_rows (import_job_id, validation_status);

create index if not exists import_job_rows_duplicate_key_idx
  on public.import_job_rows (duplicate_key)
  where duplicate_key is not null;

alter table public.import_job_rows enable row level security;

drop policy if exists import_job_rows_admin on public.import_job_rows;
create policy import_job_rows_admin on public.import_job_rows
  for all
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.import_job_rows is
  'PACK-003 per-row preview + persistence audit; admin-only RLS';

-- ---------------------------------------------------------------------------
-- C. Atomic CAS helper: validated -> confirming
-- Returns the job row if CAS succeeded; empty if not.
-- ---------------------------------------------------------------------------

create or replace function public.begin_import_job_confirm(p_job_id uuid, p_user_id uuid)
returns public.import_jobs
language plpgsql
security invoker
as $$
declare
  job public.import_jobs;
begin
  update public.import_jobs
  set
    status = 'confirming',
    confirmation_started_at = now(),
    confirmed_by = p_user_id,
    updated_at = now()
  where id = p_job_id
    and status = 'validated'
  returning * into job;

  return job;
end;
$$;

revoke all on function public.begin_import_job_confirm(uuid, uuid) from public;
grant execute on function public.begin_import_job_confirm(uuid, uuid) to authenticated;
grant execute on function public.begin_import_job_confirm(uuid, uuid) to service_role;
