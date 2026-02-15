
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS logo_image_settings jsonb;

COMMENT ON COLUMN public.entities.logo_url IS 'URL til prosjektlogo (vises på festival-layout i stedet for navn der det finnes).';
COMMENT ON COLUMN public.entities.logo_image_settings IS 'Focal point/crop for logo (samme format som hero_image_settings).';
