import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Persona } from "@/types/database";

// Default category options for personas
export const PERSONA_CATEGORIES = [
  "musiker",
  "fotograf",
  "videograf",
  "tekniker",
  "booking",
  "manager",
  "produsent",
  "dj",
  "komponist",
  "tekstforfatter",
  "lyd",
  "lys",
  "scene",
] as const;

// Get all personas for current user
export function useMyPersonas() {
  return useQuery({
    queryKey: ["my-personas"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("personas")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Persona[];
    },
  });
}

// Get single persona by ID (for editing)
export function usePersonaById(id: string | undefined) {
  return useQuery({
    queryKey: ["persona-by-id", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("personas")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Persona | null;
    },
    enabled: !!id,
  });
}

// Get single persona by slug (public)
export function usePersona(slug: string | undefined) {
  return useQuery({
    queryKey: ["persona", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("personas")
        .select("*")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (error) throw error;
      return data as Persona | null;
    },
    enabled: !!slug,
  });
}

// Get entities the persona's user is a member of (for public persona page)
export function usePersonaEntities(userId: string | undefined) {
  return useQuery({
    queryKey: ["persona-entities", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("entity_team")
        .select(`
          id,
          access,
          role_labels,
          entity:entities(
            id,
            name,
            slug,
            type,
            tagline,
            hero_image_url,
            is_published
          )
        `)
        .eq("user_id", userId)
        .is("left_at", null)
        .eq("is_public", true);

      if (error) throw error;
      
      // Filter to only show published entities
      return (data || [])
        .filter((item: any) => item.entity?.is_published)
        .map((item: any) => ({
          ...item.entity,
          role_labels: item.role_labels,
          access: item.access,
        }));
    },
    enabled: !!userId,
  });
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æå]/g, 'a')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Create persona mutation
export function useCreatePersona() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (persona: {
      name: string;
      bio?: string;
      avatar_url?: string;
      avatar_image_settings?: { focal_x: number; focal_y: number; zoom?: number } | null;
      category_tags?: string[];
      type?: string;
      is_public?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");

      // Generate unique slug
      let baseSlug = generateSlug(persona.name);
      let slug = baseSlug;
      let counter = 1;
      
      // Check for existing slugs and make unique
      while (true) {
        const { data: existing } = await supabase
          .from("personas")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const insertPayload = {
        user_id: user.id,
        name: persona.name,
        slug,
        bio: persona.bio || null,
        avatar_url: persona.avatar_url || null,
        avatar_image_settings: persona.avatar_image_settings || null,
        category_tags: persona.category_tags || [],
        is_public: persona.is_public ?? true,
        ...(persona.type && { type: persona.type }),
      };

      const { data, error } = await supabase
        .from("personas")
        .insert(insertPayload as never)
        .select()
        .single();

      if (error) throw error;
      return data as Persona;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-personas"] });
    },
  });
}

// Update persona mutation
export function useUpdatePersona() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      bio?: string | null;
      avatar_url?: string | null;
      avatar_image_settings?: { focal_x: number; focal_y: number; zoom?: number } | null;
      category_tags?: string[];
      is_public?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("personas")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Persona;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-personas"] });
      queryClient.invalidateQueries({ queryKey: ["persona-by-id", data.id] });
      queryClient.invalidateQueries({ queryKey: ["persona", data.slug] });
    },
  });
}

// Delete persona mutation
export function useDeletePersona() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("personas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-personas"] });
    },
  });
}
