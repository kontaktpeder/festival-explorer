-- Allow authenticated users to insert their own events
CREATE POLICY "Users can insert own events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Allow event editors (creator, host entity team, festival editors) to update
CREATE POLICY "Event editors can update events"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_event(id))
  WITH CHECK (public.can_edit_event(id));