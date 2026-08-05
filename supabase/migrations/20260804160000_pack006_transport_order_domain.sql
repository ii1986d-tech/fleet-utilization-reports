-- PACK-006 transport-order domain (persistence remediation)
-- ADR-009 ACCEPTED. Live Gemini/xAI blocked by DS-005.
-- Forward-only. SECURITY DEFINER mutators: search_path pinned; role from JWT.

-- ---------------------------------------------------------------------------
-- Private Storage bucket (fail-closed if absent at runtime)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transport-order-pdfs',
  'transport-order-pdfs',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.transport_order_documents (
  id uuid primary key default gen_random_uuid(),
  sha256_hex text not null,
  storage_key text not null unique,
  sanitized_filename text not null,
  size_bytes integer not null check (size_bytes > 0),
  upload_idempotency_key text not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table public.transport_order_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.transport_order_documents(id) on delete cascade,
  idempotency_key text not null unique,
  request_hash text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  terminal boolean not null default false,
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null,
  safe_error text,
  order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transport_orders (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.transport_order_documents(id) on delete restrict,
  extraction_run_id uuid references public.transport_order_extraction_runs(id) on delete set null,
  version integer not null default 1 check (version >= 1),
  tour_number text,
  bordero_number text,
  business_identifier text,
  reference_numbers jsonb not null default '[]'::jsonb,
  responsible_clerk text,
  remarks text,
  freight_amount numeric check (freight_amount is null or freight_amount >= 0),
  freight_currency text,
  paid_kilometers numeric check (paid_kilometers is null or paid_kilometers >= 0),
  empty_kilometers numeric check (empty_kilometers is null or empty_kilometers >= 0),
  truck_license_plate text,
  trailer_license_plate text,
  cargo_weight_kg numeric check (cargo_weight_kg is null or cargo_weight_kg >= 0),
  cargo_loading_meters numeric check (cargo_loading_meters is null or cargo_loading_meters >= 0),
  cargo_volume_m3 numeric check (cargo_volume_m3 is null or cargo_volume_m3 >= 0),
  cargo_description text,
  maps_static_url text,
  stop_order_review_status text not null default 'pending_review'
    check (stop_order_review_status in (
      'pending_review','edited_pending_review','confirmed','missing_confirmed',
      'not_applicable','conflict','extraction_failed'
    )),
  review_completed_at timestamptz,
  completion_idempotency_key text unique,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transport_order_extraction_runs
  add constraint transport_order_extraction_runs_order_fk
  foreign key (order_id) references public.transport_orders(id) on delete set null;

-- Canonical immutable snapshot table name (single spelling everywhere)
create table public.transport_order_extracted_snapshots (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.transport_orders(id) on delete cascade,
  extraction_run_id uuid not null references public.transport_order_extraction_runs(id) on delete restrict,
  document_id uuid not null references public.transport_order_documents(id) on delete restrict,
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null,
  normalized_payload jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.forbid_transport_order_snapshot_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'IMMUTABLE_EXTRACTION_SNAPSHOT' using errcode = 'P0001';
end;
$$;

create trigger trg_transport_order_snapshot_no_update
  before update or delete on public.transport_order_extracted_snapshots
  for each row execute function public.forbid_transport_order_snapshot_mutation();

create table public.transport_order_stops (
  stop_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.transport_orders(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  stop_type text not null check (stop_type in ('pickup', 'delivery', 'other')),
  company text,
  street text,
  house_number text,
  postal_code text,
  city text,
  country text,
  raw_address_text text,
  stop_date text,
  time_window text,
  ref_values jsonb not null default '[]'::jsonb,
  remarks text,
  constraint transport_order_stops_order_sequence_uq unique (order_id, sequence) deferrable initially deferred
);

create table public.transport_order_partial_load_positions (
  position_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.transport_orders(id) on delete cascade,
  position_number integer,
  pickup_stop_id uuid not null references public.transport_order_stops(stop_id) on delete restrict,
  delivery_stop_id uuid not null references public.transport_order_stops(stop_id) on delete restrict,
  ref_values jsonb not null default '[]'::jsonb,
  weight_kg numeric check (weight_kg is null or weight_kg >= 0),
  loading_meters numeric check (loading_meters is null or loading_meters >= 0),
  volume_m3 numeric check (volume_m3 is null or volume_m3 >= 0)
);

create table public.transport_order_legs (
  leg_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.transport_orders(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  origin_stop_id uuid not null references public.transport_order_stops(stop_id) on delete restrict,
  destination_stop_id uuid not null references public.transport_order_stops(stop_id) on delete restrict,
  ref_values jsonb not null default '[]'::jsonb,
  distance_km numeric check (distance_km is null or distance_km >= 0),
  constraint transport_order_legs_order_sequence_uq unique (order_id, sequence) deferrable initially deferred
);

create table public.transport_order_field_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.transport_orders(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'order','stop','partial_load_position','transport_leg','stop_order'
  )),
  entity_id uuid not null,
  field_name text not null,
  extracted_value jsonb,
  current_value jsonb,
  review_status text not null check (review_status in (
    'pending_review','edited_pending_review','confirmed','missing_confirmed',
    'not_applicable','conflict','extraction_failed'
  )),
  extraction_confidence numeric,
  source_page integer,
  source_snippet text,
  provider text,
  model text,
  extraction_run_id uuid references public.transport_order_extraction_runs(id) on delete set null,
  edited_by uuid,
  edited_at timestamptz,
  confirmed_by uuid,
  confirmed_at timestamptz,
  note text,
  unique (order_id, entity_type, entity_id, field_name)
);

create table public.transport_order_field_review_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.transport_orders(id) on delete cascade,
  action text not null,
  actor_id uuid,
  actor_role text,
  occurred_at timestamptz not null default now(),
  version_before integer,
  version_after integer,
  entity_type text,
  entity_id uuid,
  field_name text,
  old_value jsonb,
  new_value jsonb,
  reason_code text,
  provider text,
  model text,
  prompt_version text,
  schema_version text
);

create index transport_order_events_order_idx
  on public.transport_order_field_review_events (order_id, occurred_at);

create index transport_order_stops_order_idx
  on public.transport_order_stops (order_id);

-- ---------------------------------------------------------------------------
-- RLS — reads for authenticated roles; invariant writes only via DEFINER RPCs
-- ---------------------------------------------------------------------------

alter table public.transport_order_documents enable row level security;
alter table public.transport_order_extraction_runs enable row level security;
alter table public.transport_orders enable row level security;
alter table public.transport_order_extracted_snapshots enable row level security;
alter table public.transport_order_stops enable row level security;
alter table public.transport_order_partial_load_positions enable row level security;
alter table public.transport_order_legs enable row level security;
alter table public.transport_order_field_reviews enable row level security;
alter table public.transport_order_field_review_events enable row level security;

create policy tod_select on public.transport_order_documents
  for select using (public.is_authenticated_role());
create policy ter_select on public.transport_order_extraction_runs
  for select using (public.is_authenticated_role());
create policy to_select on public.transport_orders
  for select using (public.is_authenticated_role());
create policy tos_select on public.transport_order_extracted_snapshots
  for select using (public.is_authenticated_role());
create policy stops_select on public.transport_order_stops
  for select using (public.is_authenticated_role());
create policy plp_select on public.transport_order_partial_load_positions
  for select using (public.is_authenticated_role());
create policy legs_select on public.transport_order_legs
  for select using (public.is_authenticated_role());
create policy fr_select on public.transport_order_field_reviews
  for select using (public.is_authenticated_role());
create policy fre_select on public.transport_order_field_review_events
  for select using (public.is_authenticated_role());

-- No direct INSERT/UPDATE/DELETE policies for authenticated — mutations via RPCs.

-- ---------------------------------------------------------------------------
-- Auth helpers + audit helper
-- ---------------------------------------------------------------------------

create or replace function public.transport_order_assert_manager_or_admin()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  if not public.is_manager_or_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.transport_order_insert_audit(
  p_order_id uuid,
  p_action text,
  p_version_before integer,
  p_version_after integer,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_field_name text default null,
  p_old_value jsonb default null,
  p_new_value jsonb default null,
  p_reason_code text default null,
  p_provider text default null,
  p_model text default null,
  p_prompt_version text default null,
  p_schema_version text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.transport_order_field_review_events (
    order_id, action, actor_id, actor_role, version_before, version_after,
    entity_type, entity_id, field_name, old_value, new_value, reason_code,
    provider, model, prompt_version, schema_version
  ) values (
    p_order_id, p_action, auth.uid(), public.current_app_role(),
    p_version_before, p_version_after,
    p_entity_type, p_entity_id, p_field_name, p_old_value, p_new_value, p_reason_code,
    p_provider, p_model, p_prompt_version, p_schema_version
  );
end;
$$;

create or replace function public.transport_order_cas_bump(
  p_order_id uuid,
  p_expected_version integer
)
returns public.transport_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.transport_orders;
begin
  perform public.transport_order_assert_manager_or_admin();

  update public.transport_orders
  set
    version = version + 1,
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_order_id
    and version = p_expected_version
  returning * into row;

  if row.id is null then
    raise exception 'ORDER_VERSION_CONFLICT' using errcode = 'P0001';
  end if;
  return row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Upload registration (DB metadata; Storage upload is server-side)
-- ---------------------------------------------------------------------------

create or replace function public.register_transport_order_upload(
  p_idempotency_key text,
  p_sha256_hex text,
  p_storage_key text,
  p_sanitized_filename text,
  p_size_bytes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.transport_order_documents;
  created public.transport_order_documents;
begin
  perform public.transport_order_assert_manager_or_admin();

  select * into existing
  from public.transport_order_documents
  where upload_idempotency_key = p_idempotency_key;

  if found then
    if existing.sha256_hex is distinct from p_sha256_hex then
      raise exception 'IDEMPOTENCY_KEY_REUSE_MISMATCH' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'document_id', existing.id,
      'storage_key', existing.storage_key,
      'reused', true
    );
  end if;

  insert into public.transport_order_documents (
    sha256_hex, storage_key, sanitized_filename, size_bytes,
    upload_idempotency_key, created_by
  ) values (
    p_sha256_hex, p_storage_key, p_sanitized_filename, p_size_bytes,
    p_idempotency_key, auth.uid()
  )
  returning * into created;

  return jsonb_build_object(
    'document_id', created.id,
    'storage_key', created.storage_key,
    'reused', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Persist extraction materialization (idempotent)
-- ---------------------------------------------------------------------------

create or replace function public.persist_transport_order_extraction(
  p_document_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_schema_version text,
  p_working_order jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.transport_order_extraction_runs;
  v_run_exists boolean := false;
  v_run_id uuid;
  v_order_id uuid;
  v_snapshot_id uuid;
  v_stop_item jsonb;
  v_pos_item jsonb;
  v_leg_item jsonb;
  v_fr_item jsonb;
  v_header jsonb;
begin
  perform public.transport_order_assert_manager_or_admin();

  if not exists (
    select 1 from public.transport_order_documents d where d.id = p_document_id
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  select r.* into v_existing
  from public.transport_order_extraction_runs r
  where r.idempotency_key = p_idempotency_key;

  v_run_exists := found;

  if v_run_exists then
    if v_existing.request_hash is distinct from p_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSE_MISMATCH' using errcode = 'P0001';
    end if;
    if v_existing.status = 'completed' and v_existing.order_id is not null then
      return jsonb_build_object('order_id', v_existing.order_id, 'reused', true);
    end if;
    if v_existing.terminal and v_existing.status = 'failed' then
      raise exception 'EXTRACTION_FAILED' using errcode = 'P0001';
    end if;
  end if;

  v_header := p_working_order -> 'header';
  v_order_id := coalesce((v_header ->> 'orderId')::uuid, gen_random_uuid());
  v_snapshot_id := coalesce(
    (p_working_order -> 'snapshot' ->> 'extractionId')::uuid,
    gen_random_uuid()
  );
  v_run_id := coalesce(v_existing.id, gen_random_uuid());

  if not v_run_exists then
    insert into public.transport_order_extraction_runs as r (
      id, document_id, idempotency_key, request_hash, status, attempts, terminal,
      provider, model, prompt_version, schema_version
    ) values (
      v_run_id, p_document_id, p_idempotency_key, p_request_hash, 'running', 1, false,
      p_provider, p_model, p_prompt_version, p_schema_version
    );
  else
    update public.transport_order_extraction_runs as r
    set
      status = 'running',
      attempts = r.attempts + 1,
      updated_at = now(),
      provider = p_provider,
      model = p_model,
      prompt_version = p_prompt_version,
      schema_version = p_schema_version
    where r.id = v_existing.id;
    v_run_id := v_existing.id;
  end if;

  insert into public.transport_orders as o (
    id, document_id, extraction_run_id, version,
    tour_number, bordero_number, business_identifier, reference_numbers,
    responsible_clerk, remarks, freight_amount, freight_currency,
    paid_kilometers, empty_kilometers, truck_license_plate, trailer_license_plate,
    cargo_weight_kg, cargo_loading_meters, cargo_volume_m3, cargo_description,
    maps_static_url, stop_order_review_status, updated_by
  ) values (
    v_order_id, p_document_id, v_run_id, 1,
    v_header ->> 'tourNumber',
    v_header ->> 'borderoNumber',
    v_header ->> 'businessIdentifier',
    coalesce(v_header -> 'referenceNumbers', '[]'::jsonb),
    v_header ->> 'responsibleClerk',
    v_header ->> 'remarks',
    nullif(v_header -> 'freight' ->> 'amount', '')::numeric,
    v_header -> 'freight' ->> 'currency',
    nullif(v_header ->> 'paidKilometers', '')::numeric,
    nullif(v_header ->> 'emptyKilometers', '')::numeric,
    v_header ->> 'truckLicensePlate',
    v_header ->> 'trailerLicensePlate',
    nullif(v_header ->> 'cargoWeightKg', '')::numeric,
    nullif(v_header ->> 'cargoLoadingMeters', '')::numeric,
    nullif(v_header ->> 'cargoVolumeM3', '')::numeric,
    v_header ->> 'cargoDescription',
    v_header ->> 'mapsStaticUrl',
    coalesce(v_header ->> 'stopOrderReviewStatus', 'pending_review'),
    auth.uid()
  );

  insert into public.transport_order_extracted_snapshots as s (
    id, order_id, extraction_run_id, document_id,
    provider, model, prompt_version, schema_version, normalized_payload
  ) values (
    v_snapshot_id, v_order_id, v_run_id, p_document_id,
    p_provider, p_model, p_prompt_version, p_schema_version,
    coalesce(p_working_order -> 'snapshot' -> 'normalizedPayload', p_working_order)
  );

  for v_stop_item in
    select value
    from jsonb_array_elements(coalesce(p_working_order -> 'stops', '[]'::jsonb)) as t(value)
  loop
    insert into public.transport_order_stops as st (
      stop_id, order_id, sequence, stop_type,
      company, street, house_number, postal_code, city, country, raw_address_text,
      stop_date, time_window, ref_values, remarks
    ) values (
      (v_stop_item ->> 'stopId')::uuid,
      v_order_id,
      (v_stop_item ->> 'sequence')::integer,
      v_stop_item ->> 'type',
      v_stop_item -> 'address' ->> 'company',
      v_stop_item -> 'address' ->> 'street',
      v_stop_item -> 'address' ->> 'houseNumber',
      v_stop_item -> 'address' ->> 'postalCode',
      v_stop_item -> 'address' ->> 'city',
      v_stop_item -> 'address' ->> 'country',
      v_stop_item -> 'address' ->> 'rawAddressText',
      v_stop_item ->> 'date',
      v_stop_item ->> 'timeWindow',
      coalesce(v_stop_item -> 'references', '[]'::jsonb),
      v_stop_item ->> 'remarks'
    );
  end loop;

  for v_pos_item in
    select value
    from jsonb_array_elements(coalesce(p_working_order -> 'partialLoadPositions', '[]'::jsonb)) as t(value)
  loop
    insert into public.transport_order_partial_load_positions as pl (
      position_id, order_id, position_number, pickup_stop_id, delivery_stop_id,
      ref_values, weight_kg, loading_meters, volume_m3
    ) values (
      (v_pos_item ->> 'positionId')::uuid,
      v_order_id,
      nullif(v_pos_item ->> 'positionNumber', '')::integer,
      (v_pos_item ->> 'pickupStopId')::uuid,
      (v_pos_item ->> 'deliveryStopId')::uuid,
      coalesce(v_pos_item -> 'references', '[]'::jsonb),
      nullif(v_pos_item ->> 'weightKg', '')::numeric,
      nullif(v_pos_item ->> 'loadingMeters', '')::numeric,
      nullif(v_pos_item ->> 'volumeM3', '')::numeric
    );
  end loop;

  for v_leg_item in
    select value
    from jsonb_array_elements(coalesce(p_working_order -> 'legs', '[]'::jsonb)) as t(value)
  loop
    insert into public.transport_order_legs as lg (
      leg_id, order_id, sequence, origin_stop_id, destination_stop_id,
      ref_values, distance_km
    ) values (
      (v_leg_item ->> 'legId')::uuid,
      v_order_id,
      (v_leg_item ->> 'sequence')::integer,
      (v_leg_item ->> 'originStopId')::uuid,
      (v_leg_item ->> 'destinationStopId')::uuid,
      coalesce(v_leg_item -> 'references', '[]'::jsonb),
      nullif(v_leg_item ->> 'distanceKm', '')::numeric
    );
  end loop;

  for v_fr_item in
    select value
    from jsonb_array_elements(coalesce(p_working_order -> 'fieldReviews', '[]'::jsonb)) as t(value)
  loop
    insert into public.transport_order_field_reviews as fr (
      order_id, entity_type, entity_id, field_name,
      extracted_value, current_value, review_status,
      provider, model, extraction_run_id
    ) values (
      v_order_id,
      v_fr_item -> 'identity' ->> 'entityType',
      (v_fr_item -> 'identity' ->> 'entityId')::uuid,
      v_fr_item -> 'identity' ->> 'fieldName',
      v_fr_item -> 'extractedValue',
      v_fr_item -> 'currentValue',
      coalesce(v_fr_item ->> 'reviewStatus', 'pending_review'),
      p_provider, p_model, v_run_id
    );
  end loop;

  -- Assign extraction-run FK from local v_order_id (column LHS, variable RHS).
  update public.transport_order_extraction_runs as r
  set
    status = 'completed',
    terminal = false,
    order_id = v_order_id,
    updated_at = now(),
    safe_error = null
  where r.id = v_run_id;

  perform public.transport_order_insert_audit(
    v_order_id, 'extraction_completed', null, 1,
    'order', v_order_id, null, null, null, null,
    p_provider, p_model, p_prompt_version, p_schema_version
  );

  return jsonb_build_object('order_id', v_order_id, 'reused', false);
end;
$$;

create or replace function public.mark_transport_order_extraction_failed(
  p_document_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_schema_version text,
  p_safe_error text,
  p_terminal boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.transport_order_extraction_runs;
begin
  perform public.transport_order_assert_manager_or_admin();

  select * into existing
  from public.transport_order_extraction_runs
  where idempotency_key = p_idempotency_key;

  if found then
    if existing.request_hash is distinct from p_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSE_MISMATCH' using errcode = 'P0001';
    end if;
    update public.transport_order_extraction_runs
    set status = 'failed', terminal = p_terminal, attempts = attempts + 1,
        safe_error = left(coalesce(p_safe_error, 'extraction failed'), 500),
        updated_at = now()
    where id = existing.id;
  else
    insert into public.transport_order_extraction_runs (
      document_id, idempotency_key, request_hash, status, attempts, terminal,
      provider, model, prompt_version, schema_version, safe_error
    ) values (
      p_document_id, p_idempotency_key, p_request_hash, 'failed', 1, p_terminal,
      p_provider, p_model, p_prompt_version, p_schema_version,
      left(coalesce(p_safe_error, 'extraction failed'), 500)
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mutate review (CAS + audit in one TX)
-- ---------------------------------------------------------------------------

create or replace function public.mutate_transport_order_review(
  p_order_id uuid,
  p_expected_version integer,
  p_patches jsonb default '[]'::jsonb,
  p_confirms jsonb default '[]'::jsonb,
  p_mark_missing jsonb default '[]'::jsonb,
  p_mark_not_applicable jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bumped public.transport_orders;
  version_before integer;
  patch jsonb;
  identity jsonb;
  fr public.transport_order_field_reviews;
  prev_status text;
  new_status text;
  action_name text;
  ent_type text;
  ent_id uuid;
  fld text;
  val jsonb;
begin
  perform public.transport_order_assert_manager_or_admin();
  version_before := p_expected_version;
  bumped := public.transport_order_cas_bump(p_order_id, p_expected_version);

  for patch in select * from jsonb_array_elements(coalesce(p_patches, '[]'::jsonb))
  loop
    identity := patch -> 'identity';
    ent_type := identity ->> 'entityType';
    ent_id := (identity ->> 'entityId')::uuid;
    fld := identity ->> 'fieldName';
    val := patch -> 'currentValue';

    select * into fr
    from public.transport_order_field_reviews
    where order_id = p_order_id
      and entity_type = ent_type
      and entity_id = ent_id
      and field_name = fld;

    if not found then
      raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
    end if;

    prev_status := fr.review_status;
    new_status := case
      when prev_status in ('confirmed', 'missing_confirmed', 'not_applicable')
        then 'edited_pending_review'
      when prev_status = 'pending_review' then 'edited_pending_review'
      else 'edited_pending_review'
    end;
    action_name := case
      when prev_status in ('confirmed', 'missing_confirmed', 'not_applicable')
        then 'confirmation_revoked_by_edit'
      else 'field_edited'
    end;

    update public.transport_order_field_reviews
    set current_value = val,
        review_status = new_status,
        edited_by = auth.uid(),
        edited_at = now(),
        confirmed_by = null,
        confirmed_at = null
    where id = fr.id;

    if ent_type = 'order' then
      if fld = 'tourNumber' then
        update public.transport_orders set tour_number = val #>> '{}' where id = p_order_id;
      elsif fld = 'borderoNumber' then
        update public.transport_orders set bordero_number = val #>> '{}' where id = p_order_id;
      elsif fld = 'businessIdentifier' then
        update public.transport_orders set business_identifier = val #>> '{}' where id = p_order_id;
      elsif fld = 'responsibleClerk' then
        update public.transport_orders set responsible_clerk = val #>> '{}' where id = p_order_id;
      elsif fld = 'remarks' then
        update public.transport_orders set remarks = val #>> '{}' where id = p_order_id;
      elsif fld = 'freightAmount' then
        update public.transport_orders set freight_amount = nullif(val #>> '{}', '')::numeric where id = p_order_id;
      elsif fld = 'freightCurrency' then
        update public.transport_orders set freight_currency = val #>> '{}' where id = p_order_id;
      elsif fld = 'truckLicensePlate' then
        update public.transport_orders set truck_license_plate = val #>> '{}' where id = p_order_id;
      elsif fld = 'trailerLicensePlate' then
        update public.transport_orders set trailer_license_plate = val #>> '{}' where id = p_order_id;
      elsif fld = 'cargoDescription' then
        update public.transport_orders set cargo_description = val #>> '{}' where id = p_order_id;
      end if;
    elsif ent_type = 'stop' then
      if fld = 'type' then
        update public.transport_order_stops set stop_type = val #>> '{}' where stop_id = ent_id and order_id = p_order_id;
      elsif fld = 'company' then
        update public.transport_order_stops set company = val #>> '{}' where stop_id = ent_id;
      elsif fld = 'street' then
        update public.transport_order_stops set street = val #>> '{}' where stop_id = ent_id;
      elsif fld = 'postalCode' then
        update public.transport_order_stops set postal_code = val #>> '{}' where stop_id = ent_id;
      elsif fld = 'city' then
        update public.transport_order_stops set city = val #>> '{}' where stop_id = ent_id;
      elsif fld = 'country' then
        update public.transport_order_stops set country = val #>> '{}' where stop_id = ent_id;
      elsif fld = 'rawAddressText' then
        update public.transport_order_stops set raw_address_text = val #>> '{}' where stop_id = ent_id;
      elsif fld = 'date' then
        update public.transport_order_stops set stop_date = val #>> '{}' where stop_id = ent_id;
      elsif fld = 'timeWindow' then
        update public.transport_order_stops set time_window = val #>> '{}' where stop_id = ent_id;
      end if;
    end if;

    perform public.transport_order_insert_audit(
      p_order_id, action_name, version_before, bumped.version,
      ent_type, ent_id, fld, fr.current_value, val, null,
      null, null, null, null
    );
  end loop;

  for identity in select * from jsonb_array_elements(coalesce(p_confirms, '[]'::jsonb))
  loop
    ent_type := identity ->> 'entityType';
    ent_id := (identity ->> 'entityId')::uuid;
    fld := identity ->> 'fieldName';
    update public.transport_order_field_reviews
    set review_status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
    where order_id = p_order_id and entity_type = ent_type and entity_id = ent_id and field_name = fld
    returning * into fr;
    if not found then
      raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
    end if;
    perform public.transport_order_insert_audit(
      p_order_id, 'field_confirmed', version_before, bumped.version,
      ent_type, ent_id, fld, fr.current_value, fr.current_value, null,
      null, null, null, null
    );
  end loop;

  for identity in select * from jsonb_array_elements(coalesce(p_mark_missing, '[]'::jsonb))
  loop
    ent_type := identity ->> 'entityType';
    ent_id := (identity ->> 'entityId')::uuid;
    fld := identity ->> 'fieldName';
    update public.transport_order_field_reviews
    set review_status = 'missing_confirmed', confirmed_by = auth.uid(), confirmed_at = now()
    where order_id = p_order_id and entity_type = ent_type and entity_id = ent_id and field_name = fld
    returning * into fr;
    if not found then
      raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
    end if;
    perform public.transport_order_insert_audit(
      p_order_id, 'missing_confirmed', version_before, bumped.version,
      ent_type, ent_id, fld, fr.current_value, fr.current_value, null,
      null, null, null, null
    );
  end loop;

  for identity in select * from jsonb_array_elements(coalesce(p_mark_not_applicable, '[]'::jsonb))
  loop
    ent_type := identity ->> 'entityType';
    ent_id := (identity ->> 'entityId')::uuid;
    fld := identity ->> 'fieldName';
    update public.transport_order_field_reviews
    set review_status = 'not_applicable', confirmed_by = auth.uid(), confirmed_at = now()
    where order_id = p_order_id and entity_type = ent_type and entity_id = ent_id and field_name = fld
    returning * into fr;
    if not found then
      raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
    end if;
    perform public.transport_order_insert_audit(
      p_order_id, 'not_applicable_confirmed', version_before, bumped.version,
      ent_type, ent_id, fld, fr.current_value, fr.current_value, null,
      null, null, null, null
    );
  end loop;

  return jsonb_build_object('order_id', p_order_id, 'version', bumped.version);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reorder stops (deferred unique sequence)
-- ---------------------------------------------------------------------------

create or replace function public.reorder_transport_order_stops(
  p_order_id uuid,
  p_expected_version integer,
  p_ordered_stop_ids uuid[],
  p_maps_static_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bumped public.transport_orders;
  v_version_before integer;
  v_old_ids uuid[];
  v_stop_count integer;
  v_ordinal integer;
  v_stop_id uuid;
  v_distinct_count integer;
begin
  perform public.transport_order_assert_manager_or_admin();
  v_version_before := p_expected_version;

  select array_agg(st.stop_id order by st.sequence)
  into v_old_ids
  from public.transport_order_stops as st
  where st.order_id = p_order_id;

  select count(*)::integer
  into v_stop_count
  from public.transport_order_stops as st
  where st.order_id = p_order_id;

  if coalesce(array_length(p_ordered_stop_ids, 1), 0) <> v_stop_count then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  select count(distinct requested.stop_id)::integer
  into v_distinct_count
  from unnest(p_ordered_stop_ids) as requested(stop_id);

  if v_distinct_count <> v_stop_count then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  -- Never reuse a PL/pgSQL variable name as an unnest/CTE column (sid collision).
  if exists (
    select 1
    from unnest(p_ordered_stop_ids) as requested(stop_id)
    where not exists (
      select 1
      from public.transport_order_stops as st
      where st.order_id = p_order_id
        and st.stop_id = requested.stop_id
    )
  ) then
    raise exception 'INVALID_STOP_REFERENCE' using errcode = 'P0001';
  end if;

  v_bumped := public.transport_order_cas_bump(p_order_id, p_expected_version);

  -- Intermediate unique-safe offsets; deferred unique checks final contiguous 1..n
  v_ordinal := 0;
  foreach v_stop_id in array p_ordered_stop_ids
  loop
    v_ordinal := v_ordinal + 1;
    update public.transport_order_stops as st
    set sequence = 100000 + v_ordinal
    where st.order_id = p_order_id
      and st.stop_id = v_stop_id;
  end loop;

  v_ordinal := 0;
  foreach v_stop_id in array p_ordered_stop_ids
  loop
    v_ordinal := v_ordinal + 1;
    update public.transport_order_stops as st
    set sequence = v_ordinal
    where st.order_id = p_order_id
      and st.stop_id = v_stop_id;

    update public.transport_order_field_reviews as fr
    set
      current_value = to_jsonb(v_ordinal),
      review_status = 'edited_pending_review',
      confirmed_by = null,
      confirmed_at = null
    where fr.order_id = p_order_id
      and fr.entity_type = 'stop'
      and fr.entity_id = v_stop_id
      and fr.field_name = 'sequence';
  end loop;

  update public.transport_orders as o
  set
    stop_order_review_status = 'edited_pending_review',
    maps_static_url = coalesce(p_maps_static_url, o.maps_static_url)
  where o.id = p_order_id;

  perform public.transport_order_insert_audit(
    p_order_id, 'stops_reordered', v_version_before, v_bumped.version,
    'stop_order', p_order_id, 'sequence',
    to_jsonb(v_old_ids), to_jsonb(p_ordered_stop_ids), null,
    null, null, null, null
  );

  return jsonb_build_object('order_id', p_order_id, 'version', v_bumped.version);
end;
$$;

create or replace function public.confirm_transport_order_stop_order(
  p_order_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bumped public.transport_orders;
  version_before integer;
  new_ids uuid[];
begin
  perform public.transport_order_assert_manager_or_admin();
  version_before := p_expected_version;
  bumped := public.transport_order_cas_bump(p_order_id, p_expected_version);

  update public.transport_orders
  set stop_order_review_status = 'confirmed'
  where id = p_order_id;

  select array_agg(stop_id order by sequence) into new_ids
  from public.transport_order_stops where order_id = p_order_id;

  perform public.transport_order_insert_audit(
    p_order_id, 'stop_order_confirmed', version_before, bumped.version,
    'stop_order', p_order_id, 'sequence', null, to_jsonb(new_ids), null,
    null, null, null, null
  );

  return jsonb_build_object('order_id', p_order_id, 'version', bumped.version);
end;
$$;

-- ---------------------------------------------------------------------------
-- Complete review (gate + CAS + audit atomic)
-- ---------------------------------------------------------------------------

create or replace function public.complete_transport_order_review(
  p_order_id uuid,
  p_expected_version integer,
  p_completion_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.transport_orders;
  bumped public.transport_orders;
  version_before integer;
  unresolved jsonb := '[]'::jsonb;
  pickup_count integer;
  delivery_count integer;
  stop_count integer;
  seq_ok boolean;
begin
  perform public.transport_order_assert_manager_or_admin();

  select * into ord from public.transport_orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Idempotent completion acknowledgment (no duplicate completion audit)
  if ord.review_completed_at is not null then
    if p_completion_idempotency_key is not null
       and ord.completion_idempotency_key is not null
       and ord.completion_idempotency_key = p_completion_idempotency_key then
      return jsonb_build_object(
        'order_id', ord.id, 'version', ord.version, 'reused', true
      );
    end if;
    if p_expected_version = ord.version then
      return jsonb_build_object(
        'order_id', ord.id, 'version', ord.version, 'reused', true
      );
    end if;
  end if;

  if ord.version is distinct from p_expected_version then
    raise exception 'ORDER_VERSION_CONFLICT' using errcode = 'P0001';
  end if;

  select count(*) into pickup_count
  from public.transport_order_stops where order_id = p_order_id and stop_type = 'pickup';
  select count(*) into delivery_count
  from public.transport_order_stops where order_id = p_order_id and stop_type = 'delivery';
  select count(*) into stop_count
  from public.transport_order_stops where order_id = p_order_id;

  if pickup_count < 1 or delivery_count < 1 then
    unresolved := unresolved || jsonb_build_array(jsonb_build_object(
      'entityType', 'order', 'entityId', p_order_id, 'fieldName', 'stops',
      'reviewStatus', 'pending_review'
    ));
  end if;

  if ord.stop_order_review_status is distinct from 'confirmed' then
    unresolved := unresolved || jsonb_build_array(jsonb_build_object(
      'entityType', 'stop_order', 'entityId', p_order_id, 'fieldName', 'sequence',
      'reviewStatus', ord.stop_order_review_status
    ));
  end if;

  select not exists (
    select 1
    from public.transport_order_stops s
    where s.order_id = p_order_id
      and s.sequence not in (select generate_series(1, stop_count))
  ) and (
    select count(distinct sequence) from public.transport_order_stops where order_id = p_order_id
  ) = stop_count
  into seq_ok;

  if not coalesce(seq_ok, false) then
    unresolved := unresolved || jsonb_build_array(jsonb_build_object(
      'entityType', 'stop_order', 'entityId', p_order_id, 'fieldName', 'sequence_contiguous',
      'reviewStatus', 'conflict'
    ));
  end if;

  unresolved := unresolved || coalesce((
    select jsonb_agg(jsonb_build_object(
      'entityType', fr.entity_type,
      'entityId', fr.entity_id,
      'fieldName', fr.field_name,
      'reviewStatus', fr.review_status
    ))
    from public.transport_order_field_reviews fr
    where fr.order_id = p_order_id
      and fr.review_status in (
        'pending_review', 'edited_pending_review', 'conflict', 'extraction_failed'
      )
  ), '[]'::jsonb);

  if exists (
    select 1 from public.transport_order_partial_load_positions p
    where p.order_id = p_order_id
      and (
        not exists (select 1 from public.transport_order_stops s where s.stop_id = p.pickup_stop_id and s.order_id = p_order_id)
        or not exists (select 1 from public.transport_order_stops s where s.stop_id = p.delivery_stop_id and s.order_id = p_order_id)
      )
  ) then
    unresolved := unresolved || jsonb_build_array(jsonb_build_object(
      'entityType', 'partial_load_position', 'entityId', p_order_id,
      'fieldName', 'stop_reference', 'reviewStatus', 'conflict'
    ));
  end if;

  if exists (
    select 1 from public.transport_order_legs l
    where l.order_id = p_order_id
      and (
        not exists (select 1 from public.transport_order_stops s where s.stop_id = l.origin_stop_id and s.order_id = p_order_id)
        or not exists (select 1 from public.transport_order_stops s where s.stop_id = l.destination_stop_id and s.order_id = p_order_id)
      )
  ) then
    unresolved := unresolved || jsonb_build_array(jsonb_build_object(
      'entityType', 'transport_leg', 'entityId', p_order_id,
      'fieldName', 'stop_reference', 'reviewStatus', 'conflict'
    ));
  end if;

  if jsonb_array_length(unresolved) > 0 then
    -- Prefer: do NOT write audit as a side-effect of a rolled-back mutation TX.
    -- Rejection is signaled via exception + unresolved payload; no version bump.
    raise exception 'ORDER_REVIEW_INCOMPLETE:%', unresolved::text using errcode = 'P0001';
  end if;

  version_before := ord.version;
  bumped := public.transport_order_cas_bump(p_order_id, p_expected_version);

  update public.transport_orders
  set review_completed_at = now(),
      completion_idempotency_key = coalesce(p_completion_idempotency_key, completion_idempotency_key)
  where id = p_order_id;

  perform public.transport_order_insert_audit(
    p_order_id, 'review_completed', version_before, bumped.version,
    'order', p_order_id, null, null, jsonb_build_object('completed', true), null,
    null, null, null, null
  );

  return jsonb_build_object(
    'order_id', p_order_id, 'version', bumped.version, 'reused', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- Table SELECT for authenticated + service_role (RLS still applies).
-- No anon table access. No authenticated INSERT/UPDATE/DELETE/TRUNCATE —
-- invariant mutations go through SECURITY DEFINER RPCs (owner privileges).
-- ---------------------------------------------------------------------------

revoke all on table public.transport_order_documents from public, anon, authenticated, service_role;
revoke all on table public.transport_order_extraction_runs from public, anon, authenticated, service_role;
revoke all on table public.transport_orders from public, anon, authenticated, service_role;
revoke all on table public.transport_order_extracted_snapshots from public, anon, authenticated, service_role;
revoke all on table public.transport_order_stops from public, anon, authenticated, service_role;
revoke all on table public.transport_order_partial_load_positions from public, anon, authenticated, service_role;
revoke all on table public.transport_order_legs from public, anon, authenticated, service_role;
revoke all on table public.transport_order_field_reviews from public, anon, authenticated, service_role;
revoke all on table public.transport_order_field_review_events from public, anon, authenticated, service_role;

grant select on table public.transport_order_documents to authenticated, service_role;
grant select on table public.transport_order_extraction_runs to authenticated, service_role;
grant select on table public.transport_orders to authenticated, service_role;
grant select on table public.transport_order_extracted_snapshots to authenticated, service_role;
grant select on table public.transport_order_stops to authenticated, service_role;
grant select on table public.transport_order_partial_load_positions to authenticated, service_role;
grant select on table public.transport_order_legs to authenticated, service_role;
grant select on table public.transport_order_field_reviews to authenticated, service_role;
grant select on table public.transport_order_field_review_events to authenticated, service_role;

-- RPC EXECUTE: authenticated (JWT path) + service_role (evidence/fixtures).
-- Internal audit helper is not granted to clients.
revoke all on function public.transport_order_assert_manager_or_admin() from public;
revoke all on function public.transport_order_insert_audit(uuid, text, integer, integer, text, uuid, text, jsonb, jsonb, text, text, text, text, text) from public;
revoke all on function public.transport_order_cas_bump(uuid, integer) from public;
revoke all on function public.register_transport_order_upload(text, text, text, text, integer) from public;
revoke all on function public.persist_transport_order_extraction(uuid, text, text, text, text, text, text, jsonb) from public;
revoke all on function public.mark_transport_order_extraction_failed(uuid, text, text, text, text, text, text, text, boolean) from public;
revoke all on function public.mutate_transport_order_review(uuid, integer, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.reorder_transport_order_stops(uuid, integer, uuid[], text) from public;
revoke all on function public.confirm_transport_order_stop_order(uuid, integer) from public;
revoke all on function public.complete_transport_order_review(uuid, integer, text) from public;

grant execute on function public.transport_order_assert_manager_or_admin() to authenticated, service_role;
grant execute on function public.transport_order_cas_bump(uuid, integer) to authenticated, service_role;
grant execute on function public.register_transport_order_upload(text, text, text, text, integer) to authenticated, service_role;
grant execute on function public.persist_transport_order_extraction(uuid, text, text, text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.mark_transport_order_extraction_failed(uuid, text, text, text, text, text, text, text, boolean) to authenticated, service_role;
grant execute on function public.mutate_transport_order_review(uuid, integer, jsonb, jsonb, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.reorder_transport_order_stops(uuid, integer, uuid[], text) to authenticated, service_role;
grant execute on function public.confirm_transport_order_stop_order(uuid, integer) to authenticated, service_role;
grant execute on function public.complete_transport_order_review(uuid, integer, text) to authenticated, service_role;

-- Storage: private bucket row only (no public bucket; no broad storage schema grants).
-- Object access remains via service-role server helpers / signed URLs — not anon.

comment on table public.transport_order_documents is 'PACK-006 private PDF metadata; Storage bucket transport-order-pdfs is private.';
comment on table public.transport_order_extracted_snapshots is 'Immutable AI extraction snapshot; mutations forbidden.';
comment on column public.transport_order_stops.stop_id is 'Immutable UUID identity; sequence is mutable ordering only.';
comment on function public.complete_transport_order_review is 'Atomic completion gate; no completion_gate_rejected audit inside rolled-back TX (ADR-009 preferred).';
