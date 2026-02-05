-- Add social_links column to personas table
ALTER TABLE public.personas 
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT NULL;

-- Add social_links column to entities table
ALTER TABLE public.entities 
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT NULL;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';