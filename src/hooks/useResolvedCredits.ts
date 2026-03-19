import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublicCredit } from "./usePublicPageCredits";

export type ResolvedCredit = {
  role_label: string;
  persona?: { name: string; slug?: string; avatar_url?: string | null; type?: string | null } | null;
  entity?: { name: string; slug?: string | null; type?: string | null; hero_image_url?: string | null } | null;
};

/**
 * Resolves PublicCredit rows into full objects with name/slug for display.
 */
export function useResolvedCredits(credits: PublicCredit[]) {
  const personaIds = credits.filter((c) => c.participant_kind === "persona").map((c) => c.participant_id);
  const entityIds = credits.filter((c) => c.participant_kind === "entity").map((c) => c.participant_id);
  const venueIds = credits.filter((c) => c.participant_kind === "venue").map((c) => c.participant_id);

  return useQuery({
    queryKey: ["resolved-credits", personaIds, entityIds, venueIds],
    enabled: credits.length > 0,
    queryFn: async () => {
      const [pRes, eRes, vRes] = await Promise.all([
        personaIds.length
          ? supabase.from("personas").select("id, name, slug, avatar_url, type").in("id", personaIds)
          : { data: [], error: null },
        entityIds.length
          ? supabase.from("entities").select("id, name, slug, type, hero_image_url").in("id", entityIds)
          : { data: [], error: null },
        venueIds.length
          ? supabase.from("venues").select("id, name, slug, hero_image_url").in("id", venueIds)
          : { data: [], error: null },
      ]);

      const personaMap = new Map((pRes.data || []).map((p: any) => [p.id, p]));
      const entityMap = new Map((eRes.data || []).map((e: any) => [e.id, e]));
      const venueMap = new Map((vRes.data || []).map((v: any) => [v.id, v]));

      return credits.map((c): ResolvedCredit => {
        if (c.participant_kind === "persona") {
          const p = personaMap.get(c.participant_id);
          return {
            role_label: c.role_label,
            persona: p ? { name: p.name, slug: p.slug, avatar_url: p.avatar_url, type: p.type } : null,
          };
        }
        if (c.participant_kind === "entity") {
          const e = entityMap.get(c.participant_id);
          return {
            role_label: c.role_label,
            entity: e ? { name: e.name, slug: e.slug, type: e.type, hero_image_url: e.hero_image_url } : null,
          };
        }
        // venue
        const v = venueMap.get(c.participant_id);
        return {
          role_label: c.role_label,
          entity: v ? { name: v.name, slug: v.slug, type: "venue", hero_image_url: v.hero_image_url } : null,
        };
      });
    },
  });
}
