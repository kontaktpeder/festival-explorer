
begin;

-- Phase types (ASCII enum names)
create type public.event_program_phase_type as enum ('opprigg', 'lydprove', 'event');

create table public.event_program_sections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  festival_id uuid references public.festivals(id) on delete cascade,
  type public.event_program_phase_type not null,
  display_name text,
  starts_at_local time not null default time '12:00',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_program_sections_scope_chk check (
    (event_id is not null and festival_id is null)
    or (event_id is null and festival_id is not null)
  )
);

comment on table public.event_program_sections is
  'Phases (Opprigg / Lydprøve / Event) for run sheet; slots reference via section_id.';

create unique index event_program_sections_event_type_uniq
  on public.event_program_sections (event_id, type)
  where event_id is not null;

create unique index event_program_sections_festival_type_uniq
  on public.event_program_sections (festival_id, type)
  where festival_id is not null;

create index event_program_sections_event_sort_idx
  on public.event_program_sections (event_id, sort_order)
  where event_id is not null;

create index event_program_sections_festival_sort_idx
  on public.event_program_sections (festival_id, sort_order)
  where festival_id is not null;

create trigger event_program_sections_updated_at
  before update on public.event_program_sections
  for each row execute function public.set_updated_at();

-- Add section_id to slots (nullable)
alter table public.event_program_slots
  add column if not exists section_id uuid references public.event_program_sections(id) on delete set null;

create index if not exists idx_event_program_slots_section_id
  on public.event_program_slots(section_id);

-- Helper to derive phase type from slot
create or replace function public._slot_phase_type(eps public.event_program_slots)
returns public.event_program_phase_type
language sql
immutable
as $$
  select case
    when eps.slot_kind = 'rigging' then 'opprigg'::public.event_program_phase_type
    when eps.slot_kind = 'soundcheck' then 'lydprove'::public.event_program_phase_type
    when eps.slot_kind = 'crew' then 'opprigg'::public.event_program_phase_type
    when eps.visibility = 'internal'
         and upper(coalesce(eps.title_override, '')) like '%LYDPRØVE%' then 'lydprove'::public.event_program_phase_type
    when eps.visibility = 'internal'
         and (
           upper(coalesce(eps.title_override, '')) like '%OPPRIGG%'
           or upper(coalesce(eps.title_override, '')) like '%RIGGING%'
         ) then 'opprigg'::public.event_program_phase_type
    else 'event'::public.event_program_phase_type
  end;
$$;

-- Create sections: slots with event_id get event-scoped sections;
-- slots with only festival_id get festival-scoped sections.
-- When both exist, use festival_id (since event_program_slots.festival_id is set by trigger for festival events).
insert into public.event_program_sections (event_id, festival_id, type, sort_order, starts_at_local)
select distinct on (coalesce(q.eid, '00000000-0000-0000-0000-000000000000'), coalesce(q.fid, '00000000-0000-0000-0000-000000000000'), q.typ)
  q.eid,
  q.fid,
  q.typ,
  case q.typ
    when 'opprigg' then 0
    when 'lydprove' then 1
    else 2
  end,
  time '12:00'
from (
  select
    -- When both event_id and festival_id are set, create festival-scoped section
    case when eps.festival_id is not null then null else eps.event_id end as eid,
    case when eps.festival_id is not null then eps.festival_id else null end as fid,
    public._slot_phase_type(eps) as typ
  from public.event_program_slots eps
  where eps.event_id is not null or eps.festival_id is not null
) q
where q.eid is not null or q.fid is not null
order by coalesce(q.eid, '00000000-0000-0000-0000-000000000000'),
         coalesce(q.fid, '00000000-0000-0000-0000-000000000000'),
         q.typ;

-- Backfill section_id: match slot to section by scope + phase type
-- For slots with festival_id set, match on festival_id
update public.event_program_slots eps
set section_id = s.id
from public.event_program_sections s
where eps.section_id is null
  and eps.festival_id is not null
  and s.festival_id = eps.festival_id
  and s.event_id is null
  and s.type = public._slot_phase_type(eps);

-- For slots with only event_id (no festival_id), match on event_id
update public.event_program_slots eps
set section_id = s.id
from public.event_program_sections s
where eps.section_id is null
  and eps.festival_id is null
  and eps.event_id is not null
  and s.event_id = eps.event_id
  and s.festival_id is null
  and s.type = public._slot_phase_type(eps);

-- Clean up helper
drop function public._slot_phase_type(public.event_program_slots);

-- RLS
alter table public.event_program_sections enable row level security;

create policy "Public read published event_program_sections"
  on public.event_program_sections
  for select
  using (
    event_id is not null
    and exists (
      select 1 from public.events e
      where e.id = event_program_sections.event_id
        and e.status = 'published'::public.publish_status
    )
  );

create policy "Admin full access event_program_sections"
  on public.event_program_sections
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Event editors manage event_program_sections"
  on public.event_program_sections
  for all
  using (event_id is not null and public.can_edit_event(event_id))
  with check (event_id is not null and public.can_edit_event(event_id));

create policy "Festival editors manage festival-scope event_program_sections"
  on public.event_program_sections
  for all
  using (festival_id is not null and public.can_edit_festival(festival_id))
  with check (festival_id is not null and public.can_edit_festival(festival_id));

create policy "runsheet view event_program_sections (event or festival)"
  on public.event_program_sections
  for select
  to authenticated
  using (
    public.can_view_runsheet_slot(festival_id, event_id)
  );

commit;
