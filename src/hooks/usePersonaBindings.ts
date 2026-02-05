import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PersonaBinding {
  id: string;
  entity_id: string;
  persona_id: string;
  is_public: boolean;
  role_label: string | null;
  created_at: string;
  persona?: {
    id: string;
    name: string;
    slug: string;
    avatar_url: string | null;
    category_tags: string[] | null;
    is_public: boolean;
  };
  entity?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    tagline: string | null;
    hero_image_url: string | null;
    is_published: boolean;
    visibility: string;
  };
}

// Get all persona bindings for an entity (public view)
export function useEntityPersonaBindings(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity-persona-bindings", entityId],
    queryFn: async () => {
      if (!entityId) return [];

      const { data, error } = await supabase
        .from("entity_persona_bindings")
        .select(`
          *,
          persona:personas(id, name, slug, avatar_url, category_tags, is_public)
        `)
        .eq("entity_id", entityId);

      if (error) throw error;
      return (data || []) as PersonaBinding[];
    },
    enabled: !!entityId,
  });
}

// Get all entity bindings for a persona (for persona page)
export function usePersonaEntityBindings(personaId: string | undefined) {
  return useQuery({
    queryKey: ["persona-entity-bindings", personaId],
    queryFn: async () => {
      if (!personaId) return [];

      const { data, error } = await supabase
        .from("entity_persona_bindings")
        .select(`
          *,
          entity:entities(id, name, slug, type, tagline, hero_image_url, is_published, visibility)
        `)
        .eq("persona_id", personaId);

      if (error) throw error;
      return (data || []) as PersonaBinding[];
    },
    enabled: !!personaId,
  });
}

// Create binding
export function useCreatePersonaBinding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (binding: {
      entity_id: string;
      persona_id: string;
      is_public?: boolean;
      role_label?: string;
    }) => {
      const { data, error } = await supabase
        .from("entity_persona_bindings")
        .insert({
          entity_id: binding.entity_id,
          persona_id: binding.persona_id,
          is_public: binding.is_public ?? true,
          role_label: binding.role_label || null,
        })
        .select(`
          *,
          persona:personas(id, name, slug, avatar_url, category_tags, is_public)
        `)
        .single();

      if (error) throw error;
      return data as PersonaBinding;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["entity-persona-bindings", data.entity_id] });
      queryClient.invalidateQueries({ queryKey: ["persona-entity-bindings", data.persona_id] });
    },
  });
}

// Update binding
export function useUpdatePersonaBinding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      is_public?: boolean;
      role_label?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("entity_persona_bindings")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          persona:personas(id, name, slug, avatar_url, category_tags, is_public)
        `)
        .single();

      if (error) throw error;
      return data as PersonaBinding;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["entity-persona-bindings", data.entity_id] });
      queryClient.invalidateQueries({ queryKey: ["persona-entity-bindings", data.persona_id] });
    },
  });
}

// Delete binding
export function useDeletePersonaBinding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, entityId, personaId }: { id: string; entityId: string; personaId: string }) => {
      const { error } = await supabase
        .from("entity_persona_bindings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { entityId, personaId };
    },
    onSuccess: ({ entityId, personaId }) => {
      queryClient.invalidateQueries({ queryKey: ["entity-persona-bindings", entityId] });
      queryClient.invalidateQueries({ queryKey: ["persona-entity-bindings", personaId] });
    },
  });
}
