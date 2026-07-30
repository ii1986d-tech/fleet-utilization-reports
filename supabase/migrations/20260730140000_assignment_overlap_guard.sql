-- PACK-002: mandatory overlap guard + preserve assignment history on vehicle delete
-- Rollback (forward-fix): drop exclusion; optionally restore ON DELETE CASCADE via separate fix migration.

create extension if not exists btree_gist;

alter table public.vehicle_assignments
  drop constraint if exists vehicle_assignments_vehicle_id_fkey;

alter table public.vehicle_assignments
  add constraint vehicle_assignments_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles (id) on delete restrict;

alter table public.vehicle_assignments
  drop constraint if exists vehicle_assignments_vehicle_period_excl;

alter table public.vehicle_assignments
  add constraint vehicle_assignments_vehicle_period_excl
  exclude using gist (
    vehicle_id with =,
    daterange(
      valid_from,
      coalesce(valid_until, 'infinity'::date),
      '[]'
    ) with &&
  );

comment on constraint vehicle_assignments_vehicle_period_excl on public.vehicle_assignments is
  'PACK-002 ADR-005: inclusive non-overlapping periods per vehicle; open-ended uses infinity';
