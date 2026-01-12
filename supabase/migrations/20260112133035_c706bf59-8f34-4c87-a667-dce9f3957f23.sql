-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Media table for file-type based organization
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- File information
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'document'
  size_bytes BIGINT NOT NULL,
  original_size_bytes BIGINT, -- Size before compression
  
  -- Storage
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  
  -- Metadata
  alt_text TEXT,
  description TEXT,
  width INTEGER, -- For images/videos
  height INTEGER, -- For images/videos
  duration INTEGER, -- For video/audio (seconds)
  
  -- External link (for large videos)
  external_url TEXT, -- YouTube/Vimeo URL
  external_provider TEXT, -- 'youtube', 'vimeo', null
  
  -- Organization
  tags TEXT[],
  
  -- Ownership
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  is_public BOOLEAN DEFAULT true,
  
  -- Standard fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_media_file_type ON public.media(file_type);
CREATE INDEX idx_media_created_by ON public.media(created_by);
CREATE INDEX idx_media_tags ON public.media USING GIN(tags);

-- Enable RLS
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Public can read public media
CREATE POLICY "media_public_read"
  ON public.media FOR SELECT
  USING (is_public = true);

-- Users can read own media
CREATE POLICY "media_owner_read"
  ON public.media FOR SELECT
  USING (auth.uid() = created_by);

-- Users can create own media
CREATE POLICY "media_owner_insert"
  ON public.media FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update own media
CREATE POLICY "media_owner_update"
  ON public.media FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Users can delete own media
CREATE POLICY "media_owner_delete"
  ON public.media FOR DELETE
  USING (auth.uid() = created_by);

-- Update timestamp trigger
CREATE TRIGGER update_media_updated_at
  BEFORE UPDATE ON public.media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media', 
  'media', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'application/pdf']
);

-- Storage policies
CREATE POLICY "Media files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own media files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own media files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);