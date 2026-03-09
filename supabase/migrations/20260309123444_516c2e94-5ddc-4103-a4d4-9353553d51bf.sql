-- 1) Backfill festival_id on existing event_program_slots
UPDATE public.event_program_slots eps
SET festival_id = fe.festival_id
FROM public.festival_events fe
WHERE eps.event_id = fe.event_id
  AND eps.festival_id IS NULL;

-- 2) Index for festival queries
CREATE INDEX IF NOT EXISTS idx_event_program_slots_festival_starts
  ON public.event_program_slots(festival_id, starts_at);

-- 3) Trigger function: auto-set festival_id from event_id
CREATE OR REPLACE FUNCTION public.set_event_program_slot_festival_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.festival_id IS NULL AND NEW.event_id IS NOT NULL THEN
    SELECT fe.festival_id
    INTO NEW.festival_id
    FROM public.festival_events fe
    WHERE fe.event_id = NEW.event_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_event_program_slot_festival_id
  ON public.event_program_slots;

CREATE TRIGGER trg_set_event_program_slot_festival_id
BEFORE INSERT OR UPDATE ON public.event_program_slots
FOR EACH ROW
EXECUTE FUNCTION public.set_event_program_slot_festival_id();

-- 4) RLS policy for festival team to manage slots via festival_id
CREATE POLICY "Festival team manage slots via festival_id"
  ON public.event_program_slots
  FOR ALL
  TO authenticated
  USING (
    festival_id IS NOT NULL AND is_festival_team_member(festival_id)
  )
  WITH CHECK (
    festival_id IS NOT NULL AND is_festival_team_member(festival_id)
  );