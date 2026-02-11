
-- Function: user has backstage access (admin, crew, or festival team)
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
    AND fp.zone IN ('host', 'backstage')
  )
$$;

-- Function: user is festival team member for a specific festival
CREATE OR REPLACE FUNCTION public.is_festival_team_member(p_festival_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.festival_participants fp
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE fp.festival_id = p_festival_id
    AND p.user_id = auth.uid()
    AND fp.zone IN ('host', 'backstage')
  )
$$;

-- RLS: festival team can update their festivals
CREATE POLICY "Festival team can update festivals"
  ON public.festivals FOR UPDATE
  TO authenticated
  USING (public.is_festival_team_member(id))
  WITH CHECK (public.is_festival_team_member(id));

-- RLS: festival team can manage festival_sections
CREATE POLICY "Festival team can manage festival_sections"
  ON public.festival_sections FOR ALL
  TO authenticated
  USING (public.is_festival_team_member(festival_id))
  WITH CHECK (public.is_festival_team_member(festival_id));

-- RLS: festival team can manage festival_participants
CREATE POLICY "Festival team can manage their festival_participants"
  ON public.festival_participants FOR ALL
  TO authenticated
  USING (public.is_festival_team_member(festival_id))
  WITH CHECK (public.is_festival_team_member(festival_id));
