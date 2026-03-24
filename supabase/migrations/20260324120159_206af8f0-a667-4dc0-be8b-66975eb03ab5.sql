
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS tech_rider_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hosp_rider_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS entities_tech_rider_media_id_idx ON public.entities (tech_rider_media_id);
CREATE INDEX IF NOT EXISTS entities_hosp_rider_media_id_idx ON public.entities (hosp_rider_media_id);
