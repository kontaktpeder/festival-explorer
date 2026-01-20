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

// Legacy - kept for backwards compatibility
export function useExploreProjects() {
  return useExploreEntities();
}

// New entities-based hook - filters out system entities
export function useExploreEntities(type?: 'solo' | 'band') {
  return useQuery({
    queryKey: ["explore", "entities", type],
    queryFn: async () => {
      let query = supabase
        .from("entities")
        .select("*")
        .eq("is_published", true)
        .eq("is_system", false)
        .in("type", type ? [type] : ["solo", "band"])
        .order("name", { ascending: true })
        .limit(20);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useExploreFeaturedEvents() {
  return useQuery({
    queryKey: ["explore", "featured-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festival_events")
        .select(`
          event:events(
            *,
            venue:venues(name, slug)
          )
        `)
        .eq("is_featured", true)
        .order("sort_order", { ascending: true })
        .limit(10);

      if (error) throw error;
      
      // Flatten and filter to published future events
      return (data || [])
        .map((fe) => fe.event)
        .filter((event): event is NonNullable<typeof event> => {
          if (!event) return false;
          return event.status === "published" && 
                 new Date(event.start_at) >= new Date();
        })
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    },
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return { events: [], entities: [] };

      const searchPattern = `%${query}%`;

      const [eventsResult, entitiesResult] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, slug, start_at, hero_image_url")
          .eq("status", "published")
          .ilike("title", searchPattern)
          .limit(10),
        supabase
          .from("entities")
          .select("id, name, slug, tagline, type, hero_image_url")
          .eq("is_published", true)
          .eq("is_system", false)
          .in("type", ["solo", "band"])
          .ilike("name", searchPattern)
          .limit(10),
      ]);

      return {
        events: eventsResult.data || [],
        entities: entitiesResult.data || [],
      };
    },
    enabled: query.length >= 2,
  });
}
