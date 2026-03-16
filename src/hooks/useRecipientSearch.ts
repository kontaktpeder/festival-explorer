import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RecipientKind = "act" | "venue";

export interface RecipientOption {
  id: string;
  kind: RecipientKind;
  name: string;
  subtitle?: string;
}

/**
 * Henter acts (entities/personas fra program-slots) og venues
 * som er knyttet til festivalens events.
 * Brukes som kilde til økonomi-mottakere.
 */
export function useRecipientSearch(festivalId?: string) {
  return useQuery({
    queryKey: ["finance-recipients-program", festivalId],
    enabled: !!festivalId,
    queryFn: async () => {
      if (!festivalId) return [] as RecipientOption[];

      const recipients: RecipientOption[] = [];

      // 1) Festival events (with venue_id)
      const { data: fes, error: feError } = await supabase
        .from("festival_events")
        .select("event_id, event:events(id, venue_id)")
        .eq("festival_id", festivalId);

      if (feError) throw feError;

      const eventIds = (fes || [])
        .map((fe) => fe.event_id)
        .filter(Boolean) as string[];

      if (eventIds.length === 0) return [];

      // 2) Acts from program slots + venues in parallel
      const venueIds = [
        ...new Set(
          (fes || [])
            .map((fe: any) => fe.event?.venue_id)
            .filter(Boolean)
        ),
      ] as string[];

      const [slotsRes, venuesRes] = await Promise.all([
        supabase
          .from("event_program_slots")
          .select(`
            id,
            performer_kind,
            performer_name_override,
            performer_entity:entities!event_program_slots_performer_entity_id_fkey (id, name),
            performer_persona:personas!event_program_slots_performer_persona_id_fkey (id, name)
          `)
          .in("event_id", eventIds)
          .eq("is_canceled", false),
        venueIds.length > 0
          ? supabase.from("venues").select("id, name").in("id", venueIds)
          : { data: [] as { id: string; name: string }[], error: null },
      ]);

      if (slotsRes.error) throw slotsRes.error;
      if (venuesRes.error) throw venuesRes.error;

      (slotsRes.data || []).forEach((slot: any) => {
        if (slot.performer_entity) {
          recipients.push({
            id: `entity:${slot.performer_entity.id}`,
            kind: "act",
            name: slot.performer_name_override || slot.performer_entity.name,
            subtitle: "Akt (prosjekt)",
          });
        }
        if (slot.performer_persona) {
          recipients.push({
            id: `persona:${slot.performer_persona.id}`,
            kind: "act",
            name: slot.performer_name_override || slot.performer_persona.name,
            subtitle: "Akt (person)",
          });
        }
      });

      (venuesRes.data || []).forEach((v: any) => {
        recipients.push({
          id: `venue:${v.id}`,
          kind: "venue",
          name: v.name,
          subtitle: "Venue",
        });
      });

      // Deduplicate by name
      const byName = new Map<string, RecipientOption>();
      recipients.forEach((r) => {
        if (!byName.has(r.name)) byName.set(r.name, r);
      });

      return Array.from(byName.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "nb")
      );
    },
  });
}
