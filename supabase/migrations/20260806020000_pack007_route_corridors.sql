-- PACK-007 Part 3: predefined route corridors (FR-007-10)
-- Soft-delete via active=false. Authenticated: no DELETE.

create table public.route_corridors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  origin text not null,
  destination text not null,
  waypoints jsonb not null default '[]'::jsonb,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_corridors_name_key unique (name)
);

create index idx_route_corridors_active on public.route_corridors (active);

alter table public.route_corridors enable row level security;

-- All authenticated roles: read
create policy route_corridors_select
  on public.route_corridors
  for select
  using (public.is_authenticated_role());

-- Admin only: insert / update (deactivate = active=false)
create policy route_corridors_insert
  on public.route_corridors
  for insert
  with check (public.is_admin());

create policy route_corridors_update
  on public.route_corridors
  for update
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on table public.route_corridors to authenticated;
grant all on table public.route_corridors to service_role;
revoke delete on table public.route_corridors from authenticated;

-- Link selected corridor on KM comparison (nullable = direct route / stops-based)
alter table public.transport_order_km_comparison
  add column if not exists corridor_id uuid references public.route_corridors(id) on delete set null;

create index if not exists idx_km_comparison_corridor_id
  on public.transport_order_km_comparison (corridor_id);

-- Seed 5 standard corridors
insert into public.route_corridors (name, origin, destination, waypoints, description) values
  ('Hamburg → München (A7)', 'Hamburg', 'München', '["Kassel", "Nürnberg"]'::jsonb, 'Standard route via A7'),
  ('Berlin → Frankfurt (A9)', 'Berlin', 'Frankfurt', '["Leipzig", "Erfurt"]'::jsonb, 'Standard route via A9'),
  ('Köln → Stuttgart (A61)', 'Köln', 'Stuttgart', '["Koblenz", "Heilbronn"]'::jsonb, 'Standard route via A61'),
  ('Hamburg → Berlin (A24)', 'Hamburg', 'Berlin', '["Schwerin"]'::jsonb, 'Standard route via A24'),
  ('München → Frankfurt (A3)', 'München', 'Frankfurt', '["Nürnberg", "Würzburg"]'::jsonb, 'Standard route via A3');
