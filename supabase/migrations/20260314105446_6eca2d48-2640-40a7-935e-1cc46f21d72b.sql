-- Allow anon users to read event_program_slots tied to a published festival
CREATE POLICY "Public read visible festival program slots"
ON public.event_program_slots
FOR SELECT
TO public
USING (
  is_visible_public = true
  AND is_canceled = false
  AND festival_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM festivals f
    WHERE f.id = event_program_slots.festival_id
      AND f.status = 'published'
  )
);