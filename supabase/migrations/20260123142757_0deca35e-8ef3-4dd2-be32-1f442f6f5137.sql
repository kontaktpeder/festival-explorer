-- Add quality_level to media table
ALTER TABLE public.media
ADD COLUMN IF NOT EXISTS quality_level TEXT DEFAULT 'standard' CHECK (quality_level IN ('standard', 'high'));

COMMENT ON COLUMN public.media.quality_level IS 'Image quality: standard (compressed) or high (original)';

-- Add high_res_count to profiles table (track how many high-res images user has)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS high_res_count INTEGER DEFAULT 0;

-- Set max high-res images per admin (configurable, default 10)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS high_res_max INTEGER DEFAULT 10;

COMMENT ON COLUMN public.profiles.high_res_count IS 'Number of high-resolution images uploaded by this user';
COMMENT ON COLUMN public.profiles.high_res_max IS 'Maximum allowed high-resolution images for this user';

-- Function to check if user can upload high-res image
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

  -- Get current count and max
  SELECT COALESCE(high_res_count, 0), COALESCE(high_res_max, 10)
  INTO v_count, v_max
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN v_count < v_max;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment high_res_count when high-res image is uploaded
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement high_res_count when high-res image is deleted
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to update count
DROP TRIGGER IF EXISTS increment_high_res_on_insert ON public.media;
CREATE TRIGGER increment_high_res_on_insert
  AFTER INSERT ON public.media
  FOR EACH ROW
  WHEN (NEW.quality_level = 'high')
  EXECUTE FUNCTION public.increment_high_res_count();

DROP TRIGGER IF EXISTS decrement_high_res_on_delete ON public.media;
CREATE TRIGGER decrement_high_res_on_delete
  AFTER DELETE ON public.media
  FOR EACH ROW
  WHEN (OLD.quality_level = 'high')
  EXECUTE FUNCTION public.decrement_high_res_count();