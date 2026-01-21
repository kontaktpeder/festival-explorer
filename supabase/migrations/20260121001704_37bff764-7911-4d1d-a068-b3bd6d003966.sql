-- Fix: Include viewers in dashboard (get_user_entities)
-- Viewers should also see projects they're members of, even if they can't edit

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
    -- Removed: AND et.access != 'viewer' 
    -- Viewers should also see their projects in dashboard
    AND e.is_system = false
$$;