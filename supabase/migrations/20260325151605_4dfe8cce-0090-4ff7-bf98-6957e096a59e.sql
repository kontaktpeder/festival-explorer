
begin;

-- 1) Add can_view_runsheet on event_participants (event-only view access)
alter table public.event_participants
  add column if not exists can_view_runsheet boolean not null default false;

comment on column public.event_participants.can_view_runsheet is
  'Kan se kjøreplan og issues for dette eventet (read-only).';

-- 2) Helper: can_view_runsheet_event(event_id)
create or replace function public.can_view_runsheet_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    OR public.can_edit_event(p_event_id)
    OR exists (
      select 1
      from public.event_participants ep
      where ep.event_id = p_event_id
        and ep.can_view_runsheet = true
        and (
          (ep.participant_kind = 'persona' and exists (
            select 1 from public.personas p
            where p.id = ep.participant_id and p.user_id = auth.uid()
          ))
          OR
          (ep.participant_kind = 'entity' and exists (
            select 1 from public.entity_team et
            where et.entity_id = ep.participant_id
              and et.user_id = auth.uid()
              and et.left_at is null
              and et.access in ('owner','admin','editor')
          ))
        )
    );
$$;

-- 3) Helper: can_view_runsheet_festival(festival_id)
create or replace function public.can_view_runsheet_festival(p_festival_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    OR public.can_edit_events(p_festival_id)
    OR exists (
      select 1
      from public.festival_participants fp
      where fp.festival_id = p_festival_id
        and fp.can_view_runsheet = true
        and (
          (fp.participant_kind = 'persona' and exists (
            select 1 from public.personas p
            where p.id = fp.participant_id and p.user_id = auth.uid()
          ))
          OR
          (fp.participant_kind = 'entity' and exists (
            select 1 from public.entity_team et
            where et.entity_id = fp.participant_id
              and et.user_id = auth.uid()
              and et.left_at is null
              and et.access in ('owner','admin','editor')
          ))
        )
    );
$$;

-- 4) Wrapper: can_view_runsheet_slot(festival_id, event_id)
create or replace function public.can_view_runsheet_slot(p_festival_id uuid, p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (p_event_id is not null and public.can_view_runsheet_event(p_event_id))
    OR
    (p_festival_id is not null and public.can_view_runsheet_festival(p_festival_id));
$$;

-- 5) RLS: event_program_slots SELECT via event OR festival
drop policy if exists "runsheet view (event or festival)" on public.event_program_slots;
create policy "runsheet view (event or festival)"
  on public.event_program_slots
  for select
  to authenticated
  using (public.can_view_runsheet_slot(festival_id, event_id));

-- 6) RLS: event_issue SELECT via event OR festival
drop policy if exists "Runsheet viewers can view issues" on public.event_issue;
create policy "Runsheet viewers can view issues"
  on public.event_issue
  for select
  to authenticated
  using (public.can_view_runsheet_slot(festival_id, event_id));

commit;
