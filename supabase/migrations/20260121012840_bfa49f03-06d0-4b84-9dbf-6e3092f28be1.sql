-- Fix media RLS: Fjern offentlig lesepolicy
-- Brukere kan kun se egne filer, admin kan se alle

-- Fjern gammel "alle kan se offentlige filer" policy
DROP POLICY IF EXISTS "media_public_read" ON public.media;

-- Sikre at admin full access finnes (idempotent)
DROP POLICY IF EXISTS "Admin full access on media" ON public.media;
CREATE POLICY "Admin full access on media"
  ON public.media FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix storage policies for media bucket
-- Fjern gammel "alle kan se" policy
DROP POLICY IF EXISTS "Media files are publicly accessible" ON storage.objects;

-- Kun autentiserte brukere kan se filer
CREATE POLICY "Authenticated users can view media files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media' AND auth.uid() IS NOT NULL);