-- SECURITY FIX + Invitation flow hardening
-- 1) Remove overly broad anon policy (avoid leaking emails/tokens)
DROP POLICY IF EXISTS "Anon can view pending invitations" ON public.access_invitations;

-- 2) Public RPC to fetch invitation details by unguessable token
--    This allows the accept page to render BEFORE login without exposing all invitations.
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', ai.id,
    'email', ai.email,
    'entity_id', ai.entity_id,
    'access', ai.access,
    'role_labels', ai.role_labels,
    'token', ai.token,
    'expires_at', ai.expires_at,
    'status', ai.status,
    'entity', CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'slug', e.slug,
      'type', e.type,
      'hero_image_url', e.hero_image_url
    ) END
  )
  INTO result
  FROM public.access_invitations ai
  LEFT JOIN public.entities e ON e.id = ai.entity_id
  WHERE ai.token = p_token
    AND ai.status = 'pending'
    AND ai.expires_at > now()
  LIMIT 1;

  RETURN result;
END;
$$;

-- 3) Secure RPC for accepting invitation (bypasses entity_team insert RLS safely)
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token text)
RETURNS public.access_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.access_invitations%ROWTYPE;
  existing_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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

  IF lower(inv.email) <> lower(COALESCE(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'Invitation email mismatch';
  END IF;

  -- Re-activate existing membership if previously left, otherwise insert new.
  SELECT et.id
    INTO existing_id
  FROM public.entity_team et
  WHERE et.entity_id = inv.entity_id
    AND et.user_id = auth.uid()
  ORDER BY et.joined_at DESC
  LIMIT 1;

  IF existing_id IS NULL THEN
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
    WHERE id = existing_id;
  END IF;

  UPDATE public.access_invitations
  SET
    status = 'accepted',
    accepted_at = now()
  WHERE id = inv.id;

  SELECT * INTO inv FROM public.access_invitations WHERE id = inv.id;
  RETURN inv;
END;
$$;