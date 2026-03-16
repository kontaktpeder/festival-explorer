import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RecipientKind = "persona" | "project" | "venue";

export interface RecipientOption {
  id: string;
  kind: RecipientKind;
  name: string;
  subtitle?: string;
}

export function useRecipientSearch(
  festivalId: string | undefined,
  query: string,
  includeAll: boolean
) {
  return useQuery({
    queryKey: ["recipient-search", festivalId, query, includeAll],
    enabled: !!query.trim(),
    queryFn: async () => {
      if (!query.trim()) return [] as RecipientOption[];
      const like = `%${query}%`;

      // 1) Find relevant event IDs if narrowing to festival
      let eventIds: string[] = [];
      if (festivalId && !includeAll) {
        const { data: fes, error: feError } = await supabase
          .from("festival_events")
          .select("event_id")
          .eq("festival_id", festivalId);
        if (feError) throw feError;
        eventIds = (fes || []).map((fe) => fe.event_id).filter(Boolean);
      }

      const results: RecipientOption[] = [];

      // 2) Personas
      {
        const { data, error } = await supabase
          .from("personas")
          .select("id, name")
          .ilike("name", like)
          .limit(10);
        if (error) throw error;
        (data || []).forEach((p) => {
          results.push({ id: p.id, kind: "persona", name: p.name, subtitle: "Person" });
        });
      }

      // 3) Projects
      {
        let projectIds: string[] | null = null;
        if (eventIds.length > 0 && !includeAll) {
          const { data: eps, error: epError } = await supabase
            .from("event_projects")
            .select("project_id")
            .in("event_id", eventIds);
          if (epError) throw epError;
          projectIds = [...new Set((eps || []).map((ep) => ep.project_id).filter(Boolean))];
        }

        if (projectIds === null || projectIds.length > 0) {
          let q = supabase.from("projects").select("id, name").ilike("name", like).limit(10);
          if (projectIds) q = q.in("id", projectIds);
          const { data, error } = await q;
          if (error) throw error;
          (data || []).forEach((pr) => {
            results.push({ id: pr.id, kind: "project", name: pr.name, subtitle: "Prosjekt" });
          });
        }
      }

      // 4) Venues
      {
        let venueIds: string[] | null = null;
        if (eventIds.length > 0 && !includeAll) {
          const { data: evs, error: evError } = await supabase
            .from("events")
            .select("venue_id")
            .in("id", eventIds);
          if (evError) throw evError;
          venueIds = [...new Set((evs || []).map((e) => e.venue_id).filter(Boolean))] as string[];
        }

        if (venueIds === null || venueIds.length > 0) {
          let q = supabase.from("venues").select("id, name").ilike("name", like).limit(10);
          if (venueIds) q = q.in("id", venueIds);
          const { data, error } = await q;
          if (error) throw error;
          (data || []).forEach((vn) => {
            results.push({ id: vn.id, kind: "venue", name: vn.name, subtitle: "Venue" });
          });
        }
      }

      const order: Record<RecipientKind, number> = { persona: 0, project: 1, venue: 2 };
      return results.sort(
        (a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name, "nb")
      );
    },
  });
}
