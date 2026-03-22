import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["event_issue"]["Row"];

export function useMyOpenIssues(params: {
  festivalId: string | null;
  eventId: string | null;
}) {
  return useQuery({
    queryKey: ["my-open-event-issues", params.festivalId, params.eventId],
    enabled: !!(params.festivalId || params.eventId),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [] as Row[];

      let q = supabase
        .from("event_issue")
        .select("*")
        .eq("status", "open")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false });

      if (params.festivalId) q = q.eq("festival_id", params.festivalId);
      if (params.eventId) q = q.eq("event_id", params.eventId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}
