import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntityTimelineEvent, TimelineVisibility } from "@/types/database";

// Unified timeline event type (works for both entities and personas)
export type TimelineEvent = {
  id: string;
  entity_id?: string | null;
  persona_id?: string | null;
  title: string;
  event_type: string;
  visibility: string;
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
};

/**
 * Public timeline events (only visibility='public')
 * Supports both entities and personas
 */
export function usePublicEntityTimelineEvents(
  entityId?: string | undefined,
  personaId?: string | undefined
) {
  return useQuery({
    queryKey: ["entity-timeline-events", entityId, personaId, "public"],
    queryFn: async () => {
      const events: TimelineEvent[] = [];

      // Fetch from entity_timeline_events if entityId is provided
      if (entityId) {
        const { data, error } = await supabase
          .from("entity_timeline_events")
          .select("*")
          .eq("entity_id", entityId)
          .eq("visibility", "public")
          .order("date", { ascending: true, nullsFirst: false })
          .order("year", { ascending: true, nullsFirst: false });

        if (error) throw error;
        if (data) {
          events.push(...(data as unknown as TimelineEvent[]));
        }
      }

      // Fetch from persona_timeline_events if personaId is provided
      if (personaId) {
        const { data, error } = await supabase
          .from("persona_timeline_events")
          .select("*")
          .eq("persona_id", personaId)
          .eq("visibility", "public")
          .order("date", { ascending: true, nullsFirst: false })
          .order("year", { ascending: true, nullsFirst: false });

        if (error) throw error;
        if (data) {
          events.push(...(data as unknown as TimelineEvent[]));
        }
      }

      // Sort combined results by date/year
      return events.sort((a, b) => {
        if (a.date && b.date) {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (a.year && b.year) {
          return a.year - b.year;
        }
        if (a.date) return -1;
        if (b.date) return 1;
        if (a.year) return -1;
        if (b.year) return 1;
        return 0;
      });
    },
    enabled: !!entityId || !!personaId,
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
      return (data || []) as unknown as EntityTimelineEvent[];
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
      return data as unknown as EntityTimelineEvent;
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
      return (data || []) as unknown as EntityTimelineEvent[];
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
