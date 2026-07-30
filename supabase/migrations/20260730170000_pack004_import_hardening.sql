-- PACK-004: import hardening
-- - persistence_errors
-- - validation/persistence vocabulary alignment
-- - persist_assignment_import_row RPC
-- - begin_import_job_confirm search_path + admin assert
-- Forward-only. Rollback (design): drop new RPC; restore prior CAS from 20260730153000;
--   drop persistence_errors; reverse vocab mapping if needed.

-- ---------------------------------------------------------------------------
-- A. persistence_errors
-- ---------------------------------------------------------------------------

alter table public.import_job_rows
  add column if not exists persistence_errors jsonb not null default '[]'::jsonb;

comment on column public.import_job_rows.persistence_errors is
  'PACK-004 confirm-time persistence errors only; never overwrites validation_*';

-- ---------------------------------------------------------------------------
-- B. Vocabulary backfill then CHECK updates
-- ---------------------------------------------------------------------------

update public.import_job_rows
set validation_status = case
  when validation_status in ('OK', 'WARNING', 'NEW_MASTER') then 'valid'
  when validation_status in ('ERROR', 'CONFLICT') then 'invalid'
  else validation_status
end
where validation_status in ('OK', 'WARNING', 'NEW_MASTER', 'ERROR', 'CONFLICT');

update public.import_job_rows
set persistence_status = case
  when persistence_status = 'imported' then 'persisted'
  when persistence_status = 'not_attempted' then 'pending'
  else persistence_status
end
where persistence_status in ('imported', 'not_attempted');

alter table public.import_job_rows
  drop constraint if exists import_job_rows_validation_status_check;

alter table public.import_job_rows
  add constraint import_job_rows_validation_status_check
  check (validation_status = any (array['valid'::text, 'invalid'::text]));

alter table public.import_job_rows
  drop constraint if exists import_job_rows_persistence_status_check;

alter table public.import_job_rows
  add constraint import_job_rows_persistence_status_check
  check (
    persistence_status = any (
      array[
        'pending'::text,
        'persisted'::text,
        'skipped'::text,
        'failed'::text
      ]
    )
  );

-- ---------------------------------------------------------------------------
-- C. Harden begin_import_job_confirm
-- ---------------------------------------------------------------------------

create or replace function public.begin_import_job_confirm(p_job_id uuid, p_user_id uuid)
returns public.import_jobs
language plpgsql
security invoker
set search_path = public
as $$
declare
  job public.import_jobs;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

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

-- ---------------------------------------------------------------------------
-- D. persist_assignment_import_row
-- ---------------------------------------------------------------------------

