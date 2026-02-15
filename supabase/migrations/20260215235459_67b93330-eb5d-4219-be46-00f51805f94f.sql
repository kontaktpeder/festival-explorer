
-- 1) venue_staff table (persona-based, matching festival_participants pattern)
CREATE TABLE IF NOT EXISTS public.venue_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff',
  can_edit_venue BOOLEAN NOT NULL DEFAULT false,
  can_manage_staff BOOLEAN NOT NULL DEFAULT false,
  can_manage_events BOOLEAN NOT NULL DEFAULT false,
  can_scan_tickets BOOLEAN NOT NULL DEFAULT false,
  can_access_media BOOLEAN NOT NULL DEFAULT false,
  can_view_ticket_stats BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, persona_id)
);

CREATE INDEX IF NOT EXISTS venue_staff_venue_id_idx ON public.venue_staff(venue_id);
CREATE INDEX IF NOT EXISTS venue_staff_persona_id_idx ON public.venue_staff(persona_id);

-- 2) Index for events.venue_id lookups
CREATE INDEX IF NOT EXISTS events_venue_id_idx ON public.events(venue_id);

-- 3) RLS
ALTER TABLE public.venue_staff ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is venue staff via persona
CREATE OR REPLACE FUNCTION public.is_venue_staff_member(p_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venues v
    WHERE v.id = p_venue_id AND v.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.venue_staff vs
    JOIN public.personas p ON p.id = vs.persona_id
    WHERE vs.venue_id = p_venue_id AND p.user_id = auth.uid()
  );
$$;

-- Helper: check if user can manage venue staff
CREATE OR REPLACE FUNCTION public.can_manage_venue(p_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.venues v
    WHERE v.id = p_venue_id AND v.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.venue_staff vs
    JOIN public.personas p ON p.id = vs.persona_id
    WHERE vs.venue_id = p_venue_id
      AND p.user_id = auth.uid()
      AND (vs.can_manage_staff = true OR vs.can_edit_venue = true)
  );
$$;

-- RLS Policies
CREATE POLICY "Admin full access on venue_staff"
ON public.venue_staff FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Venue members can view staff"
ON public.venue_staff FOR SELECT TO authenticated
USING (public.is_venue_staff_member(venue_id));

CREATE POLICY "Venue managers can insert staff"
ON public.venue_staff FOR INSERT TO authenticated
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue managers can update staff"
ON public.venue_staff FOR UPDATE TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue managers can delete staff"
ON public.venue_staff FOR DELETE TO authenticated
USING (public.can_manage_venue(venue_id));
