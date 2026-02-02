-- Oppdater entities-tabellen med riktig hero_image_url og settings fra venues
UPDATE entities 
SET 
  hero_image_url = v.hero_image_url,
  hero_image_settings = v.hero_image_settings,
  updated_at = NOW()
FROM venues v
WHERE entities.id::text = v.id::text
  AND entities.slug = 'josefines-vertshus';