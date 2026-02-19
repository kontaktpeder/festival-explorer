import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Festival, FestivalEvent, Event, EventEntity, Entity, Venue } from "@/types/database";

// Re-export entity hooks for convenience
export { useEntity, useMyEntities, useAdminEntities, usePublishedEntitiesByType } from "./useEntity";

/** Festival IDs where a specific persona is a team member (host/backstage) */
export function useFestivalIdsForPersona(personaId: string | null) {
  return useQuery({
    queryKey: ["festival-ids-for-persona", personaId],
    queryFn: async () => {
      if (!personaId) return [];
      const { data, error } = await supabase
        .from("festival_participants")
        .select("festival_id")
        .eq("participant_id", personaId)
        .eq("participant_kind", "persona")
        .in("zone", ["host", "backstage"]);
      if (error) throw error;
      return [...new Set((data || []).map((r) => r.festival_id))];
    },
    enabled: !!personaId,
  });
}

/** Fast shell: festival metadata + sections only. Renders hero immediately. */
export function useFestivalShell(slug: string) {
  return useQuery({
    queryKey: ["festival-shell", slug],
    queryFn: async () => {
      const { data: festival, error } = await supabase
        .from("festivals")
        .select(`*, theme:themes(*)`)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!festival) return null;

      const { data: sections, error: sectionsError } = await supabase
        .from("festival_sections")
        .select("*")
        .eq("festival_id", festival.id)
        .eq("is_enabled", true)
        .order("sort_order", { ascending: true });
      if (sectionsError) throw sectionsError;

      return {
        ...festival,
        sections: sections || [],
        date_range_section_id: (festival as any).date_range_section_id as string | null,
        description_section_id: (festival as any).description_section_id as string | null,
        name_section_id: (festival as any).name_section_id as string | null,
      };
    },
    enabled: !!slug,
  });
}

