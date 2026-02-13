
-- Invitasjon kan knyttes til bruker (persona) i tillegg til e-post
ALTER TABLE public.access_invitations
  ADD COLUMN IF NOT EXISTS invited_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.access_invitations
  ALTER COLUMN email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_access_invitations_invited_user_id
  ON public.access_invitations(invited_user_id);

COMMENT ON COLUMN public.access_invitations.invited_user_id IS
  'Når satt: invitasjon er sendt til denne brukeren (f.eks. fra «Inviter fra plattformen»).';

-- Brukere kan se egne invitasjoner (e-post ELLER invited_user_id)
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.access_invitations;

CREATE POLICY "Users can view their own invitations"
ON public.access_invitations
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND expires_at > now()
  AND (
    lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))
    OR invited_user_id = auth.uid()
  )
);

-- Akseptere invitasjon by id (for inn-app, når invited_user_id er satt)
CREATE OR REPLACE FUNCTION public.accept_invitation_by_id(p_invitation_id uuid)
RETURNS public.access_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.access_invitations%ROWTYPE;
  existing_team_id uuid;
  platform_entity_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO inv
  FROM public.access_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > now()
    AND invited_user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired';
  END IF;

  SELECT id INTO platform_entity_id
  FROM public.entities
  WHERE is_system = true
  LIMIT 1;

  IF platform_entity_id IS NOT NULL AND inv.entity_id = platform_entity_id THEN
    -- Platform access invitation
    IF EXISTS (SELECT 1 FROM public.platform_access WHERE user_id = auth.uid() AND revoked_at IS NULL) THEN
      UPDATE public.platform_access
      SET access_level = inv.access, role_labels = COALESCE(inv.role_labels, '{}'), updated_at = now()
      WHERE user_id = auth.uid() AND revoked_at IS NULL;
    ELSE
      INSERT INTO public.platform_access (user_id, access_level, role_labels, granted_by, granted_at)
      VALUES (auth.uid(), inv.access, COALESCE(inv.role_labels, '{}'), inv.invited_by, now());
    END IF;
  ELSE
    -- Entity team invitation
    SELECT id INTO existing_team_id
    FROM public.entity_team
    WHERE entity_id = inv.entity_id AND user_id = auth.uid()
    ORDER BY joined_at DESC
    LIMIT 1;

    IF existing_team_id IS NULL THEN
      INSERT INTO public.entity_team (entity_id, user_id, access, role_labels, is_public, left_at)
      VALUES (inv.entity_id, auth.uid(), inv.access, COALESCE(inv.role_labels, '{}'), false, NULL);
    ELSE
      UPDATE public.entity_team
      SET access = inv.access, role_labels = COALESCE(inv.role_labels, '{}'), left_at = NULL
      WHERE id = existing_team_id;
    END IF;

    -- Auto-grant platform_access if not exists
    INSERT INTO public.platform_access (user_id, access_level, role_labels, granted_by, granted_at)
    SELECT auth.uid(), 'viewer'::access_level, ARRAY[]::TEXT[], inv.invited_by, now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.platform_access WHERE user_id = auth.uid() AND revoked_at IS NULL
    );
  END IF;

  UPDATE public.access_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = p_invitation_id;

  SELECT * INTO inv FROM public.access_invitations WHERE id = p_invitation_id;
  RETURN inv;
END;
$$;
