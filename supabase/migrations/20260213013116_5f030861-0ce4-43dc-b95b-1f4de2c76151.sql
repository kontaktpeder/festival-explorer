
CREATE OR REPLACE FUNCTION public.search_public_personas(
  p_query text,
  p_exclude_user_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  slug text,
  avatar_url text,
  category_tags text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.user_id,
    p.name,
    p.slug,
    p.avatar_url,
    p.category_tags
  FROM public.personas p
  WHERE p.is_public = true
    AND (p_query IS NULL OR length(trim(p_query)) < 2 OR p.name ILIKE '%' || trim(p_query) || '%')
    AND (p.user_id != ALL(p_exclude_user_ids))
  ORDER BY p.name
  LIMIT 20;
$$;
