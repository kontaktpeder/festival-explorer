import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Festival, FestivalEvent, Event, EventEntity, Entity, Venue } from "@/types/database";

// Re-export entity hooks for convenience
export { useEntity, useMyEntities, useAdminEntities, usePublishedEntitiesByType } from "./useEntity";

export function useFestival(slug: string) {
  return useQuery({
    queryKey: ["festival", slug],
    queryFn: async () => {
      const { data: festival, error } = await supabase
        .from("festivals")
        .select(`
          *,
          theme:themes(*)
        `)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      if (!festival) return null;

      // Get festival events with full event data
      const { data: festivalEvents, error: eventsError } = await supabase
        .from("festival_events")
        .select(`
          *,
          event:events(
            *,
            venue:venues(*)
          )
        `)
        .eq("festival_id", festival.id)
        .order("sort_order", { ascending: true });

      if (eventsError) throw eventsError;

      // For each event, get the FULL lineup from event_entities (NEW)
      const eventsWithLineup = await Promise.all(
        (festivalEvents || []).map(async (fe) => {
          if (!fe.event) return fe;

          const { data: lineup } = await supabase
            .from("event_entities")
            .select(`
              *,
              entity:entities(*)
            `)
            .eq("event_id", fe.event.id)
            .order("billing_order", { ascending: true });

          return {
            ...fe,
            event: {
              ...fe.event,
              lineup: lineup || [],
            },
          };
        })
      );

      // Hent festival sections fra database
      const { data: sections, error: sectionsError } = await supabase
        .from("festival_sections")
        .select("*")
        .eq("festival_id", festival.id)
        .eq("is_enabled", true)
        .order("sort_order", { ascending: true });

      if (sectionsError) throw sectionsError;

      // Extract all artist IDs from sections' content_json
      const allArtistIds = new Set<string>();
      (sections || []).forEach((section) => {
        const rawContent = section.content_json as Record<string, unknown> | null;
        const content = (rawContent?.content as Record<string, unknown>) || rawContent;
        const artistIds = (content?.artists as string[]) || [];
        artistIds.forEach((id) => allArtistIds.add(id));
      });

      // Fetch all referenced artists from entities (NEW - uses entities instead of projects)
      let sectionArtists: Array<{ id: string; name: string; slug: string; tagline?: string | null; type?: string }> = [];
      if (allArtistIds.size > 0) {
        const { data: entities } = await supabase
          .from("entities")
          .select("id, name, slug, tagline, type")
          .in("id", Array.from(allArtistIds));
        
        sectionArtists = (entities || []).map((e) => ({
          id: e.id,
          name: e.name,
          slug: e.slug,
          tagline: e.tagline,
          type: e.type,
        }));
      }

      return {
        ...festival,
        festivalEvents: eventsWithLineup,
        sections: sections || [],
        sectionArtists,
        // Cast to include new fields that may not be in generated types yet
        date_range_section_id: (festival as any).date_range_section_id as string | null,
        description_section_id: (festival as any).description_section_id as string | null,
        name_section_id: (festival as any).name_section_id as string | null,
      };
    },
    enabled: !!slug,
  });
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          *,
          venue:venues(*)
        `)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      if (!event) return null;

      // Get full lineup from event_entities (NEW)
      const { data: lineup, error: lineupError } = await supabase
        .from("event_entities")
        .select(`
          *,
          entity:entities(*)
        `)
        .eq("event_id", event.id)
        .order("billing_order", { ascending: true });

      if (lineupError) throw lineupError;

      // Check if event belongs to a festival
      const { data: festivalEvent } = await supabase
        .from("festival_events")
        .select(`
          festival:festivals(slug, name)
        `)
        .eq("event_id", event.id)
        .maybeSingle();

      return {
        ...event,
        lineup: lineup || [],
        festival: festivalEvent?.festival || null,
      };
    },
    enabled: !!slug,
  });
}

/**
 * @deprecated Use useEntity from useEntity.ts instead
 * Kept for backwards compatibility during migration
 */
export function useProject(slug: string) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: async () => {
      // Try entities first (NEW)
      const { data: entity, error: entityError } = await supabase
        .from("entities")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .in("type", ["solo", "band"])
        .maybeSingle();

      if (!entityError && entity) {
        // Get public team members from entity_team
        const { data: team } = await supabase
          .from("entity_team")
          .select(`
            *,
            profile:profiles(*)
          `)
          .eq("entity_id", entity.id)
          .eq("is_public", true)
          .is("left_at", null);

        // Map to old format for compatibility
        return {
          ...entity,
          type: entity.type as 'solo' | 'band',
          members: (team || []).map(t => ({
            project_id: entity.id,
            profile_id: t.user_id,
            role_label: t.role_labels?.[0] || null,
            is_admin: t.access === 'admin' || t.access === 'owner',
            is_public: t.is_public,
            joined_at: t.joined_at,
            left_at: t.left_at,
            profile: t.profile,
          })),
        };
      }

      // Fallback to old projects table for backwards compatibility
      const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      if (!project) return null;

      // Get public members
      const { data: members, error: membersError } = await supabase
        .from("project_members")
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq("project_id", project.id)
        .eq("is_public", true);

      if (membersError) throw membersError;

      return {
        ...project,
        members: members || [],
      };
    },
    enabled: !!slug,
  });
}

export function useVenue(slug: string) {
  return useQuery({
    queryKey: ["venue", slug],
    queryFn: async () => {
      // Try entities first (NEW)
      const { data: entity, error: entityError } = await supabase
        .from("entities")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .eq("type", "venue")
        .maybeSingle();

      if (!entityError && entity) {
        // Get upcoming events at this venue
        const { data: events } = await supabase
          .from("events")
          .select("*")
          .eq("venue_id", entity.id)
          .eq("status", "published")
          .gte("start_at", new Date().toISOString())
          .order("start_at", { ascending: true });

        return {
          ...entity,
          upcomingEvents: events || [],
        };
      }

      // Fallback to old venues table
      const { data: venue, error } = await supabase
        .from("venues")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      if (!venue) return null;

      // Get upcoming events at this venue
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("venue_id", venue.id)
        .eq("status", "published")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true });

      if (eventsError) throw eventsError;

      return {
        ...venue,
        upcomingEvents: events || [],
      };
    },
    enabled: !!slug,
  });
}
