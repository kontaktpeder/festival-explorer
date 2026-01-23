-- Update high_res_max to 15 for admin users via platform_access
UPDATE public.profiles
SET high_res_max = 15
WHERE id IN (
  SELECT DISTINCT user_id
  FROM public.platform_access
  WHERE access_level = 'owner'
);

-- Also update based on staff_roles table
UPDATE public.profiles
SET high_res_max = 15
WHERE id IN (
  SELECT DISTINCT user_id
  FROM public.staff_roles
  WHERE role IN ('admin', 'crew')
);

-- Also update based on user_roles table (for 'admin' role)
UPDATE public.profiles
SET high_res_max = 15
WHERE id IN (
  SELECT DISTINCT user_id
  FROM public.user_roles
  WHERE role = 'admin'
);

-- Update the can_upload_high_res function to use 15 as default max for admins
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
$$ LANGUAGE plpgsql SECURITY DEFINER;