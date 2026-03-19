import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreditScope = "landing" | "festival_case";

export type PublicCredit = {
  id: string;
  scope: CreditScope;
  festival_id: string | null;
  participant_kind: "persona" | "entity" | "venue";
  participant_id: string;
  role_label: string;
  sort_order: number;
};

export function usePublicPageCredits(scope: CreditScope, festivalId?: string) {
  return useQuery({
    queryKey: ["public-page-credits", scope, festivalId || null],
    enabled: scope === "landing" || !!festivalId,
    queryFn: async () => {
      let query = supabase
        .from("public_page_credits" as any)
        .select("*")
        .eq("scope", scope)
        .order("sort_order", { ascending: true });

      if (scope === "landing") {
        query = query.is("festival_id", null);
      } else {
        query = query.eq("festival_id", festivalId!);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as PublicCredit[];
    },
  });
}
