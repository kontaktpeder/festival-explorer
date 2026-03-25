
-- RPC: get_my_events – returns events the current user can view or edit
-- Uses event_participants (direct) + festival_participants (inherited) + can_edit_event + is_admin

create or replace function public.get_my_events()
returns table (
  id uuid,
  title text,
  slug text,
  status public.publish_status,
  start_at timestamptz,
  city text,
  can_edit boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (e.id)
    e.id,
    e.title,
    e.slug,
    e.status,
    e.start_at,
    e.city,
    (public.is_admin() or public.can_edit_event(e.id)) as can_edit
  from public.events e
  where
    -- 1) admin sees all
    public.is_admin()
    -- 2) creator
    or e.created_by = auth.uid()
    -- 3) host entity team member
    or (e.host_entity_id is not null and exists (
      select 1 from public.entity_team et
      where et.entity_id = e.host_entity_id
        and et.user_id = auth.uid()
        and et.left_at is null
    ))
    -- 4) event_participants (persona or entity team)
    or exists (
      select 1 from public.event_participants ep
      where ep.event_id = e.id
        and (
          (ep.participant_kind = 'persona' and exists (
            select 1 from public.personas p
            where p.id = ep.participant_id and p.user_id = auth.uid()
          ))
          or
          (ep.participant_kind = 'entity' and exists (
            select 1 from public.entity_team et
            where et.entity_id = ep.participant_id
              and et.user_id = auth.uid()
              and et.left_at is null
          ))
        )
    )
    -- 5) festival_participants (inherited via festival_events)
    or exists (
      select 1 from public.festival_events fe
      join public.festival_participants fp on fp.festival_id = fe.festival_id
      where fe.event_id = e.id
        and (
          (fp.participant_kind = 'persona' and exists (
            select 1 from public.personas p
            where p.id = fp.participant_id and p.user_id = auth.uid()
          ))
          or
          (fp.participant_kind = 'entity' and exists (
            select 1 from public.entity_team et
            where et.entity_id = fp.participant_id
              and et.user_id = auth.uid()
              and et.left_at is null
          ))
        )
    )
  order by e.id, e.start_at desc;
$$;
