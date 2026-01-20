import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EntityTypeConfig {
  key: string;
  label_nb: string;
  icon_key: string;
  admin_route: string;
  public_route_base: string;
  is_enabled: boolean;
  sort_order: number;
  capabilities: Record<string, unknown>;
  created_at: string;
}

export function useEntityTypes() {
  return useQuery({
    queryKey: ["entity-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_types")
        .select("*")
        .eq("is_enabled", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as EntityTypeConfig[];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes - rarely changes
  });
}

// Get platform entity for system invitations
export function usePlatformEntity() {
  return useQuery({
    queryKey: ["platform-entity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, slug, type")
        .eq("is_system", true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
