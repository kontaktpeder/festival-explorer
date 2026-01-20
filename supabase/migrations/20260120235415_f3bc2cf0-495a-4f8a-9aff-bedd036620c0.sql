-- ============================================
-- TASK 1: Create platform_access table
-- ============================================

-- Create platform_access table for user platform access (separate from entities)
CREATE TABLE public.platform_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  access_level access_level NOT NULL DEFAULT 'viewer',
  role_labels TEXT[] DEFAULT '{}',
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for active access (performance)
CREATE INDEX idx_platform_access_user_id_active 
  ON public.platform_access(user_id) 
  WHERE revoked_at IS NULL;

CREATE INDEX idx_platform_access_granted_by 
  ON public.platform_access(granted_by) 
  WHERE revoked_at IS NULL;

-- Create unique index for active access (only one active access per user)
CREATE UNIQUE INDEX platform_access_user_id_active_unique
  ON public.platform_access(user_id)
  WHERE revoked_at IS NULL;

-- Create updated_at trigger
CREATE TRIGGER update_platform_access_updated_at
  BEFORE UPDATE ON public.platform_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Enable RLS
-- ============================================

ALTER TABLE public.platform_access ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access on platform_access"
  ON public.platform_access FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can read their own access
CREATE POLICY "Users can view their own platform access"
  ON public.platform_access FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- Migrate existing Platform entity team members
-- ============================================

-- Migrate existing Platform entity team members to platform_access
INSERT INTO public.platform_access (user_id, access_level, role_labels, granted_by, granted_at)
SELECT 
  et.user_id,
  et.access,
  et.role_labels,
  COALESCE(
    (SELECT ai.invited_by FROM public.access_invitations ai
     WHERE ai.entity_id = e.id
     AND lower(ai.email) = lower((SELECT email FROM auth.users WHERE id = et.user_id LIMIT 1))
     AND ai.status = 'accepted'
     ORDER BY ai.accepted_at DESC LIMIT 1),
    et.user_id
  ) as granted_by,
  et.joined_at
FROM public.entity_team et
JOIN public.entities e ON e.id = et.entity_id
WHERE e.is_system = true
  AND et.left_at IS NULL
ON CONFLICT DO NOTHING;

-- Mark migrated Platform entity team members as left (for history)
UPDATE public.entity_team et
SET left_at = now()
FROM public.entities e
WHERE e.id = et.entity_id
  AND e.is_system = true
  AND et.left_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.platform_access pa
    WHERE pa.user_id = et.user_id
    AND pa.revoked_at IS NULL
  );

-- ============================================
-- TASK 2: Update/Create RPC functions
-- ============================================

-- Check if user has platform access
CREATE OR REPLACE FUNCTION public.has_platform_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_access
    WHERE user_id = auth.uid()
      AND revoked_at IS NULL
  );
$$;

-- Get user's platform access level
CREATE OR REPLACE FUNCTION public.get_platform_access_level()
RETURNS access_level
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT access_level
  FROM public.platform_access
  WHERE user_id = auth.uid()
    AND revoked_at IS NULL
  LIMIT 1;
$$;

-- Update get_user_entities to exclude system entities
CREATE OR REPLACE FUNCTION public.get_user_entities()
RETURNS TABLE(entity_id UUID, access access_level)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT et.entity_id, et.access
  FROM public.entity_team et
  JOIN public.entities e ON e.id = et.entity_id
  WHERE et.user_id = auth.uid()
    AND et.left_at IS NULL
    AND et.access != 'viewer'
    AND e.is_system = false
$$;

-- Update accept_invitation_by_token to handle both entity and platform invitations
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token text)
RETURNS public.access_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.access_invitations%ROWTYPE;
  platform_entity_id UUID;
  existing_id UUID;
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

  -- Get Platform entity ID (system entity)
  SELECT id INTO platform_entity_id
  FROM public.entities
  WHERE is_system = true
  LIMIT 1;

  -- Check if this is a platform invitation
  IF platform_entity_id IS NOT NULL AND inv.entity_id = platform_entity_id THEN
    -- Handle platform access
    SELECT id INTO existing_id
    FROM public.platform_access
    WHERE user_id = auth.uid()
      AND revoked_at IS NULL;

    IF existing_id IS NULL THEN
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
      WHERE id = existing_id;
    END IF;
  ELSE
    -- Handle entity access (existing logic)
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
  END IF;

  -- Mark invitation as accepted
  UPDATE public.access_invitations
  SET
    status = 'accepted',
    accepted_at = now()
  WHERE id = inv.id;

  SELECT * INTO inv FROM public.access_invitations WHERE id = inv.id;
  RETURN inv;
END;
$$;