
-- Festival-filbank
CREATE TABLE IF NOT EXISTS public.festival_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id uuid NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document')),
  original_filename text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_festival_media_festival_id ON public.festival_media(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_media_file_type ON public.festival_media(file_type);

ALTER TABLE public.festival_participants
  ADD COLUMN IF NOT EXISTS can_edit_festival_media boolean NOT NULL DEFAULT false;

ALTER TABLE public.festival_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "festival_media_select"
  ON public.festival_media FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.festival_participants fp
      WHERE fp.festival_id = festival_media.festival_id
        AND fp.participant_kind = 'persona'
        AND fp.participant_id IN (SELECT id FROM public.personas WHERE user_id = auth.uid())
        AND fp.can_access_media = true
    )
  );

CREATE POLICY "festival_media_insert"
  ON public.festival_media FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.festival_participants fp
      WHERE fp.festival_id = festival_media.festival_id
        AND fp.participant_kind = 'persona'
        AND fp.participant_id IN (SELECT id FROM public.personas WHERE user_id = auth.uid())
        AND fp.can_access_media = true AND fp.can_edit_festival_media = true
    )
  );

CREATE POLICY "festival_media_delete"
  ON public.festival_media FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.festival_participants fp
      WHERE fp.festival_id = festival_media.festival_id
        AND fp.participant_kind = 'persona'
        AND fp.participant_id IN (SELECT id FROM public.personas WHERE user_id = auth.uid())
        AND fp.can_edit_festival_media = true
    )
  );
