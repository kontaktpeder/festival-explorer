import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinanceRecipient {
  id: string;
  name: string;
  kind: "persona" | "entity" | "project";
}

export function useFestivalRecipients(festivalId?: string) {
  return useQuery({
    queryKey: ["festival-recipients", festivalId],
    queryFn: async () => {
      if (!festivalId) return [] as FinanceRecipient[];

      const recipients: FinanceRecipient[] = [];

      // 1) Festival participants → personas / entities
      const { data: participants, error } = await supabase
        .from("festival_participants")
        .select("participant_kind, participant_id")
        .eq("festival_id", festivalId);

      if (error) throw error;

      const personaIds = (participants || [])
        .filter((p) => p.participant_kind === "persona")
        .map((p) => p.participant_id);
      const entityIds = (participants || [])
        .filter((p) => p.participant_kind === "entity")
        .map((p) => p.participant_id);

      // 2) Festival events → event_projects → projects
      const { data: festivalEvents } = await supabase
        .from("festival_events")
        .select("event_id")
        .eq("festival_id", festivalId);

      const eventIds = (festivalEvents || []).map((fe) => fe.event_id);

      // Run parallel fetches
      const [personasRes, entitiesRes, projectsRes] = await Promise.all([
        personaIds.length > 0
          ? supabase.from("personas").select("id, name").in("id", personaIds)
          : { data: [] as { id: string; name: string }[] },
        entityIds.length > 0
          ? supabase.from("entities").select("id, name").in("id", entityIds)
          : { data: [] as { id: string; name: string }[] },
        eventIds.length > 0
          ? supabase
              .from("event_projects")
              .select("project:projects (id, name)")
              .in("event_id", eventIds)
          : { data: [] as any[] },
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
