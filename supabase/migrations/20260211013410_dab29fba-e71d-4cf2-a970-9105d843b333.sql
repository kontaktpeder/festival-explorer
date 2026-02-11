
-- Tillatelser per festival-deltaker
ALTER TABLE public.festival_participants
ADD COLUMN IF NOT EXISTS can_edit_festival boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_media boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_scan_tickets boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_see_ticket_stats boolean DEFAULT false;

COMMENT ON COLUMN public.festival_participants.can_edit_festival IS 'Kan redigere festival (innstillinger, seksjoner, team)';
COMMENT ON COLUMN public.festival_participants.can_access_media IS 'Kan bruke filbank';
COMMENT ON COLUMN public.festival_participants.can_scan_tickets IS 'Kan skanne billetter';
COMMENT ON COLUMN public.festival_participants.can_see_ticket_stats IS 'Kan se billettstatistikk';

-- Har bruker tillatelse til å redigere denne festivalen?
CREATE OR REPLACE FUNCTION public.can_edit_festival(p_festival_id uuid)
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
    AND fp.can_edit_festival = true
  )
$$;

-- Har bruker tillatelse til å skanne billetter (for minst én festival)?
CREATE OR REPLACE FUNCTION public.can_scan_tickets_any()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.is_staff()
  OR EXISTS (
    SELECT 1 FROM public.festival_participants fp
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE p.user_id = auth.uid()
    AND fp.zone IN ('host', 'backstage')
    AND fp.can_scan_tickets = true
  )
$$;

-- Har bruker tillatelse til å se billettstatistikk (for minst én festival)?
CREATE OR REPLACE FUNCTION public.can_see_ticket_stats_any()
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
    AND fp.can_see_ticket_stats = true
  )
$$;

-- Har bruker tillatelse til å se lineup for dette eventet?
CREATE OR REPLACE FUNCTION public.can_view_event_lineup(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.festival_events fe
    JOIN public.festival_participants fp ON fp.festival_id = fe.festival_id
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE fe.event_id = p_event_id
    AND p.user_id = auth.uid()
    AND fp.zone IN ('host', 'backstage')
  )
$$;

-- Har bruker tillatelse til å redigere program?
CREATE OR REPLACE FUNCTION public.can_edit_festival_program(p_festival_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_edit_festival(p_festival_id)
$$;
