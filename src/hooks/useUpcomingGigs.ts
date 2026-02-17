import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UpcomingGig {
  slotId: string;
  startsAt: string;
  endsAt: string | null;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  venueName: string | null;
}

export function useUpcomingGigsForEntity(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity-upcoming-gigs", entityId],
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<UpcomingGig[]> => {
      // Allow showing slots that started up to 2 hours ago ("i kveld")
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("event_program_slots")
        .select(`
          id, starts_at, ends_at, slot_kind,
          event:events(id, title, slug, status, venue:venues(name))
        `)
        .eq("entity_id", entityId!)
        .eq("is_canceled", false)
        .gte("starts_at", cutoff)
        .order("starts_at", { ascending: true })
        .limit(10);

      if (error) throw error;

      // Filter to published events only, dedupe by event
      const seen = new Set<string>();
      const results: UpcomingGig[] = [];

      for (const slot of data ?? []) {
        const ev = slot.event as any;
        if (!ev || ev.status !== "published") continue;
        if (seen.has(ev.id)) continue;
        seen.add(ev.id);
        results.push({
          slotId: slot.id,
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
          eventId: ev.id,
          eventTitle: ev.title,
          eventSlug: ev.slug,
          venueName: ev.venue?.name ?? null,
        });
      }

      return results;
    },
  });
}
