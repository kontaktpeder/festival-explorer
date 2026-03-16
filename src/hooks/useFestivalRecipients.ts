import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinanceRecipient {
  id: string;
  name: string;
  kind: "persona" | "entity";
}

export function useFestivalRecipients(festivalId?: string) {
  return useQuery({
    queryKey: ["festival-recipients", festivalId],
    queryFn: async () => {
      if (!festivalId) return [] as FinanceRecipient[];

      const { data: participants, error } = await supabase
        .from("festival_participants")
        .select("participant_kind, participant_id")
        .eq("festival_id", festivalId);

      if (error) throw error;
      if (!participants || participants.length === 0) return [] as FinanceRecipient[];

      const personaIds = participants
        .filter((p) => p.participant_kind === "persona")
        .map((p) => p.participant_id);
      const entityIds = participants
        .filter((p) => p.participant_kind === "entity")
        .map((p) => p.participant_id);

      const recipients: FinanceRecipient[] = [];

      if (personaIds.length > 0) {
        const { data: personas } = await supabase
          .from("personas")
          .select("id, name")
          .in("id", personaIds);
        (personas || []).forEach((p) =>
          recipients.push({ id: `persona:${p.id}`, name: p.name, kind: "persona" })
        );
      }

      if (entityIds.length > 0) {
        const { data: entities } = await supabase
          .from("entities")
          .select("id, name")
          .in("id", entityIds);
        (entities || []).forEach((e) =>
          recipients.push({ id: `entity:${e.id}`, name: e.name, kind: "entity" })
        );
      }

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
