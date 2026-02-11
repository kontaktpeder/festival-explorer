
-- Festival team can view their festivals
CREATE POLICY "Festival team can select their festivals"
  ON public.festivals FOR SELECT
  TO authenticated
  USING (public.is_festival_team_member(id));

-- Festival team can manage festival_events for their festivals
CREATE POLICY "Festival team can manage festival_events"
  ON public.festival_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      WHERE f.id = festival_events.festival_id
      AND public.is_festival_team_member(f.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.festivals f
      WHERE f.id = festival_events.festival_id
      AND public.is_festival_team_member(f.id)
    )
  );
