import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useExploreEvents() {
  return useQuery({
    queryKey: ["explore", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          venue:venues(name, slug)
        `)
        .eq("status", "published")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });
}

export function useExploreProjects() {
  return useQuery({
    queryKey: ["explore", "projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "published")
        .order("name", { ascending: true })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return { events: [], projects: [] };

      const searchPattern = `%${query}%`;

      const [eventsResult, projectsResult] = await Promise.all([
        supabase
          .from("events")
          .select("id, name, slug, start_at, hero_image_url")
          .eq("status", "published")
          .ilike("name", searchPattern)
          .limit(10),
        supabase
          .from("projects")
          .select("id, name, slug, tagline, profile_image_url")
          .eq("status", "published")
          .ilike("name", searchPattern)
          .limit(10),
      ]);

      return {
        events: eventsResult.data || [],
        projects: projectsResult.data || [],
      };
    },
    enabled: query.length >= 2,
  });
}
