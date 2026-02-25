import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Entity, Event } from "@/types/database";

export type UtforskMode = "publikum" | "musiker" | "arrangor";

/** Entity types shown per mode */
const MODE_ENTITY_TYPES: Record<UtforskMode, string[]> = {
  publikum: ["solo", "band", "venue"],
  musiker: ["venue", "solo", "band"],
  arrangor: ["solo", "band", "venue"],
};

/** Whether mode should show events */
const MODE_SHOWS_EVENTS: Record<UtforskMode, boolean> = {
  publikum: true,
  musiker: false,
  arrangor: false,
};

export function useUtforskEntities(
  mode: UtforskMode,
  filters: { type?: string; location?: string; search?: string } = {}
) {
  return useQuery({
    queryKey: ["utforsk", "entities", mode, filters],
    queryFn: async () => {
      const allowedTypes = MODE_ENTITY_TYPES[mode];
      const types = filters.type ? [filters.type] : allowedTypes;

      let query = supabase
        .from("entities")
        .select("*")
        .eq("is_published", true)
        .eq("is_system", false)
        .in("type", types as ("solo" | "band" | "venue")[])
        .order("name", { ascending: true })
        .limit(40);

      if (filters.location) {
        query = query.ilike("city", `%${filters.location}%`);
      }
      if (filters.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Entity[];
    },
  });
}

export function useUtforskEvents(
  mode: UtforskMode,
  filters: { search?: string } = {}
) {
  return useQuery({
    queryKey: ["utforsk", "events", mode, filters],
    queryFn: async () => {
      if (!MODE_SHOWS_EVENTS[mode]) return [];

      let query = supabase
        .from("events")
        .select(`*, venue:venues(name, slug)`)
        .eq("status", "published")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(20);

      if (filters.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as (Event & { venue?: { name: string; slug: string } | null })[];
    },
    enabled: MODE_SHOWS_EVENTS[mode],
  });
}

/** Auto-detect best mode from persona type */
export function useAutoMode(): UtforskMode | null {
  const { data } = useQuery({
    queryKey: ["utforsk", "auto-mode"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: personas } = await supabase
        .from("personas")
        .select("type, category_tags")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!personas) return null;

      const personaType = personas.type || personas.category_tags?.[0];
      if (!personaType) return null;

      // Map persona types to modes
      const musicianTypes = ["musiker", "dj", "komponist", "produsent", "tekstforfatter"];
      const crewTypes = ["tekniker", "lyd", "lys", "scene", "fotograf", "videograf"];
      const arrangorTypes = ["booking", "manager"];

      if (musicianTypes.includes(personaType)) return "musiker";
      if (arrangorTypes.includes(personaType)) return "arrangor";
      if (crewTypes.includes(personaType)) return "musiker"; // crew sees musician view
      return null;
    },
    staleTime: 1000 * 60 * 5,
  });

  return data ?? null;
}
