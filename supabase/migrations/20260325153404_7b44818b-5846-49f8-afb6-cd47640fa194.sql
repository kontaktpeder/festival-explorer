begin;

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
              and et.access in ('owner','admin','editor','viewer')
          ))
        )
    );
$$;

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
              and et.access in ('owner','admin','editor','viewer')
          ))
        )
    );
$$;

update public.event_participants
set can_view_runsheet = true
where participant_kind = 'entity'
  and zone = 'on_stage'
  and can_view_runsheet = false;

commit;