import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RecipientKind = "act" | "venue" | "team";

export interface RecipientOption {
  id: string;
  kind: RecipientKind;
  name: string;
  subtitle?: string;
}

/**
 * Henter mottakere fra:
 * - event_participants (På scenen/Bak scenen/Arrangør) → kind = 'act'
 * - festival_participants (team: personas/entities) → kind = 'team'
 * - venues brukt i festivalens events → kind = 'venue'
 */
export function useRecipientSearch(festivalId?: string) {
  return useQuery({
    queryKey: ["finance-recipients-participants", festivalId],
    enabled: !!festivalId,
    queryFn: async () => {
      if (!festivalId) return [] as RecipientOption[];

      const recipients: RecipientOption[] = [];

      // 1) Festival events + festival_participants in parallel
      const [festEventsRes, festPartsRes] = await Promise.all([
        supabase
          .from("festival_events")
          .select("event_id")
          .eq("festival_id", festivalId),
        supabase
          .from("festival_participants")
          .select("participant_kind, participant_id, role_label, zone")
          .eq("festival_id", festivalId),
      ]);

      if (festEventsRes.error) throw festEventsRes.error;
      if (festPartsRes.error) throw festPartsRes.error;

      const eventIds = (festEventsRes.data || [])
        .map((fe) => fe.event_id)
        .filter(Boolean) as string[];

      const festParts = festPartsRes.data || [];

      // 2) Event participants (acts)
      const { data: eventParts, error: epError } = eventIds.length
        ? await supabase
            .from("event_participants")
            .select("participant_kind, participant_id, role_label, zone")
            .in("event_id", eventIds)
        : { data: [] as any[], error: null };

      if (epError) throw epError;

      // Collect all persona/entity IDs from both sources
      const allParticipants = [...(eventParts || []), ...festParts];

      const personaIds = new Set<string>();
      const entityIds = new Set<string>();

      allParticipants.forEach((p: any) => {
        if (p.participant_kind === "persona") personaIds.add(p.participant_id);
        if (p.participant_kind === "entity") entityIds.add(p.participant_id);
      });

      // 3) Venues from events
      const { data: eventsWithVenue, error: evError } = eventIds.length
        ? await supabase.from("events").select("id, venue_id").in("id", eventIds)
        : { data: [] as any[], error: null };

      if (evError) throw evError;

      const venueIds = [
        ...new Set(
          (eventsWithVenue || []).map((e: any) => e.venue_id).filter(Boolean)
        ),
      ] as string[];

      // 4) Look up personas, entities, venues in parallel
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

      // 5) Build act recipients from event_participants
      (eventParts || []).forEach((p: any) => {
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
              subtitle: p.role_label || "Akt (prosjekt/entity)",
            });
          }
        }
      });

      // 6) Build team recipients from festival_participants
      festParts.forEach((p: any) => {
        if (p.participant_kind === "persona") {
          const persona = personaMap.get(p.participant_id);
          if (persona) {
            recipients.push({
              id: `persona:${persona.id}`,
              kind: "team",
              name: persona.name,
              subtitle: p.role_label || "Team (person)",
            });
          }
        } else if (p.participant_kind === "entity") {
          const ent = entityMap.get(p.participant_id);
          if (ent) {
            recipients.push({
              id: `entity:${ent.id}`,
              kind: "team",
              name: ent.name,
              subtitle: p.role_label || "Team (prosjekt)",
            });
          }
        }
      });

      // 7) Venues
      (venuesRes.data || []).forEach((v: any) => {
        recipients.push({
          id: `venue:${v.id}`,
          kind: "venue",
          name: v.name,
          subtitle: "Venue",
        });
      });

      // 8) Deduplicate by name
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
