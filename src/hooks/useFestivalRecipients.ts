import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinanceRecipient {
  id: string;
  name: string;
  kind: "persona" | "entity" | "project" | "venue";
}

export function useFestivalRecipients(festivalId?: string) {
  return useQuery({
    queryKey: ["festival-recipients", festivalId],
    queryFn: async () => {
      if (!festivalId) return [] as FinanceRecipient[];

      const recipients: FinanceRecipient[] = [];

      // 1) Festival participants + festival events in parallel
      const [participantsRes, festivalEventsRes] = await Promise.all([
        supabase
          .from("festival_participants")
          .select("participant_kind, participant_id")
          .eq("festival_id", festivalId),
        supabase
          .from("festival_events")
          .select("event_id")
          .eq("festival_id", festivalId),
      ]);

      if (participantsRes.error) throw participantsRes.error;
      if (festivalEventsRes.error) throw festivalEventsRes.error;

      const personaIds = (participantsRes.data || [])
        .filter((p) => p.participant_kind === "persona")
        .map((p) => p.participant_id);
      const entityIds = (participantsRes.data || [])
        .filter((p) => p.participant_kind === "entity")
        .map((p) => p.participant_id);
      const eventIds = (festivalEventsRes.data || []).map((fe) => fe.event_id);

      // 2) Parallel: personas, entities, projects, venues
      const [personasRes, entitiesRes, projectsRes, venuesRes] = await Promise.all([
        personaIds.length > 0
          ? supabase.from("personas").select("id, name").in("id", personaIds)
          : { data: [] as { id: string; name: string }[], error: null },
        entityIds.length > 0
          ? supabase.from("entities").select("id, name").in("id", entityIds)
          : { data: [] as { id: string; name: string }[], error: null },
        eventIds.length > 0
          ? supabase
              .from("event_projects")
              .select("project:projects (id, name)")
              .in("event_id", eventIds)
          : { data: [] as any[], error: null },
        eventIds.length > 0
          ? supabase
              .from("events")
              .select("venue:venues (id, name)")
              .in("id", eventIds)
              .not("venue_id", "is", null)
          : { data: [] as any[], error: null },
      ]);

      (personasRes.data || []).forEach((p) =>
        recipients.push({ id: `persona:${p.id}`, name: p.name, kind: "persona" })
      );

      (entitiesRes.data || []).forEach((e) =>
        recipients.push({ id: `entity:${e.id}`, name: e.name, kind: "entity" })
      );

      (projectsRes.data || []).forEach((row: any) => {
        if (row.project) {
          recipients.push({
            id: `project:${row.project.id}`,
            name: row.project.name,
            kind: "project",
          });
        }
      });

      (venuesRes.data || []).forEach((row: any) => {
        if (row.venue) {
          recipients.push({
            id: `venue:${row.venue.id}`,
            name: row.venue.name,
            kind: "venue",
          });
        }
      });

      // Deduplicate by name
      const byName = new Map<string, FinanceRecipient>();
      recipients.forEach((r) => {
        if (!byName.has(r.name)) byName.set(r.name, r);
      });

      return Array.from(byName.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "nb")
      );
    },
    enabled: !!festivalId,
  });
}
