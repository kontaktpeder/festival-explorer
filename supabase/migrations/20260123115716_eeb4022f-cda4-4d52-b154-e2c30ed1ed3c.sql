-- Add date_to and year_to to persona_timeline_events
ALTER TABLE public.persona_timeline_events
ADD COLUMN IF NOT EXISTS date_to DATE,
ADD COLUMN IF NOT EXISTS year_to INTEGER;

-- Add date_to and year_to to entity_timeline_events  
ALTER TABLE public.entity_timeline_events
ADD COLUMN IF NOT EXISTS date_to DATE,
ADD COLUMN IF NOT EXISTS year_to INTEGER;