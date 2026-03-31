
-- 1) Update zone check constraint to allow both legacy and new zones
ALTER TABLE public.event_participants DROP CONSTRAINT IF EXISTS event_participants_zone_check;
ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_zone_check
  CHECK (zone IN ('on_stage','backstage','host','lineup','crew','technical','other'));

-- 2) Update participant_kind to allow 'offline'
ALTER TABLE public.event_participants DROP CONSTRAINT IF EXISTS event_participants_participant_kind_check;
ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_participant_kind_check
  CHECK (participant_kind IN ('persona','entity','project','offline'));

-- 3) Add offline_name column
ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS offline_name text;

-- 4) Make participant_id nullable for offline actors
ALTER TABLE public.event_participants
  ALTER COLUMN participant_id DROP NOT NULL;

-- 5) Offline actors must have a name
ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_offline_name_required
  CHECK (participant_kind <> 'offline' OR (offline_name IS NOT NULL AND length(trim(offline_name)) > 0));

-- 6) Non-offline actors must have participant_id
ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_participant_id_required
  CHECK (participant_kind = 'offline' OR participant_id IS NOT NULL);

-- 7) Useful index for zone-based queries
CREATE INDEX IF NOT EXISTS idx_event_participants_zone_sort
  ON public.event_participants(event_id, zone, sort_order);

-- 8) Validation trigger for event_invitations status
CREATE OR REPLACE FUNCTION public.validate_event_invitation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('pending','accepted','declined','revoked','expired') THEN
    RAISE EXCEPTION 'Ugyldig status: %', NEW.status;
  END IF;
  IF NEW.access_on_accept NOT IN ('viewer','editor','admin','crew') THEN
    RAISE EXCEPTION 'Ugyldig access_on_accept: %', NEW.access_on_accept;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_event_invitation ON public.event_invitations;
CREATE TRIGGER trg_validate_event_invitation
  BEFORE INSERT OR UPDATE ON public.event_invitations
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_invitation();
