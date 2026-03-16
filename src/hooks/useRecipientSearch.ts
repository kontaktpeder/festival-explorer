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
 * Henter acts (personas/entities fra event_participants) og venues
 * som er knyttet til festivalens events.
 * Brukes som kilde til økonomi-mottakere.
 */
export function useRecipientSearch(festivalId?: string) {
  return useQuery({
    queryKey: ["finance-recipients-participants", festivalId],
    enabled: !!festivalId,
    queryFn: async () => {
      if (!festivalId) return [] as RecipientOption[];

      const recipients: RecipientOption[] = [];

      // 1) Festival events
      const { data: fes, error: feError } = await supabase
        .from("festival_events")
        .select("event_id")
        .eq("festival_id", festivalId);

      if (feError) throw feError;

      const eventIds = (fes || [])
        .map((fe) => fe.event_id)
        .filter(Boolean) as string[];

      if (eventIds.length === 0) return [];

      // 2) Participants from event_participants
      const { data: participants, error: epError } = await supabase
        .from("event_participants")
        .select("participant_kind, participant_id, role_label")
        .in("event_id", eventIds);

      if (epError) throw epError;

      const personaIds = new Set<string>();
      const entityIds = new Set<string>();

      (participants || []).forEach((p) => {
        if (p.participant_kind === "persona") personaIds.add(p.participant_id);
        if (p.participant_kind === "entity") entityIds.add(p.participant_id);
      });

      // 3) Look up names + venues in parallel
      const { data: eventsWithVenue, error: evError } = await supabase
        .from("events")
        .select("id, venue_id")
        .in("id", eventIds);

      if (evError) throw evError;

      const venueIds = [
        ...new Set(
          (eventsWithVenue || []).map((e) => e.venue_id).filter(Boolean)
        ),
      ] as string[];

      const [personasRes, entitiesRes, venuesRes] = await Promise.all([
        personaIds.size > 0
          ? supabase.from("personas").select("id, name, type").in("id", Array.from(personaIds))
          : Promise.resolve({ data: [] as any[], error: null }),
        entityIds.size > 0
          ? supabase.from("entities").select("id, name").in("id", Array.from(entityIds))
          : Promise.resolve({ data: [] as any[], error: null }),
        venueIds.length > 0
          ? supabase.from("venues").select("id, name").in("id", venueIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      if (personasRes.error) throw personasRes.error;
      if (entitiesRes.error) throw entitiesRes.error;
      if (venuesRes.error) throw venuesRes.error;

      const personaMap = new Map<string, any>();
      (personasRes.data || []).forEach((p: any) => personaMap.set(p.id, p));

      const entityMap = new Map<string, any>();
      (entitiesRes.data || []).forEach((e: any) => entityMap.set(e.id, e));

      // 4) Build act recipients from participants
      (participants || []).forEach((p) => {
        if (p.participant_kind === "persona") {
          const persona = personaMap.get(p.participant_id);
          if (persona) {
            recipients.push({
              id: `persona:${persona.id}`,
              kind: "act",
              name: persona.name,
              subtitle: p.role_label || persona.type || "Person",
            });
          }
        } else if (p.participant_kind === "entity") {
          const ent = entityMap.get(p.participant_id);
          if (ent) {
            recipients.push({
              id: `entity:${ent.id}`,
              kind: "act",
              name: ent.name,
              subtitle: p.role_label || "Prosjekt/act",
            });
          }
        }
      });

      // 5) Venues
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
