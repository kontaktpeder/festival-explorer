
-- 1) Ansvar-tags på festivallag
ALTER TABLE public.festival_participants
  ADD COLUMN IF NOT EXISTS domain_responsibilities text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.festival_participants.domain_responsibilities IS
  'F.eks. lineup, contracts, promo. Brukes til default owner på event_issue.';

-- 2) Operative issues
CREATE TABLE IF NOT EXISTS public.event_issue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id uuid REFERENCES public.festivals(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  waiting_on text,
  owner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_program_slot_id uuid NOT NULL REFERENCES public.event_program_slots(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_at timestamptz,
  resolved_at timestamptz,
  CONSTRAINT event_issue_scope_check CHECK (festival_id IS NOT NULL OR event_id IS NOT NULL)
);

-- Validation trigger for severity
CREATE OR REPLACE FUNCTION public.validate_event_issue_fields()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.severity NOT IN ('critical', 'high', 'medium', 'low') THEN
    RAISE EXCEPTION 'Invalid severity: %', NEW.severity;
  END IF;
  IF NEW.status NOT IN ('open', 'handled', 'resolved') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.waiting_on IS NOT NULL AND NEW.waiting_on NOT IN ('artist', 'organizer', 'internal', 'venue', 'external') THEN
    RAISE EXCEPTION 'Invalid waiting_on: %', NEW.waiting_on;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_issue
  BEFORE INSERT OR UPDATE ON public.event_issue
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_issue_fields();

-- Indexes
CREATE INDEX IF NOT EXISTS event_issue_open_idx
  ON public.event_issue (festival_id, status)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS event_issue_event_open_idx
  ON public.event_issue (event_id, status)
  WHERE status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS event_issue_one_open_cancel_per_slot_idx
  ON public.event_issue (related_program_slot_id)
  WHERE type = 'artist_cancelled' AND status = 'open';

COMMENT ON TABLE public.event_issue IS 'Operative saker; MVP: artist_cancelled knyttet til program-slot.';

-- 3) RLS
ALTER TABLE public.event_issue ENABLE ROW LEVEL SECURITY;

-- Select: backstage access
CREATE POLICY "Backstage users can view issues"
  ON public.event_issue FOR SELECT
  TO authenticated
  USING (public.has_backstage_access());

-- Insert: users who can edit events
CREATE POLICY "Event editors can create issues"
  ON public.event_issue FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (festival_id IS NOT NULL AND public.can_edit_events(festival_id))
    OR (event_id IS NOT NULL AND public.can_edit_event(event_id))
  );

-- Update: users who can edit events
CREATE POLICY "Event editors can update issues"
  ON public.event_issue FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (festival_id IS NOT NULL AND public.can_edit_events(festival_id))
    OR (event_id IS NOT NULL AND public.can_edit_event(event_id))
  );

-- Delete: users who can edit events
CREATE POLICY "Event editors can delete issues"
  ON public.event_issue FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (festival_id IS NOT NULL AND public.can_edit_events(festival_id))
    OR (event_id IS NOT NULL AND public.can_edit_event(event_id))
  );
