
ALTER TABLE public.event_program_slots
  ADD COLUMN IF NOT EXISTS parallel_group_id uuid;

COMMENT ON COLUMN public.event_program_slots.parallel_group_id IS
  'Groups slots that run in parallel (share time, duration, sequence number etc.).';

CREATE INDEX IF NOT EXISTS idx_event_program_slots_parallel_group
  ON public.event_program_slots(parallel_group_id);
