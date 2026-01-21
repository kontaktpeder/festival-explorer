-- ============================================
-- Add "Users can view own media files" storage policy
-- ============================================

-- Fjern eksisterende policy hvis den finnes (for idempotens)
DROP POLICY IF EXISTS "Users can view own media files" ON storage.objects;

-- Brukere kan se filer i sin egen mappe: {user_id}/{file_type}s/{filename}
-- Admin kan se alle filer (via is_admin())
CREATE POLICY "Users can view own media files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media' 
    AND (
      -- Bruker kan se filer i sin egen mappe
      auth.uid()::text = (string_to_array(name, '/'))[1]
      OR
      -- Admin kan se alle filer
      public.is_admin()
    )
  );