import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FinanceAccessLevel = "none" | "reader" | "editor" | "admin";

export function useFinanceAccess(festivalId?: string) {
  return useQuery({
    queryKey: ["finance-access", festivalId],
    queryFn: async () => {
      if (!festivalId) return "none" as FinanceAccessLevel;
      const { data, error } = await supabase.rpc(
        "get_finance_access_for_festival" as any,
        { p_festival_id: festivalId }
      );
      if (error) throw error;
      return (data as FinanceAccessLevel) || "none";
    },
    enabled: !!festivalId,
  });
}
