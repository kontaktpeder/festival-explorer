
-- 1) Nye kolonner for "På scenen"
ALTER TABLE public.event_program_slots
  ADD COLUMN IF NOT EXISTS performer_kind text NOT NULL DEFAULT 'entity',
  ADD COLUMN IF NOT EXISTS performer_entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS performer_persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS performer_name_override text;

COMMENT ON COLUMN public.event_program_slots.performer_kind IS
  'entity | persona | text – styrer hvordan performer-resolusjon skjer';
COMMENT ON COLUMN public.event_program_slots.performer_entity_id IS
  'Kobling til entities når performer_kind = entity';
COMMENT ON COLUMN public.event_program_slots.performer_persona_id IS
  'Kobling til personas når performer_kind = persona';
COMMENT ON COLUMN public.event_program_slots.performer_name_override IS
  'Fri tekst for "På scenen" når performer_kind = text';

-- 2) Backfill eksisterende data
UPDATE public.event_program_slots
SET performer_entity_id = entity_id
WHERE entity_id IS NOT NULL
  AND performer_entity_id IS NULL;

-- 3) Sync trigger for backwards compatibility
CREATE OR REPLACE FUNCTION public.sync_event_program_slot_performer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.performer_kind = 'entity' THEN
    NEW.entity_id := NEW.performer_entity_id;
  ELSE
    NEW.entity_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_event_program_slot_performer
  ON public.event_program_slots;

CREATE TRIGGER trg_sync_event_program_slot_performer
BEFORE INSERT OR UPDATE ON public.event_program_slots
FOR EACH ROW
EXECUTE FUNCTION public.sync_event_program_slot_performer();

-- 4) Indekser
CREATE INDEX IF NOT EXISTS idx_event_program_slots_performer_entity
  ON public.event_program_slots(performer_entity_id);
CREATE INDEX IF NOT EXISTS idx_event_program_slots_performer_persona
  ON public.event_program_slots(performer_persona_id);
