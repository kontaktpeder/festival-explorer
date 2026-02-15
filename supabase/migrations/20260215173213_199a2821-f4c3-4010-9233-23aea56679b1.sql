
-- Drop old function signature first (returns TABLE with 2 columns)
DROP FUNCTION IF EXISTS public.get_user_entities();

-- 1. entity_team.persona_id
ALTER TABLE public.entity_team
  ADD COLUMN IF NOT EXISTS persona_id uuid NULL REFERENCES public.personas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_entity_team_persona_id ON public.entity_team(persona_id);

-- 2. access_invitations.invited_persona_id
ALTER TABLE public.access_invitations
  ADD COLUMN IF NOT EXISTS invited_persona_id uuid NULL REFERENCES public.personas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_access_invitations_invited_persona_id ON public.access_invitations(invited_persona_id);

-- 3. get_user_entities with persona_id
CREATE OR REPLACE FUNCTION public.get_user_entities()
RETURNS TABLE(entity_id uuid, access access_level, persona_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT et.entity_id, et.access, et.persona_id
  FROM public.entity_team et
  JOIN public.entities e ON e.id = et.entity_id
  WHERE et.user_id = auth.uid()
    AND et.left_at IS NULL
    AND e.is_system = false
$$;

-- 4. accept_invitation_by_id: set persona_id on accept
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

  SELECT * INTO inv
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
  FROM public.entities WHERE is_system = true LIMIT 1;

  IF platform_entity_id IS NOT NULL AND inv.entity_id = platform_entity_id THEN
    IF EXISTS (SELECT 1 FROM public.platform_access WHERE user_id = auth.uid() AND revoked_at IS NULL) THEN
      UPDATE public.platform_access
      SET access_level = inv.access, role_labels = COALESCE(inv.role_labels, '{}'), updated_at = now()
      WHERE user_id = auth.uid() AND revoked_at IS NULL;
    ELSE
      INSERT INTO public.platform_access (user_id, access_level, role_labels, granted_by, granted_at)
      VALUES (auth.uid(), inv.access, COALESCE(inv.role_labels, '{}'), inv.invited_by, now());
    END IF;
  ELSE
    SELECT id INTO existing_team_id
    FROM public.entity_team
    WHERE entity_id = inv.entity_id AND user_id = auth.uid()
    ORDER BY joined_at DESC LIMIT 1;

    IF existing_team_id IS NULL THEN
      INSERT INTO public.entity_team (entity_id, user_id, access, role_labels, is_public, left_at, persona_id)
      VALUES (inv.entity_id, auth.uid(), inv.access, COALESCE(inv.role_labels, '{}'), false, NULL, inv.invited_persona_id);
    ELSE
      UPDATE public.entity_team
      SET access = inv.access,
          role_labels = COALESCE(inv.role_labels, '{}'),
          left_at = NULL,
          persona_id = COALESCE(inv.invited_persona_id, entity_team.persona_id)
      WHERE id = existing_team_id;
    END IF;

    INSERT INTO public.platform_access (user_id, access_level, role_labels, granted_by, granted_at)
    SELECT auth.uid(), 'viewer'::access_level, ARRAY[]::TEXT[], inv.invited_by, now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.platform_access WHERE user_id = auth.uid() AND revoked_at IS NULL
    );
  END IF;

  UPDATE public.access_invitations SET status = 'accepted', accepted_at = now() WHERE id = p_invitation_id;
  SELECT * INTO inv FROM public.access_invitations WHERE id = p_invitation_id;
  RETURN inv;
END;
$$;

-- 5. accept_invitation_by_token: also set persona_id
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

  UPDATE public.access_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;
  SELECT * INTO inv FROM public.access_invitations WHERE id = inv.id;
  RETURN inv;
END;
$$;

-- 6. RPC to manually set persona on existing membership
CREATE OR REPLACE FUNCTION public.set_entity_team_persona(p_entity_id uuid, p_persona_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.personas WHERE id = p_persona_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Persona not found or not yours';
  END IF;
  UPDATE public.entity_team
  SET persona_id = p_persona_id
  WHERE entity_id = p_entity_id AND user_id = auth.uid() AND left_at IS NULL;
END;
$$;
