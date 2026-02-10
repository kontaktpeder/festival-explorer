import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TimelineSource, UnifiedTimelineEvent } from "@/types/timeline";
import { sortTimelineEventsChronological } from "@/lib/timeline-sort";

type VisibilityMode = "public" | "all";

/**
 * Unified hook for fetching timeline events from any source (project, entity, persona).
 */
export function useUnifiedTimelineEvents(
  source: TimelineSource | undefined,
  options?: { visibility?: VisibilityMode }
) {
  const visibility = options?.visibility ?? "public";

  return useQuery({
    queryKey: ["unified-timeline", source?.type, source?.id, visibility],
    queryFn: async (): Promise<UnifiedTimelineEvent[]> => {
      if (!source?.id) return [];

      const fetchFromTable = async (
        table: string,
        column: string
      ) => {
        let query = supabase
          .from(table as any)
          .select("*")
          .eq(column, source.id);

        if (visibility === "public") {
          query = query.eq("visibility", "public");
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      };

      const tableMap: Record<string, { table: string; column: string }> = {
        project: { table: "project_timeline_events", column: "project_id" },
        entity: { table: "entity_timeline_events", column: "entity_id" },
        persona: { table: "persona_timeline_events", column: "persona_id" },
      };

      const { table, column } = tableMap[source.type];
      const data = await fetchFromTable(table, column);

      const mapped: UnifiedTimelineEvent[] = (data as any[]).map((row) => ({
        id: row.id,
        title: row.title,
        event_type: row.event_type,
        visibility: row.visibility,
        date: row.date ?? null,
        date_to: row.date_to ?? null,
        year: row.year ?? null,
        year_to: row.year_to ?? null,
        location_name: row.location_name ?? null,
        city: row.city ?? null,
        country: row.country ?? null,
        description: row.description ?? null,
        media: row.media as UnifiedTimelineEvent["media"],
        created_at: row.created_at,
        updated_at: row.updated_at,
        project_id: row.project_id,
        entity_id: row.entity_id,
        persona_id: row.persona_id,
      }));

      return sortTimelineEventsChronological(mapped);
    },
    enabled: !!source?.id,
  });
}

// ============================================
// Unified mutations – delegates to the correct table
// ============================================

export function useCreateUnifiedTimelineEvent(source: TimelineSource | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<UnifiedTimelineEvent, "id" | "created_at" | "updated_at">) => {
      if (!source) throw new Error("No source");

      const { project_id, entity_id, persona_id, ...rest } = event;
      const fkMap: Record<string, Record<string, string>> = {
        project: { project_id: source.id },
        entity: { entity_id: source.id },
        persona: { persona_id: source.id },
      };
      const payload = { ...rest, ...fkMap[source.type] };

      const table = source.type === "project"
        ? "project_timeline_events"
        : source.type === "entity"
        ? "entity_timeline_events"
        : "persona_timeline_events";

      const { data, error } = await supabase
        .from(table as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-timeline"] });
      // Also invalidate legacy keys for backwards compat
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["persona-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-entity-timeline-events"] });
    },
  });
}

export function useUpdateUnifiedTimelineEvent(source: TimelineSource | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UnifiedTimelineEvent> & { id: string }) => {
      if (!source) throw new Error("No source");

      const { project_id, entity_id, persona_id, ...rest } = updates;

      const table = source.type === "project"
        ? "project_timeline_events"
        : source.type === "entity"
        ? "entity_timeline_events"
        : "persona_timeline_events";

      const { data, error } = await supabase
        .from(table as any)
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["persona-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-entity-timeline-events"] });
    },
  });
}

export function useDeleteUnifiedTimelineEvent(source: TimelineSource | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!source) throw new Error("No source");

      const table = source.type === "project"
        ? "project_timeline_events"
        : source.type === "entity"
        ? "entity_timeline_events"
        : "persona_timeline_events";

      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["entity-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["persona-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-entity-timeline-events"] });
    },
  });
}
