import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Entity, EntityTeam, EntityWithTeam, EntityWithAccess, AccessLevel } from "@/types/database";

/**
 * Fetch a single published entity by slug (public view)
 */
export function useEntity(slug: string) {
  return useQuery({
    queryKey: ["entity", slug],
    queryFn: async () => {
      const { data: entity, error } = await supabase
        .from("entities")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      if (!entity) return null;

      // Get public team members
      const { data: team, error: teamError } = await supabase
        .from("entity_team")
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq("entity_id", entity.id)
        .eq("is_public", true)
        .is("left_at", null);

      if (teamError) throw teamError;

      return {
        ...entity,
        team: (team || []) as EntityTeam[],
      } as EntityWithTeam;
    },
    enabled: !!slug,
  });
}

/**
 * Fetch entities for the current user's dashboard (owner/admin/editor)
 */
export function useMyEntities() {
  return useQuery({
    queryKey: ["my-entities"],
    queryFn: async () => {
      // Use the RPC function to get user's entities
      const { data: userEntities, error: rpcError } = await supabase.rpc('get_user_entities');
      
      if (rpcError) throw rpcError;
      if (!userEntities || userEntities.length === 0) return [];

      const entityIds = userEntities.map((row: { entity_id: string }) => row.entity_id);

      // Fetch full entity data
      const { data: entities, error: entitiesError } = await supabase
        .from("entities")
        .select("*")
        .in("id", entityIds)
        .order("name", { ascending: true });

      if (entitiesError) throw entitiesError;

      // Merge with access levels
      return (entities || []).map((entity) => {
        const userEntity = userEntities.find((row: { entity_id: string; access: AccessLevel }) => row.entity_id === entity.id);
        return {
          ...entity,
          access: userEntity?.access || 'viewer',
        } as EntityWithAccess;
      });
    },
  });
}

/**
 * Fetch a single entity for editing (requires access)
 */
export function useEntityForEdit(id: string | undefined) {
  return useQuery({
    queryKey: ["entity-edit", id],
    queryFn: async () => {
      if (!id || id === "new") return null;

      const { data: entity, error } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Get team members
      const { data: team, error: teamError } = await supabase
        .from("entity_team")
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq("entity_id", id)
        .is("left_at", null)
        .order("access", { ascending: true });

      if (teamError) throw teamError;

      return {
        ...entity,
        team: (team || []) as EntityTeam[],
      } as EntityWithTeam;
    },
    enabled: !!id && id !== "new",
  });
}

/**
 * Fetch all entities for admin (all types, all statuses)
 */
export function useAdminEntities(typeFilter?: 'venue' | 'solo' | 'band' | null) {
  return useQuery({
    queryKey: ["admin-entities", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("entities")
        .select("*")
        .order("name", { ascending: true });

      if (typeFilter) {
        query = query.eq("type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Entity[];
    },
  });
}

/**
 * Fetch entities by type (for public listings)
 */
export function usePublishedEntitiesByType(type: 'venue' | 'solo' | 'band') {
  return useQuery({
    queryKey: ["entities", type, "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("type", type)
        .eq("is_published", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as Entity[];
    },
  });
}

/**
 * Fetch entity by ID (for internal use)
 */
export function useEntityById(id: string | undefined) {
  return useQuery({
    queryKey: ["entity-by-id", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Entity;
    },
    enabled: !!id,
  });
}
