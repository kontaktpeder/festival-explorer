
CREATE OR REPLACE FUNCTION public.sync_event_program_slot_performer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
