
-- 1) Add logo_url on venues
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2) RLS: Owner or staff can SELECT venues
CREATE POLICY "Owner can select own venues"
ON public.venues FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Staff can select their venues"
ON public.venues FOR SELECT TO authenticated
USING (public.is_venue_staff_member(id));

-- 3) RLS: Public can SELECT published venues
CREATE POLICY "Public can select published venues"
ON public.venues FOR SELECT TO anon
USING (is_published = true);

CREATE POLICY "Authenticated can select published venues"
ON public.venues FOR SELECT TO authenticated
USING (is_published = true);

-- 4) RLS: Owner or staff with can_edit_venue can UPDATE
CREATE POLICY "Owner or venue editor can update venues"
ON public.venues FOR UPDATE TO authenticated
USING (public.can_manage_venue(id))
WITH CHECK (public.can_manage_venue(id));

-- 5) RPC: get_my_venues
CREATE OR REPLACE FUNCTION public.get_my_venues(p_persona_id UUID DEFAULT NULL)
RETURNS SETOF public.venues
LANGUAGE sql
STABLE SECURITY DEFINER
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