/** Slow details: events, lineup, team. Use after shell resolves. */
export function useFestivalDetails(festivalId: string | null | undefined) {
  return useQuery({
    queryKey: ["festival-details", festivalId],
    queryFn: async () => {
      if (!festivalId) return null;

      const { data: festivalEvents, error: eventsError } = await supabase
        .from("festival_events")
        .select(`*, event:events(*, venue:venues(*))`)
        .eq("festival_id", festivalId)
        .order("sort_order", { ascending: true });
      if (eventsError) throw eventsError;

      const eventIds = (festivalEvents || []).map((fe) => fe.event?.id).filter(Boolean) as string[];

      const [participantsResult, legacyLineupResult, festivalParticipantsResult] = await Promise.all([
        eventIds.length > 0
          ? supabase.from("event_participants").select("event_id, participant_kind, participant_id, role_label, sort_order").in("event_id", eventIds).eq("zone", "on_stage").order("sort_order", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        eventIds.length > 0
          ? supabase.from("event_entities").select(`*, entity:entities(*)`).in("event_id", eventIds).order("billing_order", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        supabase.from("festival_participants").select("*").eq("festival_id", festivalId).in("zone", ["backstage", "host"]).order("zone", { ascending: true }).order("sort_order", { ascending: true }),
      ]);

      const allParticipants = participantsResult.data || [];
      const allLegacyLineupItems = legacyLineupResult.data || [];
      const rawFestivalParticipants = festivalParticipantsResult.data || [];

      const participantsByEventId = new Map<string, typeof allParticipants>();
      for (const p of allParticipants) {
        const existing = participantsByEventId.get(p.event_id) || [];
        existing.push(p);
        participantsByEventId.set(p.event_id, existing);
      }

      const personaIdsSet = new Set<string>();
      const entityIdsSet = new Set<string>();
      for (const p of allParticipants) {
        if (p.participant_kind === "persona") personaIdsSet.add(p.participant_id);
        else entityIdsSet.add(p.participant_id);
      }

      const [personasRes, entitiesRes] = await Promise.all([
        personaIdsSet.size > 0 ? supabase.from("personas").select("id,name,slug,hero_image_url,is_public").in("id", Array.from(personaIdsSet)) : Promise.resolve({ data: [] as any[] }),
        entityIdsSet.size > 0 ? supabase.from("entities").select("id,name,slug,tagline,hero_image_url,logo_url,logo_display_mode,is_published,type").in("id", Array.from(entityIdsSet)) : Promise.resolve({ data: [] as any[] }),
      ]);

      const personaMap = new Map((personasRes.data || []).map((p: any) => [p.id, p]));
      const entityMap = new Map((entitiesRes.data || []).map((e: any) => [e.id, e]));

      const legacyLineupByEventId = new Map<string, typeof allLegacyLineupItems>();
      for (const item of allLegacyLineupItems) {
        if (item.entity?.is_published !== true) continue;
        const existing = legacyLineupByEventId.get(item.event_id) || [];
        existing.push(item);
        legacyLineupByEventId.set(item.event_id, existing);
      }

      const eventsWithLineup = (festivalEvents || []).map((fe) => {
        if (!fe.event) return fe;
        const eventParticipants = participantsByEventId.get(fe.event.id);
        if (eventParticipants && eventParticipants.length > 0) {
          const lineup = eventParticipants.map((p) => {
            if (p.participant_kind === "persona") {
              const persona = personaMap.get(p.participant_id);
              if (!persona || persona.is_public === false) return null;
              return { entity_id: p.participant_id, event_id: p.event_id, billing_order: p.sort_order, is_featured: false, feature_order: null, entity: { id: persona.id, name: persona.name, slug: persona.slug, tagline: null, hero_image_url: persona.hero_image_url, is_published: true } };
            } else {
              const ent = entityMap.get(p.participant_id);
              if (!ent || ent.is_published !== true) return null;
              return { entity_id: p.participant_id, event_id: p.event_id, billing_order: p.sort_order, is_featured: false, feature_order: null, entity: ent };
            }
          }).filter(Boolean);
          const legacyForEvent = legacyLineupByEventId.get(fe.event.id) || [];
          const lineupWithFeatured = lineup.map((entry: any) => ({ ...entry, is_featured: legacyForEvent.find((le: any) => le.entity_id === entry.entity_id)?.is_featured ?? false }));
          return { ...fe, event: { ...fe.event, lineup: lineupWithFeatured } };
        }
        return { ...fe, event: { ...fe.event, lineup: legacyLineupByEventId.get(fe.event.id) || [] } };
      });

      const sortedEvents = eventsWithLineup.sort((a, b) => {
        if (!a.event || !b.event) return 0;
        return new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime();
      });

      const allArtistsWithEventSlug: Array<{ id: string; name: string; slug: string; tagline?: string | null; hero_image_url?: string | null; logo_url?: string | null; logo_display_mode?: string | null; event_slug: string }> = [];
      sortedEvents.forEach((fe) => {
        if (!fe.event) return;
        (((fe.event as any).lineup as any[]) || []).forEach((lineupItem: any) => {
          if (lineupItem.entity?.is_published === true) {
            allArtistsWithEventSlug.push({ id: lineupItem.entity.id, name: lineupItem.entity.name, slug: lineupItem.entity.slug, tagline: lineupItem.entity.tagline, hero_image_url: lineupItem.entity.hero_image_url, logo_url: lineupItem.entity.logo_url ?? null, logo_display_mode: lineupItem.entity.logo_display_mode ?? null, event_slug: fe.event!.slug });
          }
        });
      });

      // Resolve festival team
      let festivalBackstage: Array<Record<string, unknown>> = [];
      let festivalHostRoles: Array<Record<string, unknown>> = [];
      if (rawFestivalParticipants.length > 0) {
        const fpPersonaIds = rawFestivalParticipants.filter((p) => p.participant_kind === "persona").map((p) => p.participant_id);
        const fpEntityIds = rawFestivalParticipants.filter((p) => p.participant_kind !== "persona").map((p) => p.participant_id);
        const [fpPersonasRes, fpEntitiesRes] = await Promise.all([
          fpPersonaIds.length > 0 ? supabase.from("personas").select("id,name,slug,avatar_url,is_public,category_tags").in("id", fpPersonaIds) : Promise.resolve({ data: [] as any[] }),
          fpEntityIds.length > 0 ? supabase.from("entities").select("id,name,slug,hero_image_url,is_published,type").in("id", fpEntityIds) : Promise.resolve({ data: [] as any[] }),
        ]);
        const fpPersonaMap = new Map((fpPersonasRes.data || []).map((p: any) => [p.id, p]));
        const fpEntityMap = new Map((fpEntitiesRes.data || []).map((e: any) => [e.id, e]));
        rawFestivalParticipants.forEach((p) => {
          const resolved = p.participant_kind === "persona" ? fpPersonaMap.get(p.participant_id) : fpEntityMap.get(p.participant_id);
          if (!resolved) return;
          if (p.participant_kind !== "persona" && resolved.is_published === false) return;
          if (p.participant_kind === "persona" && resolved.is_public === false) return;
          const item = { participant_kind: p.participant_kind, participant_id: p.participant_id, entity: p.participant_kind !== "persona" ? resolved : null, persona: p.participant_kind === "persona" ? resolved : null, role_label: p.role_label, sort_order: p.sort_order };
          if (p.zone === "backstage") festivalBackstage.push(item);
          else if (p.zone === "host") festivalHostRoles.push(item);
        });
      }

      return {
        festivalEvents: sortedEvents,
        allArtistsWithEventSlug,
        festivalTeam: { backstage: festivalBackstage, hostRoles: festivalHostRoles },
      };
    },
    enabled: !!festivalId,
  });
}

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

      // Collect all event IDs for batched queries
      const eventIds = (festivalEvents || [])
        .map((fe) => fe.event?.id)
        .filter(Boolean) as string[];

      // Run participants + legacy lineup + sections queries IN PARALLEL
      const [participantsResult, legacyLineupResult, sectionsResult, festivalParticipantsResult] = await Promise.all([
        // NEW: Fetch on_stage participants for all events
        eventIds.length > 0
          ? supabase
              .from("event_participants")
              .select("event_id, participant_kind, participant_id, role_label, sort_order")
              .in("event_id", eventIds)
              .eq("zone", "on_stage")
              .order("sort_order", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        // Legacy: event_entities (used as fallback per event)
        eventIds.length > 0
          ? supabase
              .from("event_entities")
              .select(`*, entity:entities(*)`)
              .in("event_id", eventIds)
              .order("billing_order", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        // Festival sections (independent)
        supabase
          .from("festival_sections")
          .select("*")
          .eq("festival_id", festival.id)
          .eq("is_enabled", true)
          .order("sort_order", { ascending: true }),
        // Festival-level team (host/backstage)
        supabase
          .from("festival_participants")
          .select("*")
          .eq("festival_id", festival.id)
          .in("zone", ["backstage", "host"])
          .order("zone", { ascending: true })
          .order("sort_order", { ascending: true }),
      ]);

      const allParticipants = participantsResult.data || [];
      const allLegacyLineupItems = legacyLineupResult.data || [];
      const sections = sectionsResult.data || [];
      const rawFestivalParticipants = festivalParticipantsResult.data || [];
      if (sectionsResult.error) throw sectionsResult.error;

      // Group participants by event_id
      const participantsByEventId = new Map<string, typeof allParticipants>();
      for (const p of allParticipants) {
        const existing = participantsByEventId.get(p.event_id) || [];
        existing.push(p);
        participantsByEventId.set(p.event_id, existing);
      }

      // Resolve persona + entity refs from participants
      const personaIdsFromParticipants = new Set<string>();
      const entityIdsFromParticipants = new Set<string>();
      for (const p of allParticipants) {
        if (p.participant_kind === "persona") personaIdsFromParticipants.add(p.participant_id);
        else entityIdsFromParticipants.add(p.participant_id);
      }

      const [personasRes, participantEntitiesRes] = await Promise.all([
        personaIdsFromParticipants.size > 0
          ? supabase.from("personas").select("id,name,slug,hero_image_url,is_public").in("id", Array.from(personaIdsFromParticipants))
          : Promise.resolve({ data: [] as any[] }),
        entityIdsFromParticipants.size > 0
          ? supabase.from("entities").select("id,name,slug,tagline,hero_image_url,logo_url,logo_display_mode,is_published,type").in("id", Array.from(entityIdsFromParticipants))
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const personaMap = new Map((personasRes.data || []).map((p: any) => [p.id, p]));
      const participantEntityMap = new Map((participantEntitiesRes.data || []).map((e: any) => [e.id, e]));

      // Group legacy lineup items by event_id and filter unpublished
      const legacyLineupByEventId = new Map<string, typeof allLegacyLineupItems>();
      for (const item of allLegacyLineupItems) {
        if (item.entity?.is_published !== true) continue;
        const existing = legacyLineupByEventId.get(item.event_id) || [];
        existing.push(item);
        legacyLineupByEventId.set(item.event_id, existing);
      }

      // Attach lineup to each event – participants-first per event
      const eventsWithLineup = (festivalEvents || []).map((fe) => {
        if (!fe.event) return fe;
        const eventParticipants = participantsByEventId.get(fe.event.id);

        if (eventParticipants && eventParticipants.length > 0) {
          // Use participants – map to entity-like shape for compatibility
          const lineup = eventParticipants
            .map((p) => {
              if (p.participant_kind === "persona") {
                const persona = personaMap.get(p.participant_id);
                if (!persona || persona.is_public === false) return null;
                return {
                  entity_id: p.participant_id,
                  event_id: p.event_id,
                  billing_order: p.sort_order,
                  is_featured: false,
                  feature_order: null,
                  entity: {
                    id: persona.id,
                    name: persona.name,
                    slug: persona.slug,
                    tagline: null,
                    hero_image_url: persona.hero_image_url,
                    is_published: true,
                  },
                };
              } else {
                const ent = participantEntityMap.get(p.participant_id);
                if (!ent || ent.is_published !== true) return null;
                return {
                  entity_id: p.participant_id,
                  event_id: p.event_id,
                  billing_order: p.sort_order,
                  is_featured: false,
                  feature_order: null,
                  entity: ent,
                };
              }
            })
            .filter(Boolean);

          // Merge is_featured from legacy event_entities
          const legacyForEvent = legacyLineupByEventId.get(fe.event.id) || [];
          const lineupWithFeatured = lineup.map((entry: any) => {
            const legacy = legacyForEvent.find((le: any) => le.entity_id === (entry.entity_id ?? entry.participant_id));
            return { ...entry, is_featured: legacy?.is_featured ?? false };
          });

          return {
            ...fe,
            event: { ...fe.event, lineup: lineupWithFeatured },
          };
        }

        // Fallback: legacy event_entities
        return {
          ...fe,
          event: {
            ...fe.event,
            lineup: legacyLineupByEventId.get(fe.event.id) || [],
          },
        };
      });

      // Sort events chronologically by start_at (earliest first)
      const sortedEvents = eventsWithLineup.sort((a, b) => {
        if (!a.event || !b.event) return 0;
        const dateA = new Date(a.event.start_at).getTime();
        const dateB = new Date(b.event.start_at).getTime();
        return dateA - dateB;
      });

      // Collect ALL artists with their event_slug for lineup sections
      const allArtistsWithEventSlug: Array<{
        id: string;
        name: string;
        slug: string;
        tagline?: string | null;
        hero_image_url?: string | null;
        logo_url?: string | null;
        logo_display_mode?: string | null;
        event_slug: string;
      }> = [];
      
      sortedEvents.forEach((fe) => {
        if (!fe.event) return;
        const eventSlug = fe.event.slug;
        const eventWithLineup = fe.event as { lineup?: any[] };
        (eventWithLineup.lineup || []).forEach((lineupItem: any) => {
          if (lineupItem.entity && lineupItem.entity.is_published === true) {
            allArtistsWithEventSlug.push({
              id: lineupItem.entity.id,
              name: lineupItem.entity.name,
              slug: lineupItem.entity.slug,
              tagline: lineupItem.entity.tagline,
              hero_image_url: lineupItem.entity.hero_image_url,
              logo_url: lineupItem.entity.logo_url ?? null,
              logo_display_mode: lineupItem.entity.logo_display_mode ?? null,
              event_slug: eventSlug,
            });
          }
        });
      });

      // Extract all artist IDs from sections' content_json
      const allArtistIds = new Set<string>();
      sections.forEach((section) => {
        const rawContent = section.content_json as Record<string, unknown> | null;
        const content = (rawContent?.content as Record<string, unknown>) || rawContent;
        const artistIds = (content?.artists as string[]) || [];
        artistIds.forEach((id) => allArtistIds.add(id));
      });

      // Fetch section artists (only if needed)
      let sectionArtists: Array<{ id: string; name: string; slug: string; tagline?: string | null; type?: string }> = [];
      if (allArtistIds.size > 0) {
        const { data: entities } = await supabase
          .from("entities")
          .select("id, name, slug, tagline, type, logo_url")
          .in("id", Array.from(allArtistIds))
          .eq("is_published", true);
        
        sectionArtists = (entities || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          slug: e.slug,
          tagline: e.tagline,
          type: e.type,
          logo_url: e.logo_url ?? null,
        }));
      }

      // Resolve festival-level team (host/backstage)
      let festivalBackstage: Array<Record<string, unknown>> = [];
      let festivalHostRoles: Array<Record<string, unknown>> = [];

      if (rawFestivalParticipants.length > 0) {
        const fpPersonaIds = rawFestivalParticipants
          .filter((p) => p.participant_kind === "persona")
          .map((p) => p.participant_id);
        const fpEntityIds = rawFestivalParticipants
          .filter((p) => p.participant_kind !== "persona")
          .map((p) => p.participant_id);

        const [fpPersonasRes, fpEntitiesRes] = await Promise.all([
          fpPersonaIds.length > 0
            ? supabase.from("personas").select("id,name,slug,avatar_url,is_public,category_tags").in("id", fpPersonaIds)
            : Promise.resolve({ data: [] as any[] }),
          fpEntityIds.length > 0
            ? supabase.from("entities").select("id,name,slug,hero_image_url,is_published,type").in("id", fpEntityIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const fpPersonaMap = new Map((fpPersonasRes.data || []).map((p: any) => [p.id, p]));
        const fpEntityMap = new Map((fpEntitiesRes.data || []).map((e: any) => [e.id, e]));

        rawFestivalParticipants.forEach((p) => {
          const resolved =
            p.participant_kind === "persona"
              ? fpPersonaMap.get(p.participant_id)
              : fpEntityMap.get(p.participant_id);

          if (!resolved) return;
          if (p.participant_kind !== "persona" && resolved.is_published === false) return;
          if (p.participant_kind === "persona" && resolved.is_public === false) return;

          const item = {
            participant_kind: p.participant_kind,
            participant_id: p.participant_id,
            entity: p.participant_kind !== "persona" ? resolved : null,
            persona: p.participant_kind === "persona" ? resolved : null,
            role_label: p.role_label,
            sort_order: p.sort_order,
          };

          if (p.zone === "backstage") festivalBackstage.push(item);
          else if (p.zone === "host") festivalHostRoles.push(item);
        });
      }

      return {
        ...festival,
        festivalEvents: sortedEvents,
        sections: sections || [],
        sectionArtists,
        allArtistsWithEventSlug,
        festivalTeam: {
          backstage: festivalBackstage,
          hostRoles: festivalHostRoles,
        },
        date_range_section_id: (festival as any).date_range_section_id as string | null,
        description_section_id: (festival as any).description_section_id as string | null,
        name_section_id: (festival as any).name_section_id as string | null,
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

      // NEW ROLE MODEL STEP 1.1: Try event_participants first, fallback to event_entities
      const { data: participants } = await supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", event.id)
        .order("zone", { ascending: true })
        .order("sort_order", { ascending: true });

      let lineup: Array<Record<string, unknown>> = [];
      let backstage: Array<Record<string, unknown>> = [];
      let hostRoles: Array<Record<string, unknown>> = [];

      if (participants && participants.length > 0) {
        // Resolve participant references
        const projectIds = participants
          .filter((p) => p.participant_kind === "project" || p.participant_kind === "entity")
          .map((p) => p.participant_id);
        const personaIds = participants
          .filter((p) => p.participant_kind === "persona")
          .map((p) => p.participant_id);

        const [entitiesRes, personasRes] = await Promise.all([
          projectIds.length > 0
            ? supabase.from("entities").select("*").in("id", projectIds)
            : Promise.resolve({ data: [] as any[] }),
          personaIds.length > 0
            ? supabase.from("personas").select("*").in("id", personaIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const entitiesMap = new Map((entitiesRes.data || []).map((e: any) => [e.id, e]));
        const personasMap = new Map((personasRes.data || []).map((p: any) => [p.id, p]));

        // Also fetch legacy event_entities for is_featured
        const { data: legacyLineup } = await supabase
          .from("event_entities")
          .select("entity_id, is_featured")
          .eq("event_id", event.id);

        const featuredMap = new Map((legacyLineup || []).map((r: any) => [r.entity_id, !!r.is_featured]));

        participants.forEach((p, idx) => {
          const resolved =
            p.participant_kind === "persona"
              ? personasMap.get(p.participant_id)
              : entitiesMap.get(p.participant_id);

          // Skip unpublished entities (personas use is_public, entities use is_published)
          if (!resolved) return;
          if (p.participant_kind !== "persona" && resolved.is_published === false) return;
          if (p.participant_kind === "persona" && resolved.is_public === false) return;

          const item = {
            participant_kind: p.participant_kind,
            participant_id: p.participant_id,
            entity: p.participant_kind !== "persona" ? resolved : null,
            persona: p.participant_kind === "persona" ? resolved : null,
            role_label: p.role_label,
            sort_order: p.sort_order,
            billing_order: idx + 1,
            entity_id: p.participant_kind !== "persona" ? p.participant_id : undefined,
            is_featured: featuredMap.get(p.participant_id) ?? false,
          };

          if (p.zone === "on_stage") lineup.push(item);
          else if (p.zone === "backstage") backstage.push(item);
          else if (p.zone === "host") hostRoles.push(item);
        });
      } else {
        // Fallback: legacy event_entities
        const { data: legacyLineup } = await supabase
          .from("event_entities")
          .select(`*, entity:entities(*)`)
          .eq("event_id", event.id)
          .order("billing_order", { ascending: true });

        lineup = (legacyLineup || []).filter((i) => i.entity?.is_published === true);
      }

      // Check if event belongs to a festival + fetch festival participants
      const { data: festivalEvent } = await supabase
        .from("festival_events")
        .select(`festival_id, festival:festivals(slug, name)`)
        .eq("event_id", event.id)
        .maybeSingle();

      let festivalBackstage: Array<Record<string, unknown>> = [];
      let festivalHostRoles: Array<Record<string, unknown>> = [];

      if (festivalEvent?.festival_id) {
        const { data: festivalParticipants } = await supabase
          .from("festival_participants")
          .select("*")
          .eq("festival_id", festivalEvent.festival_id)
          .in("zone", ["backstage", "host"])
          .order("sort_order", { ascending: true });

        if (festivalParticipants && festivalParticipants.length > 0) {
          // Resolve references
          const fpPersonaIds = festivalParticipants.filter((p) => p.participant_kind === "persona").map((p) => p.participant_id);
          const fpEntityIds = festivalParticipants.filter((p) => p.participant_kind !== "persona").map((p) => p.participant_id);

          const [fpPersonasRes, fpEntitiesRes] = await Promise.all([
            fpPersonaIds.length > 0
              ? supabase.from("personas").select("*").in("id", fpPersonaIds)
              : Promise.resolve({ data: [] as any[] }),
            fpEntityIds.length > 0
              ? supabase.from("entities").select("*").in("id", fpEntityIds)
              : Promise.resolve({ data: [] as any[] }),
          ]);

          const fpPersonaMap = new Map((fpPersonasRes.data || []).map((p: any) => [p.id, p]));
          const fpEntityMap = new Map((fpEntitiesRes.data || []).map((e: any) => [e.id, e]));

          festivalParticipants.forEach((p) => {
            const resolved =
              p.participant_kind === "persona"
                ? fpPersonaMap.get(p.participant_id)
                : fpEntityMap.get(p.participant_id);

            if (!resolved) return;
            if (p.participant_kind !== "persona" && resolved.is_published === false) return;
            if (p.participant_kind === "persona" && resolved.is_public === false) return;

            const item = {
              participant_kind: p.participant_kind,
              participant_id: p.participant_id,
              entity: p.participant_kind !== "persona" ? resolved : null,
              persona: p.participant_kind === "persona" ? resolved : null,
              role_label: p.role_label,
              sort_order: p.sort_order,
              scope: "festival" as const,
            };

            if (p.zone === "backstage") festivalBackstage.push(item);
            else if (p.zone === "host") festivalHostRoles.push(item);
          });
        }
      }

      // Fetch program slots
      const { data: programSlots } = await supabase
        .from("event_program_slots" as any)
        .select(`
          *,
          entity:entities(id, name, slug, tagline, hero_image_url, type)
        `)
        .eq("event_id", event.id)
        .order("starts_at", { ascending: true });

      return {
        ...event,
        lineup,
        programSlots: (programSlots || []) as any[],
        backstage: {
          festival: festivalBackstage,
          event: backstage,
        },
        hostRoles: {
          festival: festivalHostRoles,
          event: hostRoles,
        },
        festival: festivalEvent?.festival || null,
      };
    },
    enabled: !!slug,
  });
}

/**
 * @deprecated Use useEntity from useEntity.ts instead
 * Kept for backwards compatibility during migration
 */
export function useProject(slug: string) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: async () => {
      // Try entities first (NEW)
      const { data: entity, error: entityError } = await supabase
        .from("entities")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .in("type", ["solo", "band"])
        .maybeSingle();

      if (!entityError && entity) {
        // Get public team members from entity_team
        const { data: team } = await supabase
          .from("entity_team")
          .select(`
            *,
            profile:profiles(*)
          `)
          .eq("entity_id", entity.id)
          .eq("is_public", true)
          .is("left_at", null);

        // Map to old format for compatibility
        return {
          ...entity,
          type: entity.type as 'solo' | 'band',
          members: (team || []).map(t => ({
            project_id: entity.id,
            profile_id: t.user_id,
            role_label: t.role_labels?.[0] || null,
            is_admin: t.access === 'admin' || t.access === 'owner',
            is_public: t.is_public,
            joined_at: t.joined_at,
            left_at: t.left_at,
            profile: t.profile,
          })),
        };
      }

      // Fallback to old projects table for backwards compatibility
      const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
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
      // Try venues table first (primary source for /admin/venues edits)
      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (!venueError && venue) {
        // Get upcoming events at this venue
        const { data: events } = await supabase
          .from("events")
          .select("*")
          .eq("venue_id", venue.id)
          .eq("status", "published")
          .gte("start_at", new Date().toISOString())
          .order("start_at", { ascending: true });

        return {
          ...venue,
          upcomingEvents: events || [],
        };
      }

      // Fallback to entities table (for venues created as entities)
      const { data: entity, error: entityError } = await supabase
        .from("entities")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .eq("type", "venue")
        .maybeSingle();

      if (entityError) throw entityError;
      if (!entity) return null;

      // Get upcoming events at this entity venue
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("venue_id", entity.id)
        .eq("status", "published")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true });

      return {
        ...entity,
        upcomingEvents: events || [],
      };
    },
    enabled: !!slug,
  });
}
