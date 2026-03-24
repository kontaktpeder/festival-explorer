
-- 1) Bridge table: unified asset handle
create table if not exists public.asset_handles (
  id uuid primary key default gen_random_uuid(),
  media_id uuid null references public.media(id) on delete cascade,
  festival_media_id uuid null references public.festival_media(id) on delete cascade,
  kind text null,
  label text null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_handles_exactly_one_source
    check (((media_id is not null)::int + (festival_media_id is not null)::int) = 1)
);

create unique index if not exists asset_handles_media_unique_idx
  on public.asset_handles(media_id) where media_id is not null;

create unique index if not exists asset_handles_festival_media_unique_idx
  on public.asset_handles(festival_media_id) where festival_media_id is not null;

create index if not exists asset_handles_created_by_idx
  on public.asset_handles(created_by);

-- 2) Add new asset_id rider refs on entities + slots
alter table public.entities
  add column if not exists tech_rider_asset_id uuid references public.asset_handles(id) on delete set null,
  add column if not exists hosp_rider_asset_id uuid references public.asset_handles(id) on delete set null;

alter table public.event_program_slots
  add column if not exists tech_rider_asset_id uuid references public.asset_handles(id) on delete set null,
  add column if not exists hosp_rider_asset_id uuid references public.asset_handles(id) on delete set null;

create index if not exists entities_tech_rider_asset_id_idx on public.entities(tech_rider_asset_id);
create index if not exists entities_hosp_rider_asset_id_idx on public.entities(hosp_rider_asset_id);
create index if not exists eps_tech_rider_asset_id_idx on public.event_program_slots(tech_rider_asset_id);
create index if not exists eps_hosp_rider_asset_id_idx on public.event_program_slots(hosp_rider_asset_id);

-- 3) Backfill existing slot rider refs from festival_media -> asset_handles
insert into public.asset_handles (festival_media_id, created_by)
select fm.id, coalesce(fm.created_by, f.created_by)
from public.event_program_slots eps
join public.festival_media fm on fm.id = eps.tech_rider_media_id
left join public.festivals f on f.id = eps.festival_id
where fm.created_by is not null or f.created_by is not null
on conflict do nothing;

insert into public.asset_handles (festival_media_id, created_by)
select fm.id, coalesce(fm.created_by, f.created_by)
from public.event_program_slots eps
join public.festival_media fm on fm.id = eps.hosp_rider_media_id
left join public.festivals f on f.id = eps.festival_id
where fm.created_by is not null or f.created_by is not null
on conflict do nothing;

update public.event_program_slots eps
set tech_rider_asset_id = ah.id
from public.asset_handles ah
where eps.tech_rider_media_id is not null
  and ah.festival_media_id = eps.tech_rider_media_id
  and eps.tech_rider_asset_id is null;

update public.event_program_slots eps
set hosp_rider_asset_id = ah.id
from public.asset_handles ah
where eps.hosp_rider_media_id is not null
  and ah.festival_media_id = eps.hosp_rider_media_id
  and eps.hosp_rider_asset_id is null;

-- 4) Helper view for resolved metadata
create or replace view public.asset_handles_resolved as
select
  ah.id as asset_id,
  'media'::text as source_type,
  ah.media_id as source_id,
  m.original_filename,
  m.file_type,
  m.mime_type,
  m.size_bytes,
  m.public_url,
  null::uuid as festival_id,
  m.created_by,
  m.created_at
from public.asset_handles ah
join public.media m on m.id = ah.media_id
union all
select
  ah.id as asset_id,
  'festival_media'::text as source_type,
  ah.festival_media_id as source_id,
  fm.original_filename,
  fm.file_type,
  fm.mime_type,
  fm.size_bytes,
  fm.public_url,
  fm.festival_id,
  fm.created_by,
  fm.created_at
from public.asset_handles ah
join public.festival_media fm on fm.id = ah.festival_media_id;

-- 5) RLS on asset_handles
alter table public.asset_handles enable row level security;

create policy "asset_handles_select"
on public.asset_handles for select to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.festival_media fm
    where fm.id = asset_handles.festival_media_id
    and (public.is_admin() or public.can_edit_events(fm.festival_id) or public.has_backstage_access())
  )
  or exists (
    select 1 from public.media m
    where m.id = asset_handles.media_id
    and m.created_by = auth.uid()
  )
  or public.is_admin()
);

create policy "asset_handles_insert"
on public.asset_handles for insert to authenticated
with check (created_by = auth.uid() or public.is_admin());

create policy "asset_handles_update"
on public.asset_handles for update to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

create policy "asset_handles_delete"
on public.asset_handles for delete to authenticated
using (created_by = auth.uid() or public.is_admin());
