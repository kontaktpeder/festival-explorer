-- Create entity_persona_bindings table for many-to-many relationship
CREATE TABLE public.entity_persona_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  role_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, persona_id)
);

-- Create indexes for performance
CREATE INDEX idx_entity_persona_entity_id ON public.entity_persona_bindings(entity_id);
CREATE INDEX idx_entity_persona_persona_id ON public.entity_persona_bindings(persona_id);

-- Enable RLS
ALTER TABLE public.entity_persona_bindings ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access on entity_persona_bindings"
  ON public.entity_persona_bindings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Public can see only public bindings for public personas and public entities
CREATE POLICY "Public read public persona bindings"
  ON public.entity_persona_bindings FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = entity_persona_bindings.persona_id
      AND p.is_public = true
    )
    AND EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = entity_persona_bindings.entity_id
      AND e.is_published = true
      AND e.visibility = 'public'
      AND e.is_system = false
    )
  );

-- Persona owners can manage their own bindings
CREATE POLICY "Persona owners manage their bindings"
  ON public.entity_persona_bindings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = entity_persona_bindings.persona_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.personas p
      WHERE p.id = entity_persona_bindings.persona_id
      AND p.user_id = auth.uid()
    )
  );

-- Entity admins can manage persona bindings for their entity
CREATE POLICY "Entity admins manage persona bindings"
  ON public.entity_persona_bindings FOR ALL
  TO authenticated
  USING (public.is_entity_admin(entity_id))
  WITH CHECK (public.is_entity_admin(entity_id));