create or replace function public.persist_assignment_import_row(
  p_job_id uuid,
  p_import_row_id uuid,
  p_create_missing_driver boolean default false,
  p_create_missing_customer boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_job public.import_jobs;
  v_row public.import_job_rows;
  v_payload jsonb;
  v_vehicle_id uuid;
  v_driver_id uuid;
  v_customer_id uuid;
  v_plate_norm text;
  v_driver_display text;
  v_driver_norm text;
  v_customer_display text;
  v_customer_norm text;
  v_valid_from date;
  v_valid_until date;
  v_notes text;
  v_needs_driver boolean;
  v_needs_customer boolean;
  v_assignment_id uuid;
  v_exact public.vehicle_assignments;
  v_vehicle public.vehicles;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'PERSISTENCE_FAILED',
      'error_message', 'Authentication required.'
    );
  end if;

  if not public.is_admin() then
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'PERSISTENCE_FAILED',
      'error_message', 'Admin role required.'
    );
  end if;

  select * into v_job
  from public.import_jobs
  where id = p_job_id
  for update;

  if not found then
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'IMPORT_ROW_NOT_FOUND',
      'error_message', 'Import job not found.'
    );
  end if;

  if v_job.status is distinct from 'confirming' then
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'IMPORT_JOB_NOT_CONFIRMING',
      'error_message', 'Import job is not in confirming state.'
    );
  end if;

  select * into v_row
  from public.import_job_rows
  where id = p_import_row_id
    and import_job_id = p_job_id
  for update;

  if not found then
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'IMPORT_ROW_NOT_FOUND',
      'error_message', 'Import row not found.'
    );
  end if;

  if v_row.validation_status is distinct from 'valid' then
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'PERSISTENCE_FAILED',
      'error_message', 'Invalid rows cannot be persisted.'
    );
  end if;

  if v_row.persistence_status in ('persisted', 'skipped') then
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', v_row.persistence_status,
      'assignment_id', v_row.assignment_id,
      'driver_id', v_row.driver_id,
      'customer_id', v_row.customer_id,
      'duplicate_skipped', v_row.persistence_status = 'skipped',
      'error_code', 'IMPORT_ROW_ALREADY_PROCESSED',
      'error_message', 'Row already processed.'
    );
  end if;

  v_payload := v_row.normalized_payload;
  v_plate_norm := coalesce(v_payload->>'registrationNormalized', '');
  v_driver_display := nullif(v_payload->>'driverDisplay', '');
  v_driver_norm := nullif(v_payload->>'driverNormalized', '');
  v_customer_display := nullif(v_payload->>'customerDisplay', '');
  v_customer_norm := nullif(v_payload->>'customerNormalized', '');
  v_notes := nullif(v_payload->>'notes', '');
  v_needs_driver := coalesce((v_payload->>'needsNewDriver')::boolean, false);
  v_needs_customer := coalesce((v_payload->>'needsNewCustomer')::boolean, false);

  begin
    v_valid_from := (v_payload->>'validFrom')::date;
  exception when others then
    update public.import_job_rows
    set
      persistence_status = 'failed',
      persistence_errors = jsonb_build_array(
        jsonb_build_object('code', 'PERSISTENCE_FAILED', 'message', 'Invalid valid-from date.')
      ),
      updated_at = now()
    where id = v_row.id;
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'PERSISTENCE_FAILED',
      'error_message', 'Invalid valid-from date.'
    );
  end;

  if v_payload ? 'validUntil' and nullif(v_payload->>'validUntil', '') is not null then
    begin
      v_valid_until := (v_payload->>'validUntil')::date;
    exception when others then
      update public.import_job_rows
      set
        persistence_status = 'failed',
        persistence_errors = jsonb_build_array(
          jsonb_build_object('code', 'PERSISTENCE_FAILED', 'message', 'Invalid valid-until date.')
        ),
        updated_at = now()
      where id = v_row.id;
      return jsonb_build_object(
        'row_id', p_import_row_id,
        'result_status', 'failed',
        'assignment_id', null,
        'driver_id', null,
        'customer_id', null,
        'duplicate_skipped', false,
        'error_code', 'PERSISTENCE_FAILED',
        'error_message', 'Invalid valid-until date.'
      );
    end;
  else
    v_valid_until := null;
  end if;

  -- Vehicle
  if nullif(v_payload->>'vehicleId', '') is not null then
    v_vehicle_id := (v_payload->>'vehicleId')::uuid;
  end if;

  if v_vehicle_id is null and v_plate_norm <> '' then
    select v.id into v_vehicle_id
    from public.vehicles v
    where upper(regexp_replace(v.registration_number, '[\s\-]+', '', 'g')) = v_plate_norm
    limit 1;
  end if;

  if v_vehicle_id is null then
    update public.import_job_rows
    set
      persistence_status = 'failed',
      persistence_errors = jsonb_build_array(
        jsonb_build_object('code', 'VEHICLE_NOT_FOUND', 'message', 'Vehicle not found.')
      ),
      updated_at = now()
    where id = v_row.id;
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'VEHICLE_NOT_FOUND',
      'error_message', 'Vehicle not found.'
    );
  end if;

  select * into v_vehicle from public.vehicles where id = v_vehicle_id;
  if not found or v_vehicle.active is not true then
    update public.import_job_rows
    set
      persistence_status = 'failed',
      persistence_errors = jsonb_build_array(
        jsonb_build_object('code', 'VEHICLE_INACTIVE', 'message', 'Vehicle is inactive.')
      ),
      updated_at = now()
    where id = v_row.id;
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'VEHICLE_INACTIVE',
      'error_message', 'Vehicle is inactive.'
    );
  end if;

  -- Resolve existing masters (lookups only; no creates yet)
  if nullif(v_payload->>'driverId', '') is not null then
    v_driver_id := (v_payload->>'driverId')::uuid;
  elsif v_row.driver_id is not null then
    v_driver_id := v_row.driver_id;
  elsif v_driver_norm is not null then
    select d.id into v_driver_id
    from public.drivers d
    where d.active
      and lower(regexp_replace(trim(d.full_name), '\s+', ' ', 'g')) = v_driver_norm
    limit 1;
  end if;

  if nullif(v_payload->>'customerId', '') is not null then
    v_customer_id := (v_payload->>'customerId')::uuid;
  elsif v_row.customer_id is not null then
    v_customer_id := v_row.customer_id;
  elsif v_customer_norm is not null then
    select c.id into v_customer_id
    from public.customers c
    where c.active
      and lower(regexp_replace(trim(c.name), '\s+', ' ', 'g')) = v_customer_norm
    limit 1;
  end if;

  if v_driver_id is null and v_needs_driver and not p_create_missing_driver then
    update public.import_job_rows
    set
      persistence_status = 'failed',
      persistence_errors = jsonb_build_array(
        jsonb_build_object('code', 'DRIVER_NOT_FOUND', 'message', 'Driver not found and create is disabled.')
      ),
      updated_at = now()
    where id = v_row.id;
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'DRIVER_NOT_FOUND',
      'error_message', 'Driver not found and create is disabled.'
    );
  end if;

  if v_customer_id is null and v_needs_customer and not p_create_missing_customer then
    update public.import_job_rows
    set
      persistence_status = 'failed',
      persistence_errors = jsonb_build_array(
        jsonb_build_object('code', 'CUSTOMER_NOT_FOUND', 'message', 'Customer not found and create is disabled.')
      ),
      updated_at = now()
    where id = v_row.id;
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'CUSTOMER_NOT_FOUND',
      'error_message', 'Customer not found and create is disabled.'
    );
  end if;

  if v_driver_id is null and not v_needs_driver and v_customer_id is null and not v_needs_customer then
    update public.import_job_rows
    set
      persistence_status = 'failed',
      persistence_errors = jsonb_build_array(
        jsonb_build_object('code', 'PERSISTENCE_FAILED', 'message', 'Driver or customer is required.')
      ),
      updated_at = now()
    where id = v_row.id;
    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'failed',
      'assignment_id', null,
      'driver_id', null,
      'customer_id', null,
      'duplicate_skipped', false,
      'error_code', 'PERSISTENCE_FAILED',
      'error_message', 'Driver or customer is required.'
    );
  end if;

  -- Mutable work: creates + insert + row update share one subtransaction.
  -- On failure, creates roll back; then we record a safe failed row status.
  begin
    if v_driver_id is null and v_needs_driver and p_create_missing_driver then
      insert into public.drivers (full_name, active)
      values (coalesce(v_driver_display, v_driver_norm), true)
      returning id into v_driver_id;
    end if;

    if v_customer_id is null and v_needs_customer and p_create_missing_customer then
      insert into public.customers (name, active)
      values (coalesce(v_customer_display, v_customer_norm), true)
      returning id into v_customer_id;
    end if;

    if v_driver_id is null and v_customer_id is null then
      raise exception 'MISSING_PARTY' using errcode = 'P0001';
    end if;

    select * into v_exact
    from public.vehicle_assignments a
    where a.vehicle_id = v_vehicle_id
      and a.valid_from = v_valid_from
      and a.valid_until is not distinct from v_valid_until
      and a.driver_id is not distinct from v_driver_id
      and a.customer_id is not distinct from v_customer_id
    limit 1;

    if found then
      update public.import_job_rows
      set
        persistence_status = 'skipped',
        persistence_errors = '[]'::jsonb,
        assignment_id = v_exact.id,
        driver_id = v_driver_id,
        customer_id = v_customer_id,
        persisted_at = now(),
        updated_at = now()
      where id = v_row.id;
      return jsonb_build_object(
        'row_id', p_import_row_id,
        'result_status', 'skipped',
        'assignment_id', v_exact.id,
        'driver_id', v_driver_id,
        'customer_id', v_customer_id,
        'duplicate_skipped', true,
        'error_code', 'EXACT_DUPLICATE',
        'error_message', 'Exact assignment already exists.'
      );
    end if;

    insert into public.vehicle_assignments (
      vehicle_id,
      driver_id,
      customer_id,
      valid_from,
      valid_until,
      source,
      notes,
      created_by
    ) values (
      v_vehicle_id,
      v_driver_id,
      v_customer_id,
      v_valid_from,
      v_valid_until,
      'excel_import',
      v_notes,
      auth.uid()
    )
    returning id into v_assignment_id;

    update public.import_job_rows
    set
      persistence_status = 'persisted',
      persistence_errors = '[]'::jsonb,
      assignment_id = v_assignment_id,
      driver_id = v_driver_id,
      customer_id = v_customer_id,
      persisted_at = now(),
      updated_at = now()
    where id = v_row.id;

    return jsonb_build_object(
      'row_id', p_import_row_id,
      'result_status', 'persisted',
      'assignment_id', v_assignment_id,
      'driver_id', v_driver_id,
      'customer_id', v_customer_id,
      'duplicate_skipped', false,
      'error_code', null,
      'error_message', null
    );
  exception
    when exclusion_violation then
      update public.import_job_rows
      set
        persistence_status = 'failed',
        persistence_errors = jsonb_build_array(
          jsonb_build_object(
            'code', 'ASSIGNMENT_OVERLAP',
            'message', 'Assignment period overlaps an existing assignment.'
          )
        ),
        updated_at = now()
      where id = v_row.id;
      return jsonb_build_object(
        'row_id', p_import_row_id,
        'result_status', 'failed',
        'assignment_id', null,
        'driver_id', null,
        'customer_id', null,
        'duplicate_skipped', false,
        'error_code', 'ASSIGNMENT_OVERLAP',
        'error_message', 'Assignment period overlaps an existing assignment.'
      );
    when others then
      update public.import_job_rows
      set
        persistence_status = 'failed',
        persistence_errors = jsonb_build_array(
          jsonb_build_object(
            'code', 'PERSISTENCE_FAILED',
            'message', 'Assignment could not be persisted.'
          )
        ),
        updated_at = now()
      where id = v_row.id;
      return jsonb_build_object(
        'row_id', p_import_row_id,
        'result_status', 'failed',
        'assignment_id', null,
        'driver_id', null,
        'customer_id', null,
        'duplicate_skipped', false,
        'error_code', 'PERSISTENCE_FAILED',
        'error_message', 'Assignment could not be persisted.'
      );
  end;
end;
$$;

revoke all on function public.persist_assignment_import_row(uuid, uuid, boolean, boolean) from public;
grant execute on function public.persist_assignment_import_row(uuid, uuid, boolean, boolean) to authenticated;
grant execute on function public.persist_assignment_import_row(uuid, uuid, boolean, boolean) to service_role;

comment on function public.persist_assignment_import_row(uuid, uuid, boolean, boolean) is
  'PACK-004 atomic per-row assignment import persistence; SECURITY INVOKER; admin required';
