
-- Backfill: migrate legacy entity rider media_id -> asset_handles -> *_rider_asset_id

-- 1) Create asset_handles for legacy tech riders (where handle doesn't exist yet)
INSERT INTO public.asset_handles (media_id, kind, label, created_by)
SELECT
  e.tech_rider_media_id,
  'tech_rider',
  'Teknisk rider',
  COALESCE(m.created_by, e.created_by)
FROM public.entities e
JOIN public.media m ON m.id = e.tech_rider_media_id
WHERE e.tech_rider_media_id IS NOT NULL
  AND e.tech_rider_asset_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.asset_handles ah WHERE ah.media_id = e.tech_rider_media_id
  );

-- 2) Set entities.tech_rider_asset_id from matching asset_handle
UPDATE public.entities e
SET tech_rider_asset_id = ah.id
FROM public.asset_handles ah
WHERE e.tech_rider_media_id IS NOT NULL
  AND e.tech_rider_asset_id IS NULL
  AND ah.media_id = e.tech_rider_media_id;

-- 3) Create asset_handles for legacy hosp riders
INSERT INTO public.asset_handles (media_id, kind, label, created_by)
SELECT
  e.hosp_rider_media_id,
  'hosp_rider',
  'Hospitality rider',
  COALESCE(m.created_by, e.created_by)
FROM public.entities e
JOIN public.media m ON m.id = e.hosp_rider_media_id
WHERE e.hosp_rider_media_id IS NOT NULL
  AND e.hosp_rider_asset_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.asset_handles ah WHERE ah.media_id = e.hosp_rider_media_id
  );

-- 4) Set entities.hosp_rider_asset_id from matching asset_handle
UPDATE public.entities e
SET hosp_rider_asset_id = ah.id
FROM public.asset_handles ah
WHERE e.hosp_rider_media_id IS NOT NULL
  AND e.hosp_rider_asset_id IS NULL
  AND ah.media_id = e.hosp_rider_media_id;
