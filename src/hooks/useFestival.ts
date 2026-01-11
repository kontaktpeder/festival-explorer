import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Festival, FestivalEvent, Event, EventProject, Project, Venue } from "@/types/database";

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

      // For each event, get the lineup preview (first 3 projects)
      const eventsWithLineup = await Promise.all(
        (festivalEvents || []).map(async (fe) => {
          if (!fe.event) return fe;

          const { data: lineup } = await supabase
            .from("event_projects")
            .select(`
              *,
              project:projects(*)
            `)
            .eq("event_id", fe.event.id)
            .order("billing_order", { ascending: true })
            .limit(3);

          return {
            ...fe,
            event: {
              ...fe.event,
              lineup: lineup || [],
            },
          };
        })
      );

      return {
        ...festival,
        festivalEvents: eventsWithLineup,
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

      // Get full lineup
      const { data: lineup, error: lineupError } = await supabase
        .from("event_projects")
        .select(`
          *,
          project:projects(*)
        `)
        .eq("event_id", event.id)
        .order("billing_order", { ascending: true });

      if (lineupError) throw lineupError;

      return {
        ...event,
        lineup: lineup || [],
      };
    },
    enabled: !!slug,
  });
}

export function useProject(slug: string) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: async () => {
      const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
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
      const { data: venue, error } = await supabase
        .from("venues")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
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
