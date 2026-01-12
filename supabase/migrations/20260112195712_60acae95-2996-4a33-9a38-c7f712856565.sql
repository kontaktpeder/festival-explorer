-- Add festival detail section selection fields
ALTER TABLE public.festivals 
ADD COLUMN IF NOT EXISTS date_range_section_id UUID REFERENCES public.festival_sections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS description_section_id UUID REFERENCES public.festival_sections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS name_section_id UUID REFERENCES public.festival_sections(id) ON DELETE SET NULL;