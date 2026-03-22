import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type EventIssueRow = Database["public"]["Tables"]["event_issue"]["Row"];

export function useOpenEventIssues(params: {
  festivalId: string | null;
  eventId: string | null;
}) {
  const { festivalId, eventId } = params;
  return useQuery({
    queryKey: ["open-event-issues", festivalId, eventId],
    enabled: !!festivalId || !!eventId,
    queryFn: async () => {
      let q = supabase
        .from("event_issue")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (festivalId) q = q.eq("festival_id", festivalId);
      if (eventId) q = q.eq("event_id", eventId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EventIssueRow[];
    },
  });
}
