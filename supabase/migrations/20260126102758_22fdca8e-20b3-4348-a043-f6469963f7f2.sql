-- ============================================
-- FIX MEDIA ACCESS FOR ENTITY TEAM MEMBERS
-- Users should see own files + files from entities they're members of
-- ============================================

-- 1. FIX RLS POLICIES ON media TABLE
-- Remove old read policy
DROP POLICY IF EXISTS "media_owner_read" ON public.media;

-- Users can read own media
CREATE POLICY "media_owner_read"
  ON public.media FOR SELECT
  USING (auth.uid() = created_by);

-- Users can read media from entities they're team members of
CREATE POLICY "media_entity_member_read"
  ON public.media FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.entity_team et
      JOIN public.entities e ON e.id = et.entity_id
      WHERE et.user_id = auth.uid()
        AND et.left_at IS NULL
        AND e.created_by = media.created_by
    )
  );

-- 2. FIX STORAGE POLICIES ON storage.objects
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view entity media files" ON storage.objects;

-- Users can see files in their own folder: {user_id}/{file_type}s/{filename}
CREATE POLICY "Users can view own media files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media' 
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Users can see files in folders of entities they're team members of
CREATE POLICY "Users can view entity media files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.entity_team et
      JOIN public.entities e ON e.id = et.entity_id
      WHERE et.user_id = auth.uid()
        AND et.left_at IS NULL
        AND e.created_by::text = (string_to_array(storage.objects.name, '/'))[1]
    )
  );

-- Admin can see all files
DROP POLICY IF EXISTS "Admin full access on media storage" ON storage.objects;
CREATE POLICY "Admin full access on media storage"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'media' AND public.is_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_admin());