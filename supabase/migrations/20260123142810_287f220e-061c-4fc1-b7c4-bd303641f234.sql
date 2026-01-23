-- Fix search_path for functions to address security warnings
CREATE OR REPLACE FUNCTION public.can_upload_high_res(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_max INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  SELECT public.is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(high_res_count, 0), COALESCE(high_res_max, 10)
  INTO v_count, v_max
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN v_count < v_max;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_high_res_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quality_level = 'high' THEN
    UPDATE public.profiles
    SET high_res_count = COALESCE(high_res_count, 0) + 1
    WHERE id = NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.decrement_high_res_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.quality_level = 'high' THEN
    UPDATE public.profiles
    SET high_res_count = GREATEST(COALESCE(high_res_count, 0) - 1, 0)
    WHERE id = OLD.created_by;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;