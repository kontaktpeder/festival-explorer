import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOpenEventIssues } from "@/hooks/useOpenEventIssues";
import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import {
  buildProductionSlots,
  computeKpis,
  filterProductionSlots,
  groupBySections,
  getUniqueSceneLabels,
  type ProductionFilter,
  type ProductionSlot,
  type ProductionKpis,
  type ProductionSectionKey,
} from "@/lib/production-board-mappers";

interface UseProductionBoardDataParams {
  festivalId: string | null;
  eventId: string | null;
  filter: ProductionFilter;
}

export function useProductionBoardData({
  festivalId,
  eventId,
  filter,
}: UseProductionBoardDataParams) {
  const enabled = !!(festivalId || eventId);

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["production-board-slots", festivalId, eventId],
    enabled,
    queryFn: async () => {
      let q = supabase
        .from("event_program_slots")
        .select(
          "*, performer_entity:entities!event_program_slots_performer_entity_id_fkey(id, name, slug, is_published), performer_persona:personas!event_program_slots_performer_persona_id_fkey(id, name, slug, is_public), entity:entities!event_program_slots_entity_id_fkey(id, name, slug), event:events!event_program_slots_event_id_fkey(id, title, slug)",
        )
        .order("starts_at", { ascending: true });

      if (festivalId) q = q.eq("festival_id", festivalId);
      if (eventId) q = q.eq("event_id", eventId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ExtendedEventProgramSlot[];
    },
  });

  const { data: issues = [], isLoading: issuesLoading } = useOpenEventIssues({
    festivalId,
    eventId,
  });

  const allItems = useMemo(
    () => buildProductionSlots(slots, issues),
    [slots, issues],
  );

  const kpis: ProductionKpis = useMemo(
    () => computeKpis(allItems, issues),
    [allItems, issues],
  );

  const filtered = useMemo(
    () => filterProductionSlots(allItems, filter),
    [allItems, filter],
  );

  const sections: Record<ProductionSectionKey, ProductionSlot[]> = useMemo(
    () => groupBySections(filtered),
    [filtered],
  );

  const sceneLabels = useMemo(() => getUniqueSceneLabels(slots), [slots]);

  return {
    isLoading: slotsLoading || issuesLoading,
    kpis,
    sections,
    sceneLabels,
    allItems,
    filtered,
    issues,
  };
}
