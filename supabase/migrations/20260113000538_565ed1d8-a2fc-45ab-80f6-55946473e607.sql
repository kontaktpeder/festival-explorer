-- Add desktop and mobile background image columns to festival_sections
ALTER TABLE festival_sections 
ADD COLUMN bg_image_url_desktop TEXT,
ADD COLUMN bg_image_url_mobile TEXT;

-- Comment for documentation
COMMENT ON COLUMN festival_sections.bg_image_url_desktop IS 'Background image URL optimized for desktop (landscape)';
COMMENT ON COLUMN festival_sections.bg_image_url_mobile IS 'Background image URL optimized for mobile (portrait)';