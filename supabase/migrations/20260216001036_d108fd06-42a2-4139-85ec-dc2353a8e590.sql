-- Switch get_my_venues to SECURITY INVOKER so RLS on venues controls access
CREATE OR REPLACE FUNCTION public.get_my_venues(p_persona_id UUID DEFAULT NULL)
RETURNS SETOF public.venues
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT v.*
  FROM public.venues v
  WHERE v.created_by = auth.uid()
  UNION
  SELECT DISTINCT v.*
  FROM public.venues v
  JOIN public.venue_staff vs ON vs.venue_id = v.id
  JOIN public.personas p ON p.id = vs.persona_id
  WHERE p.user_id = auth.uid()
    AND (p_persona_id IS NULL OR vs.persona_id = p_persona_id)
  ORDER BY name;
$$;