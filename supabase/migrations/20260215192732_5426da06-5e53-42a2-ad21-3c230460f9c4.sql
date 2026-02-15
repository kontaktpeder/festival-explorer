
-- New permission column
ALTER TABLE public.festival_participants
  ADD COLUMN IF NOT EXISTS can_edit_events boolean DEFAULT false;

COMMENT ON COLUMN public.festival_participants.can_edit_events IS
  'Kan redigere events (program, medvirkende, tittel, beskrivelse). Hvis false: kun publikumsvisning.';

-- Can user edit events for a specific festival?
CREATE OR REPLACE FUNCTION public.can_edit_events(p_festival_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.festival_participants fp
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE fp.festival_id = p_festival_id
    AND p.user_id = auth.uid()
    AND fp.zone IN ('host', 'backstage')
    AND (fp.can_edit_events = true OR fp.can_edit_festival = true)
  )
$$;

-- Can user edit events for any festival? (for nav visibility)
CREATE OR REPLACE FUNCTION public.can_edit_events_any()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.festival_participants fp
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE p.user_id = auth.uid()
    AND fp.zone IN ('host', 'backstage')
    AND (fp.can_edit_events = true OR fp.can_edit_festival = true)
  )
$$;

-- Can user edit a specific event? (via host entity team OR festival permission)
CREATE OR REPLACE FUNCTION public.can_edit_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.entity_team et ON et.entity_id = e.host_entity_id AND et.left_at IS NULL
    WHERE e.id = p_event_id AND et.user_id = auth.uid() AND et.access IN ('owner', 'admin', 'editor')
  )
  OR EXISTS (
    SELECT 1 FROM public.festival_events fe
    JOIN public.festival_participants fp ON fp.festival_id = fe.festival_id
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE fe.event_id = p_event_id
    AND p.user_id = auth.uid()
    AND fp.zone IN ('host', 'backstage')
    AND (fp.can_edit_events = true OR fp.can_edit_festival = true)
  )
$$;
