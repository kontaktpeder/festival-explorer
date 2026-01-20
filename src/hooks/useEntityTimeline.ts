import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntityTimelineEvent, TimelineVisibility } from "@/types/database";

/**
 * Public timeline events (only visibility='public')
 */
export function usePublicEntityTimelineEvents(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity-timeline-events", entityId, "public"],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from("entity_timeline_events")
        .select("*")
        .eq("entity_id", entityId)
        .eq("visibility", "public")
        .order("date", { ascending: true, nullsFirst: false })
        .order("year", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as EntityTimelineEvent[];
    },
    enabled: !!entityId,
  });
}

/**
 * Admin timeline events (all, with optional visibility filter)
 */
export function useAdminEntityTimelineEvents(visibilityFilter?: TimelineVisibility | null) {
  return useQuery({
    queryKey: ["admin-entity-timeline-events", visibilityFilter],
    queryFn: async () => {
      let query = supabase
        .from("entity_timeline_events")
        .select(`
          *,
          entity:entities(id, name, slug, type)
        `)
        .order("created_at", { ascending: false });

      if (visibilityFilter) {
        query = query.eq("visibility", visibilityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EntityTimelineEvent[];
    },
  });
}

/**
 * Single timeline event for editing
 */
export function useEntityTimelineEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["entity-timeline-event", id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      
      const { data, error } = await supabase
        .from("entity_timeline_events")
        .select(`
          *,
          entity:entities(id, name, slug, type)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as EntityTimelineEvent;
    },
    enabled: !!id && id !== "new",
  });
}

/**
 * Timeline events for a specific entity (for entity dashboard)
 */
export function useEntityTimelineEventsForEntity(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity-timeline-events", entityId, "all"],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from("entity_timeline_events")
        .select("*")
        .eq("entity_id", entityId)
        .order("date", { ascending: false, nullsFirst: false })
        .order("year", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as EntityTimelineEvent[];
    },
    enabled: !!entityId,
  });
}

// ============================================
// Mutations
// ============================================

export function useCreateEntityTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: Omit<EntityTimelineEvent, "id" | "created_at" | "updated_at" | "entity">) => {
      const { data, error } = await supabase
        .from("entity_timeline_events")
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entity-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-events"] });
    },
  });
}

export function useUpdateEntityTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EntityTimelineEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from("entity_timeline_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entity-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-event"] });
    },
  });
}

export function useDeleteEntityTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("entity_timeline_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entity-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-events"] });
    },
  });
}
