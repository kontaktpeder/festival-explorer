import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinancePayerOption {
  id: string;
  name: string;
}

export function useFinancePayers(festivalId?: string) {
  return useQuery({
    queryKey: ["finance-payers", festivalId],
    enabled: !!festivalId,
    queryFn: async () => {
      if (!festivalId) return [] as FinancePayerOption[];

      const { data: participants, error } = await supabase
        .from("festival_participants")
        .select("participant_kind, participant_id")
        .eq("festival_id", festivalId);

      if (error) throw error;

      const personaIds = Array.from(
        new Set(
          (participants || [])
            .filter((p) => p.participant_kind === "persona")
            .map((p) => p.participant_id)
        )
      );

      if (!personaIds.length) return [];

      const { data: personas, error: pError } = await supabase
        .from("personas")
        .select("id, name")
        .in("id", personaIds);

      if (pError) throw pError;

      return (personas || []).map((p) => ({
        id: p.id,
        name: p.name,
      }));
    },
  });
}
