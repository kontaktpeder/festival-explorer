-- Add can_view_runsheet flag to festival_participants
ALTER TABLE public.festival_participants
ADD COLUMN IF NOT EXISTS can_view_runsheet boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.festival_participants.can_view_runsheet
IS 'Kan se kjøreplan (read-only backstage).';

-- RLS policy: festival participants with can_view_runsheet can read program slots
CREATE POLICY "festival participants can view runsheet"
ON public.event_program_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.festival_participants fp
    JOIN public.personas p
      ON fp.participant_kind = 'persona'
     AND fp.participant_id = p.id
    WHERE fp.festival_id = event_program_slots.festival_id
      AND fp.can_view_runsheet = true
      AND p.user_id = auth.uid()
  )
);