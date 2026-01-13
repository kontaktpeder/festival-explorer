-- Create designs table for reusable design editor
CREATE TABLE public.designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template TEXT NOT NULL DEFAULT 'festival',
  theme JSONB NOT NULL DEFAULT '{"primaryColor": "#FF6B35", "fontFamily": "Inter", "fontSize": 24}',
  background JSONB NOT NULL DEFAULT '{"type": "color", "value": "#1a1a2e", "overlay": false}',
  sections JSONB NOT NULL DEFAULT '[]',
  entity_id UUID,
  entity_type TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own designs"
ON public.designs FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own designs"
ON public.designs FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own designs"
ON public.designs FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own designs"
ON public.designs FOR DELETE
USING (auth.uid() = created_by);

-- Admins can do everything
CREATE POLICY "Admins can view all designs"
ON public.designs FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can create all designs"
ON public.designs FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all designs"
ON public.designs FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete all designs"
ON public.designs FOR DELETE
USING (public.is_admin());

-- Index for template lookup
CREATE INDEX idx_designs_template ON public.designs(template);
CREATE INDEX idx_designs_entity ON public.designs(entity_type, entity_id);

-- Trigger for updated_at
CREATE TRIGGER update_designs_updated_at
BEFORE UPDATE ON public.designs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();