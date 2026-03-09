ALTER TABLE public.event_program_slots
  ADD COLUMN IF NOT EXISTS title_override text,
  ADD COLUMN IF NOT EXISTS stage_label text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS sequence_number integer;

COMMENT ON COLUMN public.event_program_slots.title_override IS 'Overstyrt tittel for kjøreplan';
COMMENT ON COLUMN public.event_program_slots.stage_label IS 'Scene / område label';
COMMENT ON COLUMN public.event_program_slots.duration_minutes IS 'Varighet i minutter';
COMMENT ON COLUMN public.event_program_slots.sequence_number IS 'Løpenummer i kjøreplanen';