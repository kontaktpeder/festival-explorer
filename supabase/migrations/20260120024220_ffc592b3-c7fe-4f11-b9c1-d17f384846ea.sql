-- Create personas table for public user identities
CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  category_tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_personas_user_id ON public.personas(user_id);
CREATE INDEX idx_personas_slug ON public.personas(slug);
CREATE INDEX idx_personas_public ON public.personas(is_public);

-- Updated_at trigger
CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON public.personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

-- Users can view their own personas
CREATE POLICY "Users can view their own personas"
  ON public.personas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own personas
CREATE POLICY "Users can create their own personas"
  ON public.personas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own personas
CREATE POLICY "Users can update their own personas"
  ON public.personas FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own personas
CREATE POLICY "Users can delete their own personas"
  ON public.personas FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Public can view public personas
CREATE POLICY "Public can view public personas"
  ON public.personas FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Admin full access
CREATE POLICY "Admin full access on personas"
  ON public.personas FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());