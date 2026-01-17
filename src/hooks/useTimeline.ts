import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectTimelineEvent, TimelineVisibility } from "@/types/database";

// Public timeline (only visibility='public')
export function usePublicTimelineEvents(projectId: string | undefined) {
  return useQuery({
    queryKey: ["timeline-events", projectId, "public"],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("project_timeline_events")
        .select("*")
        .eq("project_id", projectId)
        .eq("visibility", "public")
        .order("date", { ascending: true, nullsFirst: false })
        .order("year", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as ProjectTimelineEvent[];
    },
    enabled: !!projectId,
  });
}

// Admin timeline (all, with optional visibility filter)
export function useAdminTimelineEvents(visibilityFilter?: TimelineVisibility | null) {
  return useQuery({
    queryKey: ["admin-timeline-events", visibilityFilter],
    queryFn: async () => {
      let query = supabase
        .from("project_timeline_events")
        .select(`
          *,
          project:projects(id, name, slug)
        `)
        .order("created_at", { ascending: false });

      if (visibilityFilter) {
        query = query.eq("visibility", visibilityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProjectTimelineEvent[];
    },
  });
}

// Single timeline event for editing
export function useTimelineEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["timeline-event", id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      
      const { data, error } = await supabase
        .from("project_timeline_events")
        .select(`
          *,
          project:projects(id, name, slug)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ProjectTimelineEvent;
    },
    enabled: !!id && id !== "new",
  });
}

// Admin mutations
export function useCreateTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: Omit<ProjectTimelineEvent, "id" | "created_at" | "updated_at" | "project">) => {
      const { data, error } = await supabase
        .from("project_timeline_events")
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
    },
  });
}

export function useUpdateTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectTimelineEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from("project_timeline_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["timeline-event"] });
    },
  });
}

export function useDeleteTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_timeline_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
    },
  });
}
