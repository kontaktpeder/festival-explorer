create policy "Team members can view their events"
on public.events
for select
to authenticated
using (
  can_edit_event(id)
  OR can_view_runsheet_event(id)
  OR exists (
    select 1 from public.festival_events fe
    where fe.event_id = events.id
      and can_view_runsheet_festival(fe.festival_id)
  )
  OR (host_entity_id is not null and exists (
    select 1 from public.entity_team et
    where et.entity_id = events.host_entity_id
      and et.user_id = auth.uid()
      and et.left_at is null
  ))
);