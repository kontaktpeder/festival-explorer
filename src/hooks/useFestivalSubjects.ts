import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FestivalSubject } from "@/types/festival-subjects";

interface UseFestivalSubjectsOptions {
  includeEntities?: boolean;
  includePersonas?: boolean;
}

export function useFestivalSubjects(
  festivalId: string | null | undefined,
  options: UseFestivalSubjectsOptions = { includeEntities: true, includePersonas: true }
) {
  const { includeEntities = true, includePersonas = true } = options;

  return useQuery({
    queryKey: ["festival-subjects", festivalId, includeEntities, includePersonas],
    enabled: !!festivalId,
    queryFn: async (): Promise<FestivalSubject[]> => {
      if (!festivalId) return [];

      // 1) Find all events in the festival
      const { data: feRows, error: feError } = await supabase
        .from("festival_events")
        .select("event_id")
        .eq("festival_id", festivalId);
      if (feError) throw feError;

      const eventIds = (feRows ?? []).map((r) => r.event_id).filter(Boolean) as string[];
      const hasEvents = eventIds.length > 0;

      // 2) Fetch from all sources in parallel
      const [epRes, eeRes, fpRes, slotsRes] = await Promise.all([
        hasEvents
          ? supabase
              .from("event_participants")
              .select("event_id, participant_kind, participant_id")
              .in("event_id", eventIds)
          : Promise.resolve({ data: [], error: null } as any),
        hasEvents
          ? supabase
              .from("event_entities")
              .select("event_id, entity_id")
              .in("event_id", eventIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from("festival_participants")
          .select("participant_kind, participant_id")
          .eq("festival_id", festivalId),
        supabase
          .from("event_program_slots")
          .select("entity_id, performer_entity_id, performer_persona_id")
          .eq("festival_id", festivalId),
      ]);

      if (epRes.error) throw epRes.error;
      if (eeRes.error) throw eeRes.error;
      if (fpRes.error) throw fpRes.error;
      if (slotsRes.error) throw slotsRes.error;

      const entityIds = new Set<string>();
      const personaIds = new Set<string>();
      const eventIdsByEntity = new Map<string, Set<string>>();
      const eventIdsByPersona = new Map<string, Set<string>>();

      const addEntity = (id: string, eventId?: string) => {
        if (!includeEntities) return;
        entityIds.add(id);
        if (eventId) {
          const set = eventIdsByEntity.get(id) || new Set<string>();
          set.add(eventId);
          eventIdsByEntity.set(id, set);
        }
      };

      const addPersona = (id: string, eventId?: string) => {
        if (!includePersonas) return;
        personaIds.add(id);
        if (eventId) {
          const set = eventIdsByPersona.get(id) || new Set<string>();
          set.add(eventId);
          eventIdsByPersona.set(id, set);
        }
      };

      // 2a) event_participants (new model)
      (epRes.data ?? []).forEach((p: any) => {
        if (!p.participant_id) return;
        if (p.participant_kind === "persona") {
          addPersona(p.participant_id, p.event_id);
        } else {
          addEntity(p.participant_id, p.event_id);
        }
      });

      // 2b) event_entities (legacy)
      (eeRes.data ?? []).forEach((row: any) => {
        if (row.entity_id) addEntity(row.entity_id, row.event_id);
      });

      // 2c) festival_participants (host/backstage)
      (fpRes.data ?? []).forEach((fp: any) => {
        if (!fp.participant_id) return;
        if (fp.participant_kind === "persona") {
          addPersona(fp.participant_id);
        } else {
          addEntity(fp.participant_id);
        }
      });

      // 2d) program slots (already linked)
      (slotsRes.data ?? []).forEach((s: any) => {
        if (s.entity_id) addEntity(s.entity_id);
        if (s.performer_entity_id) addEntity(s.performer_entity_id);
        if (s.performer_persona_id) addPersona(s.performer_persona_id);
      });

      // 3) Fetch actual entities & personas
      const [entitiesRes, personasRes] = await Promise.all([
        includeEntities && entityIds.size > 0
          ? supabase.from("entities").select("id, name, slug").in("id", Array.from(entityIds))
          : Promise.resolve({ data: [], error: null } as any),
        includePersonas && personaIds.size > 0
          ? supabase.from("personas").select("id, name, slug").in("id", Array.from(personaIds))
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (entitiesRes.error) throw entitiesRes.error;
      if (personasRes.error) throw personasRes.error;

      const subjects: FestivalSubject[] = [];

      (entitiesRes.data ?? []).forEach((e: any) => {
        subjects.push({
          id: e.id,
          kind: "entity",
          name: e.name,
          slug: e.slug,
          source: "event_participant",
          eventIds: Array.from(eventIdsByEntity.get(e.id) || []),
        });
      });

      (personasRes.data ?? []).forEach((p: any) => {
        subjects.push({
          id: p.id,
          kind: "persona",
          name: p.name,
          slug: p.slug,
          source: "event_participant",
          eventIds: Array.from(eventIdsByPersona.get(p.id) || []),
        });
      });

      return subjects.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}
