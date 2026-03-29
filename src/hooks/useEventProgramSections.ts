import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventProgramSection, EventProgramPhaseType } from "@/types/program-sections";

export function useEventProgramSections(
  eventId: string | null,
  festivalId: string | null
) {
  const queryKey = ["event-program-sections", eventId, festivalId];
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading } = useQuery({
    queryKey,
    enabled: !!eventId || !!festivalId,
    queryFn: async () => {
      let q = supabase
        .from("event_program_sections" as any)
        .select("*")
        .order("sort_order", { ascending: true });

      if (festivalId) q = q.eq("festival_id", festivalId);
      else if (eventId) q = q.eq("event_id", eventId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as EventProgramSection[];
    },
  });

  const createSection = useMutation({
    mutationFn: async ({
      type,
      sortOrder,
      startsAtLocal = "12:00:00",
    }: {
      type: EventProgramPhaseType;
      sortOrder: number;
      startsAtLocal?: string;
    }) => {
      const { data, error } = await supabase
        .from("event_program_sections" as any)
        .insert({
          event_id: festivalId ? null : eventId,
          festival_id: festivalId || null,
          type,
          sort_order: sortOrder,
          starts_at_local: startsAtLocal,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EventProgramSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteSection = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from("event_program_sections" as any)
        .delete()
        .eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const renameSection = useMutation({
    mutationFn: async ({ sectionId, displayName }: { sectionId: string; displayName: string }) => {
      const { error } = await supabase
        .from("event_program_sections" as any)
        .update({ display_name: displayName || null } as any)
        .eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /** Get existing phase types to prevent duplicates (UNIQUE constraint) */
  const existingTypes = new Set(sections.map((s) => s.type));

  return {
    sections,
    isLoading,
    createSection,
    deleteSection,
    renameSection,
    existingTypes,
    queryKey,
  };
}
