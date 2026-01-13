-- Legg til image_fit_mode felt til festival_sections
ALTER TABLE festival_sections 
ADD COLUMN image_fit_mode TEXT DEFAULT 'cover' CHECK (image_fit_mode IN ('cover', 'contain'));

-- Oppdater eksisterende rader til 'cover' (default)
UPDATE festival_sections SET image_fit_mode = 'cover' WHERE image_fit_mode IS NULL;