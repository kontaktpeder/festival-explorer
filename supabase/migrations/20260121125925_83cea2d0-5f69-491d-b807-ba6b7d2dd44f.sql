-- Add image settings JSONB columns for focal point/crop data
-- Using JSONB for flexibility and future extensibility (e.g., gallery modes)

-- PROFILES: avatar image settings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_image_settings JSONB DEFAULT NULL;

-- COMMENT for documentation
COMMENT ON COLUMN public.profiles.avatar_image_settings IS 
'Focal point and crop settings for avatar. Structure: { "focal_x": 0-1, "focal_y": 0-1, "zoom": 1+ }';

-- ENTITIES: hero image settings (covers solo artists, bands, venues)
ALTER TABLE public.entities
ADD COLUMN IF NOT EXISTS hero_image_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.entities.hero_image_settings IS 
'Focal point and crop settings for hero image. Structure: { "focal_x": 0-1, "focal_y": 0-1, "zoom": 1+ }';

-- EVENTS: hero image settings
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS hero_image_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.events.hero_image_settings IS 
'Focal point and crop settings for hero image. Structure: { "focal_x": 0-1, "focal_y": 0-1, "zoom": 1+ }';

-- VENUES (legacy table): hero image settings
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS hero_image_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.venues.hero_image_settings IS 
'Focal point and crop settings for hero image. Structure: { "focal_x": 0-1, "focal_y": 0-1, "zoom": 1+ }';

-- PROJECTS (legacy table): hero image settings
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS hero_image_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.projects.hero_image_settings IS 
'Focal point and crop settings for hero image. Structure: { "focal_x": 0-1, "focal_y": 0-1, "zoom": 1+ }';

-- PERSONAS: avatar image settings
ALTER TABLE public.personas
ADD COLUMN IF NOT EXISTS avatar_image_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.personas.avatar_image_settings IS 
'Focal point and crop settings for persona avatar. Structure: { "focal_x": 0-1, "focal_y": 0-1, "zoom": 1+ }';

-- THEMES: hero image settings for festival themes
ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS hero_image_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.themes.hero_image_settings IS 
'Focal point and crop settings for theme hero image. Structure: { "focal_x": 0-1, "focal_y": 0-1, "zoom": 1+ }';

-- FESTIVAL_SECTIONS: background image settings
ALTER TABLE public.festival_sections
ADD COLUMN IF NOT EXISTS bg_image_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.festival_sections.bg_image_settings IS 
'Focal point and crop settings for section background. Structure: { "focal_x": 0-1, "focal_y": 0-1, "zoom": 1+ }';