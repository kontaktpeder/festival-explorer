-- Allow manual/internal slots without an event
ALTER TABLE public.event_program_slots
  ALTER COLUMN event_id DROP NOT NULL;