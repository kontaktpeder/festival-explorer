-- ============================================
-- Fix accept_invitation_by_token: Auto-create platform_access
-- ============================================

CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token text)
RETURNS public.access_invitations
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

  -- Get invitation with lock
  SELECT *
  INTO inv
  FROM public.access_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired';
  END IF;

  -- Verify email matches
  IF lower(inv.email) <> lower(COALESCE(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'Invitation email mismatch';
  END IF;

  -- Get Platform entity ID (system entity for platform-wide invitations)
  SELECT id INTO platform_entity_id
  FROM public.entities
  WHERE is_system = true
  LIMIT 1;

  -- Check if this is a platform invitation
  IF platform_entity_id IS NOT NULL AND inv.entity_id = platform_entity_id THEN
    -- Handle platform access invitation
    SELECT id INTO existing_platform_id
    FROM public.platform_access
    WHERE user_id = auth.uid()
      AND revoked_at IS NULL
    LIMIT 1;

    IF existing_platform_id IS NULL THEN
      INSERT INTO public.platform_access (
        user_id,
        access_level,
        role_labels,
        granted_by,
        granted_at
      ) VALUES (
        auth.uid(),
        inv.access,
        inv.role_labels,
        inv.invited_by,
        now()
      );
    ELSE
      UPDATE public.platform_access
      SET
        access_level = inv.access,
        role_labels = inv.role_labels,
        updated_at = now()
      WHERE id = existing_platform_id;
    END IF;
  ELSE
    -- Handle entity team invitation
    SELECT id INTO existing_team_id
    FROM public.entity_team
    WHERE entity_id = inv.entity_id
      AND user_id = auth.uid()
    ORDER BY joined_at DESC
    LIMIT 1;

    IF existing_team_id IS NULL THEN
      INSERT INTO public.entity_team (
        entity_id,
        user_id,
        access,
        role_labels,
        is_public,
        left_at
      ) VALUES (
        inv.entity_id,
        auth.uid(),
        inv.access,
        inv.role_labels,
        false,
        NULL
      );
    ELSE
      UPDATE public.entity_team
      SET
        access = inv.access,
        role_labels = inv.role_labels,
        left_at = NULL
      WHERE id = existing_team_id;
    END IF;

    -- AUTO-CREATE platform_access if not exists
    -- This ensures dashboard access after entity invitation
    INSERT INTO public.platform_access (
      user_id,
      access_level,
      role_labels,
      granted_by,
      granted_at
    )
    SELECT 
      auth.uid(),
      'viewer'::access_level,
      ARRAY[]::TEXT[],
      inv.invited_by,
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.platform_access
      WHERE user_id = auth.uid()
        AND revoked_at IS NULL
    );
  END IF;

  -- Mark invitation as accepted
  UPDATE public.access_invitations
  SET
    status = 'accepted',
    accepted_at = now()
  WHERE id = inv.id;

  -- Return updated invitation
  SELECT * INTO inv FROM public.access_invitations WHERE id = inv.id;
  RETURN inv;
END;
$$;