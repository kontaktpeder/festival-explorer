import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EventRunSheetDefault {
  id: string;
  event_id: string;
  starts_at: string;
  ends_at: string | null;
  duration_minutes: number | null;
  venue_id: string | null;
  scene_ids: string[];
  default_slot_type: string | null;
  created_at: string;
  updated_at: string;
}

export function useEventRunSheetDefault(eventId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["event-run-sheet-default", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("event_run_sheet_defaults" as any)
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as EventRunSheetDefault | null;
    },
    enabled: !!eventId,
  });

  const upsert = useMutation({
    mutationFn: async (payload: {
      event_id: string;
      starts_at: string;
      ends_at?: string | null;
      duration_minutes?: number | null;
      venue_id?: string | null;
      scene_ids?: string[];
      default_slot_type?: string | null;
    }) => {
      const { error } = await supabase
        .from("event_run_sheet_defaults" as any)
        .upsert(
          {
            event_id: payload.event_id,
            starts_at: payload.starts_at,
            ends_at: payload.ends_at ?? null,
            duration_minutes: payload.duration_minutes ?? null,
            venue_id: payload.venue_id ?? null,
            scene_ids: payload.scene_ids ?? [],
            default_slot_type: payload.default_slot_type ?? null,
          },
          { onConflict: "event_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-run-sheet-default", variables.event_id] });
    },
  });

  return { default: query.data ?? null, isLoading: query.isLoading, upsert };
}

/** Fetch venue scenes for use in scene dropdown */
export function useEventSceneOptions(venueId: string | null, sceneIds: string[] | null) {
  return useQuery({
    queryKey: ["event-scene-options", venueId, sceneIds],
    queryFn: async () => {
      // If we have specific scene_ids, fetch those
      if (sceneIds?.length) {
        const { data, error } = await supabase
          .from("venue_scenes" as any)
          .select("id, name")
          .in("id", sceneIds)
          .order("sort_order");
        if (error) throw error;
        return (data ?? []) as unknown as { id: string; name: string }[];
      }
      // Otherwise fetch all scenes for the venue
      if (venueId) {
        const { data, error } = await supabase
          .from("venue_scenes" as any)
          .select("id, name")
          .eq("venue_id", venueId)
          .order("sort_order");
        if (error) throw error;
        return (data ?? []) as unknown as { id: string; name: string }[];
      }
      return [];
    },
    enabled: !!venueId || (Array.isArray(sceneIds) && sceneIds.length > 0),
  });
}
