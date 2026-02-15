
-- 1) Add festival_id column to access_invitations
ALTER TABLE public.access_invitations
  ADD COLUMN IF NOT EXISTS festival_id uuid REFERENCES public.festivals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_access_invitations_festival_id ON public.access_invitations(festival_id);

-- 2) Create pending_festival_team_invites table
CREATE TABLE IF NOT EXISTS public.pending_festival_team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  festival_id uuid NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, festival_id)
);
CREATE INDEX IF NOT EXISTS idx_pending_festival_team_invites_user ON public.pending_festival_team_invites(user_id);

ALTER TABLE public.pending_festival_team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pending festival invites"
  ON public.pending_festival_team_invites FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No direct insert/delete by users – only via SECURITY DEFINER RPCs

-- 3) Update accept_invitation_by_token to queue festival team membership
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token text)
RETURNS access_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.access_invitations%ROWTYPE;
  platform_entity_id UUID;
  existing_team_id UUID;
  existing_platform_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO inv
  FROM public.access_invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired';
  END IF;

  IF lower(inv.email) <> lower(COALESCE(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'Invitation email mismatch';
  END IF;

  SELECT id INTO platform_entity_id FROM public.entities WHERE is_system = true LIMIT 1;

  IF platform_entity_id IS NOT NULL AND inv.entity_id = platform_entity_id THEN
    SELECT id INTO existing_platform_id
    FROM public.platform_access WHERE user_id = auth.uid() AND revoked_at IS NULL LIMIT 1;

    IF existing_platform_id IS NULL THEN
      INSERT INTO public.platform_access (user_id, access_level, role_labels, granted_by, granted_at)
      VALUES (auth.uid(), inv.access, inv.role_labels, inv.invited_by, now());
    ELSE
      UPDATE public.platform_access
      SET access_level = inv.access, role_labels = inv.role_labels, updated_at = now()
      WHERE id = existing_platform_id;
    END IF;
  ELSE
    SELECT id INTO existing_team_id
    FROM public.entity_team
    WHERE entity_id = inv.entity_id AND user_id = auth.uid()
    ORDER BY joined_at DESC LIMIT 1;

    IF existing_team_id IS NULL THEN
      INSERT INTO public.entity_team (entity_id, user_id, access, role_labels, is_public, left_at, persona_id)
      VALUES (inv.entity_id, auth.uid(), inv.access, inv.role_labels, false, NULL, inv.invited_persona_id);
    ELSE
      UPDATE public.entity_team
      SET access = inv.access, role_labels = inv.role_labels, left_at = NULL,
          persona_id = COALESCE(inv.invited_persona_id, entity_team.persona_id)
      WHERE id = existing_team_id;
    END IF;

    INSERT INTO public.platform_access (user_id, access_level, role_labels, granted_by, granted_at)
    SELECT auth.uid(), 'viewer'::access_level, ARRAY[]::TEXT[], inv.invited_by, now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.platform_access WHERE user_id = auth.uid() AND revoked_at IS NULL
    );
  END IF;

  -- Queue festival team membership if invitation is linked to a festival
  IF inv.festival_id IS NOT NULL THEN
    INSERT INTO public.pending_festival_team_invites (user_id, festival_id)
    VALUES (auth.uid(), inv.festival_id)
    ON CONFLICT (user_id, festival_id) DO NOTHING;
  END IF;

  UPDATE public.access_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;
  SELECT * INTO inv FROM public.access_invitations WHERE id = inv.id;
  RETURN inv;
END;
$$;

-- 4) RPC: add persona to all pending festival teams
CREATE OR REPLACE FUNCTION public.add_pending_festival_teams_for_persona(p_persona_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_added integer := 0;
  r record;
BEGIN
  SELECT user_id INTO v_user_id FROM public.personas WHERE id = p_persona_id AND user_id = auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Persona not found or not yours';
  END IF;

  FOR r IN
    SELECT festival_id FROM public.pending_festival_team_invites WHERE user_id = v_user_id
  LOOP
    -- Only insert if not already a participant
    IF NOT EXISTS (
      SELECT 1 FROM public.festival_participants
      WHERE festival_id = r.festival_id AND participant_id = p_persona_id AND participant_kind = 'persona'
    ) THEN
      INSERT INTO public.festival_participants (
        festival_id, participant_id, participant_kind, zone,
        role_label, is_public,
        can_edit_festival, can_edit_events, can_access_media, can_scan_tickets
      ) VALUES (
        r.festival_id, p_persona_id, 'persona', 'backstage',
        NULL, false,
        false, true, true, true
      );
      v_added := v_added + 1;
    END IF;
  END LOOP;

  DELETE FROM public.pending_festival_team_invites WHERE user_id = v_user_id;
  RETURN v_added;
END;
$$;
