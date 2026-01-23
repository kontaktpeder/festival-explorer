import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TimelineVisibility, TimelineEventType } from "@/types/database";

export interface PersonaTimelineEvent {
  id: string;
  persona_id: string;
  title: string;
  event_type: TimelineEventType;
  visibility: TimelineVisibility;
  date?: string | null;
  date_to?: string | null;
  year?: number | null;
  year_to?: number | null;
  location_name?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  media?: Array<{ type: "image" | "video"; url: string }> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Timeline events for a specific persona (for persona dashboard - all visibility levels)
 */
export function usePersonaTimelineEventsForPersona(personaId: string | undefined) {
  return useQuery({
    queryKey: ["persona-timeline-events", personaId, "all"],
    queryFn: async () => {
      if (!personaId) return [];
      
      const { data, error } = await supabase
        .from("persona_timeline_events")
        .select("*")
        .eq("persona_id", personaId)
        .order("date", { ascending: false, nullsFirst: false })
        .order("year", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as unknown as PersonaTimelineEvent[];
    },
    enabled: !!personaId,
  });
}

// Mutations
export function useCreatePersonaTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: Omit<PersonaTimelineEvent, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("persona_timeline_events")
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persona-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-events"] });
    },
  });
}

export function useUpdatePersonaTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PersonaTimelineEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from("persona_timeline_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persona-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-events"] });
    },
  });
}

export function useDeletePersonaTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("persona_timeline_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persona-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-events"] });
    },
  });
}
