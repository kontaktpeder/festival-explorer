import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LiveRolePreset } from "@/types/live-role";

/**
 * Resolves the current user's live_role from event_participants or festival_participants.
 * Checks persona-linked participation first, then entity-linked fallback.
 */
export function useLiveRoleFromParticipants(
  scope: "event" | "festival",
  scopeId: string | undefined
) {
  return useQuery<LiveRolePreset | null>({
    queryKey: ["live-role-participant", scope, scopeId],
    enabled: !!scopeId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return null;

      // 1 — get user's personas
      const { data: personas } = await supabase
        .from("personas")
        .select("id")
        .eq("user_id", userId);
      const personaIds = (personas ?? []).map((p: any) => p.id);

      let role: string | null = null;

      // 2 — persona-linked role (highest priority)
      if (scope === "event" && personaIds.length) {
        const { data: row } = await supabase
          .from("event_participants")
          .select("live_role")
          .eq("event_id", scopeId!)
          .eq("participant_kind", "persona")
          .in("participant_id", personaIds)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();
        role = (row as any)?.live_role ?? null;
      } else if (scope === "festival" && personaIds.length) {
        const { data: row } = await supabase
          .from("festival_participants")
          .select("live_role")
          .eq("festival_id", scopeId!)
          .eq("participant_kind", "persona")
          .in("participant_id", personaIds)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();
        role = (row as any)?.live_role ?? null;
      }

      // 3 — entity-linked fallback
      if (!role) {
        const { data: team } = await supabase
          .from("entity_team")
          .select("entity_id")
          .eq("user_id", userId)
          .is("left_at", null);
        const entityIds = (team ?? []).map((t: any) => t.entity_id);

        if (entityIds.length) {
          if (scope === "event") {
            const { data: row } = await supabase
              .from("event_participants")
              .select("live_role")
              .eq("event_id", scopeId!)
              .eq("participant_kind", "entity")
              .in("participant_id", entityIds)
              .order("sort_order", { ascending: true })
              .limit(1)
              .maybeSingle();
            role = (row as any)?.live_role ?? null;
          } else {
            const { data: row } = await supabase
              .from("festival_participants")
              .select("live_role")
              .eq("festival_id", scopeId!)
              .eq("participant_kind", "entity")
              .in("participant_id", entityIds)
              .order("sort_order", { ascending: true })
              .limit(1)
              .maybeSingle();
            role = (row as any)?.live_role ?? null;
          }
        }
      }

      return (role as LiveRolePreset) ?? null;
    },
  });
}
