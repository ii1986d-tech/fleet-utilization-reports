-- PACK-007 Part 2: KM comparison + manual overrides (FR-007-08 / FR-007-09)
-- One comparison row per transport order. Authenticated: no DELETE.

create table public.transport_order_km_comparison (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.transport_orders(id) on delete cascade,
  paid_km numeric(10, 2),
  paid_km_manual numeric(10, 2),
  actual_km numeric(10, 2),
  actual_km_manual numeric(10, 2),
  direct_km numeric(10, 2),
  delta_km numeric(10, 2),
  delta_percent numeric(6, 2),
  status text not null default 'ok'
    check (status in ('ok', 'warning', 'error')),
  source text not null default 'api'
    check (source in ('api', 'cache', 'fallback', 'manual')),
  route_url text,
  manual_route_url text,
  effective_route_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transport_order_km_comparison_order_id_key unique (order_id),
  constraint transport_order_km_comparison_paid_km_nonneg
    check (paid_km is null or paid_km >= 0),
  constraint transport_order_km_comparison_paid_km_manual_nonneg
    check (paid_km_manual is null or paid_km_manual >= 0),
  constraint transport_order_km_comparison_actual_km_nonneg
    check (actual_km is null or actual_km >= 0),
  constraint transport_order_km_comparison_actual_km_manual_nonneg
    check (actual_km_manual is null or actual_km_manual >= 0),
  constraint transport_order_km_comparison_direct_km_nonneg
    check (direct_km is null or direct_km >= 0)
);

create index idx_km_comparison_order_id
  on public.transport_order_km_comparison (order_id);

alter table public.transport_order_km_comparison enable row level security;

-- Viewer + manager + admin: read
create policy km_comparison_select
  on public.transport_order_km_comparison
  for select
  using (public.is_authenticated_role());

-- Admin/manager: insert / update (manual overrides + recalculation)
create policy km_comparison_insert
  on public.transport_order_km_comparison
  for insert
  with check (public.is_manager_or_admin());

create policy km_comparison_update
  on public.transport_order_km_comparison
  for update
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

-- No DELETE policy for authenticated (soft-delete / retain pattern)

grant select, insert, update on table public.transport_order_km_comparison to authenticated;
grant all on table public.transport_order_km_comparison to service_role;
revoke delete on table public.transport_order_km_comparison from authenticated;
