
DROP FUNCTION IF EXISTS public.get_my_events();

CREATE FUNCTION public.get_my_events()
RETURNS TABLE(
  id uuid,
  title text,
  slug text,
  status public.publish_status,
  start_at timestamptz,
  city text,
  can_edit boolean,
  archived_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select distinct on (e.id)
    e.id,
    e.title,
    e.slug,
    e.status,
    e.start_at,
    e.city,
    (public.is_admin() or public.can_edit_event(e.id)) as can_edit,
    e.archived_at
  from public.events e
  where
    public.is_admin()
    or e.created_by = auth.uid()
    or (e.host_entity_id is not null and exists (
      select 1 from public.entity_team et
      where et.entity_id = e.host_entity_id
        and et.user_id = auth.uid()
        and et.left_at is null
    ))
    or public.can_view_runsheet_event(e.id)
    or exists (
      select 1 from public.festival_events fe
      where fe.event_id = e.id
        and public.can_view_runsheet_festival(fe.festival_id)
    )
  order by e.id, e.start_at desc;
$$;
