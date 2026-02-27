ALTER TABLE public.festival_media
  ADD COLUMN IF NOT EXISTS folder_path text NULL,
  ADD COLUMN IF NOT EXISTS is_signed boolean NULL;

CREATE INDEX IF NOT EXISTS idx_festival_media_festival_id_folder_path
  ON public.festival_media (festival_id, folder_path);

CREATE INDEX IF NOT EXISTS idx_festival_media_festival_id_file_type
  ON public.festival_media (festival_id, file_type);