-- Fix search_path for can_upload_high_res function
CREATE OR REPLACE FUNCTION public.can_upload_high_res(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_max INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Only admins can upload high-res
  SELECT public.is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN FALSE;
  END IF;

  -- Get current count and max (default to 15 for admins if not set)
  SELECT COALESCE(high_res_count, 0), COALESCE(high_res_max, 15)
  INTO v_count, v_max
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN v_count < v_max;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;