import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreditCandidate = {
  kind: "persona" | "entity" | "venue";
  id: string;
  name: string;
  slug: string | null;
  entityType?: string | null;
};

export function useCreditsSearch(query: string) {
  const q = query.trim();

  return useQuery({
    queryKey: ["credits-search", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const [personasRes, entitiesRes, venuesRes] = await Promise.all([
        supabase
          .from("personas")
          .select("id, name, slug")
          .eq("is_public", true)
          .ilike("name", `%${q}%`)
          .limit(8),
        supabase
          .from("entities")
          .select("id, name, slug, type")
          .eq("is_published", true)
          .ilike("name", `%${q}%`)
          .limit(8),
        supabase
          .from("venues")
          .select("id, name, slug")
          .eq("is_published", true)
          .ilike("name", `%${q}%`)
          .limit(8),
      ]);

      if (personasRes.error) throw personasRes.error;
      if (entitiesRes.error) throw entitiesRes.error;
      if (venuesRes.error) throw venuesRes.error;

      const personas: CreditCandidate[] = (personasRes.data || []).map((p) => ({
        kind: "persona" as const,
        id: p.id,
        name: p.name,
        slug: p.slug,
      }));

      const entities: CreditCandidate[] = (entitiesRes.data || []).map((e) => ({
        kind: "entity" as const,
        id: e.id,
        name: e.name,
        slug: e.slug,
        entityType: e.type,
      }));

      const venues: CreditCandidate[] = (venuesRes.data || []).map((v) => ({
        kind: "venue" as const,
        id: v.id,
        name: v.name,
        slug: v.slug,
      }));

      return [...personas, ...entities, ...venues];
    },
  });
}
