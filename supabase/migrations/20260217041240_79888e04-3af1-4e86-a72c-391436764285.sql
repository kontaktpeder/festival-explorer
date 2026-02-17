
-- ============================================
-- 1. EVENT INVITATIONS (persona-basert)
-- ============================================

CREATE TABLE public.event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  access_on_accept TEXT NOT NULL DEFAULT 'viewer',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, entity_id)
);

COMMENT ON TABLE public.event_invitations IS 'Invitasjoner fra arrangør-persona til prosjekt om å delta i event.';
COMMENT ON COLUMN public.event_invitations.invited_by IS 'Persona som inviterer (arrangør-persona).';

CREATE INDEX idx_event_invitations_event_id ON public.event_invitations(event_id);
CREATE INDEX idx_event_invitations_entity_id ON public.event_invitations(entity_id);
CREATE INDEX idx_event_invitations_invited_by ON public.event_invitations(invited_by);
CREATE INDEX idx_event_invitations_status ON public.event_invitations(status);

-- Validation trigger (i stedet for CHECK constraints)
CREATE OR REPLACE FUNCTION public.validate_event_invitation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'accepted', 'declined') THEN
    RAISE EXCEPTION 'Ugyldig status: %', NEW.status;
  END IF;
  IF NEW.access_on_accept NOT IN ('viewer', 'editor', 'admin') THEN
    RAISE EXCEPTION 'Ugyldig access_on_accept: %', NEW.access_on_accept;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_event_invitation_trigger
  BEFORE INSERT OR UPDATE ON public.event_invitations
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_invitation();

-- updated_at trigger
CREATE TRIGGER event_invitations_updated_at
  BEFORE UPDATE ON public.event_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 2. ADD is_visible_public TO event_program_slots
-- ============================================

ALTER TABLE public.event_program_slots
  ADD COLUMN IF NOT EXISTS is_visible_public BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.event_program_slots.is_visible_public IS 'false = kun backstage, true = synlig på publikumssiden';

-- Replace existing public read policy to require is_visible_public
DROP POLICY IF EXISTS "Public read published event_program_slots" ON public.event_program_slots;

CREATE POLICY "Public read visible event_program_slots"
ON public.event_program_slots FOR SELECT
USING (
  is_visible_public = true
  AND is_canceled = false
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_program_slots.event_id
    AND e.status = 'published'::publish_status
  )
);

-- ============================================
-- 3. RLS for event_invitations
-- ============================================

ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access event_invitations"
ON public.event_invitations FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Arrangør (can_edit_event) kan administrere invitasjoner
CREATE POLICY "Event arranger manage event_invitations"
ON public.event_invitations FOR ALL
USING (can_edit_event(event_id))
WITH CHECK (can_edit_event(event_id));

-- Entity team (owner/admin/editor) kan lese invitasjoner til sitt prosjekt
CREATE POLICY "Entity team read event_invitations"
ON public.event_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.entity_team et
    WHERE et.entity_id = event_invitations.entity_id
    AND et.user_id = auth.uid()
    AND et.left_at IS NULL
    AND et.access IN ('owner', 'admin', 'editor')
  )
);

-- Entity team kan oppdatere status (godta/avslå)
CREATE POLICY "Entity team update event_invitations"
ON public.event_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.entity_team et
    WHERE et.entity_id = event_invitations.entity_id
    AND et.user_id = auth.uid()
    AND et.left_at IS NULL
    AND et.access IN ('owner', 'admin', 'editor')
  )
);

-- ============================================
-- 4. RPC: Godta event-invitasjon
-- ============================================

CREATE OR REPLACE FUNCTION public.accept_event_invitation(p_invitation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.event_invitations%ROWTYPE;
  inviter_user_id UUID;
BEGIN
  SELECT * INTO inv FROM public.event_invitations
  WHERE id = p_invitation_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitasjon finnes ikke eller er allerede behandlet';
  END IF;

  -- Kun entity owner/admin/editor kan godta
  IF NOT EXISTS (
    SELECT 1 FROM public.entity_team et
    WHERE et.entity_id = inv.entity_id AND et.user_id = auth.uid()
    AND et.left_at IS NULL AND et.access IN ('owner', 'admin', 'editor')
  ) THEN
    RAISE EXCEPTION 'Du har ikke tilgang til å godta denne invitasjonen';
  END IF;

  -- Hent bruker-ID fra inviterende persona
  SELECT p.user_id INTO inviter_user_id
  FROM public.personas p
  WHERE p.id = inv.invited_by;

  IF inviter_user_id IS NULL THEN
    RAISE EXCEPTION 'Persona som inviterte finnes ikke';
  END IF;

  -- Legg til arrangørens bruker i entity_team (skip hvis allerede medlem)
  INSERT INTO public.entity_team (entity_id, user_id, access, role_labels, is_public, persona_id)
  SELECT inv.entity_id, inviter_user_id, inv.access_on_accept::access_level, '{}', false, inv.invited_by
  WHERE NOT EXISTS (
    SELECT 1 FROM public.entity_team et
    WHERE et.entity_id = inv.entity_id AND et.user_id = inviter_user_id AND et.left_at IS NULL
  );

  -- Oppdater invitasjonen
  UPDATE public.event_invitations
  SET status = 'accepted', responded_at = now(), updated_at = now()
  WHERE id = p_invitation_id;
END;
$$;

-- ============================================
-- 5. RPC: Kan arrangør bruke entity i eventet?
-- ============================================

CREATE OR REPLACE FUNCTION public.can_use_entity_in_event(p_event_id UUID, p_entity_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = p_event_id
    AND ep.participant_kind IN ('entity', 'project')
    AND ep.participant_id = p_entity_id
  )
  OR EXISTS (
    SELECT 1 FROM public.event_invitations ei
    WHERE ei.event_id = p_event_id AND ei.entity_id = p_entity_id AND ei.status = 'accepted'
  );
$$;
