
-- 1) Update has_backstage_access() to allow on_stage artists with can_view_runsheet
CREATE OR REPLACE FUNCTION public.has_backstage_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR public.is_staff()
  OR EXISTS (
    SELECT 1
    FROM public.festival_participants fp
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE p.user_id = auth.uid()
      AND (
        fp.zone IN ('host', 'backstage')
        OR (fp.zone = 'on_stage' AND fp.can_view_runsheet = true)
      )
  )
$$;

-- 2) Create RPC to sync artist runsheet access from project memberships
CREATE OR REPLACE FUNCTION public.sync_festival_artist_runsheet_access(p_festival_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH festival_entities AS (
    SELECT DISTINCT eps.entity_id AS entity_id
    FROM public.event_program_slots eps
    WHERE eps.festival_id = p_festival_id
      AND eps.entity_id IS NOT NULL

    UNION

    SELECT DISTINCT eps.performer_entity_id AS entity_id
    FROM public.event_program_slots eps
    WHERE eps.festival_id = p_festival_id
      AND eps.performer_entity_id IS NOT NULL

    UNION

    SELECT DISTINCT ee.entity_id AS entity_id
    FROM public.festival_events fe
    JOIN public.event_entities ee ON ee.event_id = fe.event_id
    WHERE fe.festival_id = p_festival_id
  ),

  festival_project_users AS (
    SELECT DISTINCT et.user_id
    FROM festival_entities fe
    JOIN public.entity_team et ON et.entity_id = fe.entity_id
    WHERE et.left_at IS NULL
  ),

  festival_personas AS (
    SELECT DISTINCT p.id AS persona_id
    FROM festival_project_users u
    JOIN public.personas p ON p.user_id = u.user_id
    WHERE p.is_public = true
  )

  INSERT INTO public.festival_participants (
    festival_id, zone, participant_kind, participant_id,
    role_label, sort_order,
    can_edit_festival, can_edit_events, can_access_media,
    can_scan_tickets, can_see_ticket_stats, can_create_internal_ticket,
    can_see_report, can_see_revenue, can_edit_festival_media,
    can_view_runsheet
  )
  SELECT
    p_festival_id,
    'on_stage', 'persona', fp.persona_id,
    NULL, 1000,
    false, false, false,
    false, false, false,
    false, false, false,
    true
  FROM festival_personas fp
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.festival_participants existing
    WHERE existing.festival_id = p_festival_id
      AND existing.participant_kind = 'persona'
      AND existing.participant_id = fp.persona_id
  );
END;
$$;
