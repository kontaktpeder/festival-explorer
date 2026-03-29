CREATE INDEX IF NOT EXISTS idx_event_program_slots_section_sequence
  ON public.event_program_slots (section_id, sequence_number NULLS LAST, starts_at);