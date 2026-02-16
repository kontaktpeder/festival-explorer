import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PersonaOption = {
  id: string;
  user_id?: string;
  name: string;
  slug?: string | null;
  avatar_url?: string | null;
  category_tags?: string[] | null;
  is_public?: boolean;
};

type PersonaSearchMode = "public" | "all";

interface UsePersonaSearchOptions {
  query: string;
  mode: PersonaSearchMode;
  excludeUserIds?: string[];
  enabled?: boolean;
}

export function usePersonaSearch({
  query,
  mode,
  excludeUserIds = [],
  enabled = true,
}: UsePersonaSearchOptions) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ["persona-search", mode, trimmed, excludeUserIds],
    queryFn: async () => {
      if (mode === "public") {
        const { data, error } = await supabase.rpc("search_public_personas", {
          p_query: trimmed || "",
          p_exclude_user_ids: excludeUserIds,
        });
        if (error) throw error;
        return (data || []) as PersonaOption[];
      }

      // mode === "all"
      if (trimmed.length < 2) return [];
      const { data, error } = await supabase
        .from("personas")
        .select("id, user_id, name, slug, avatar_url, category_tags, is_public")
        .ilike("name", `%${trimmed}%`)
        .limit(20);
      if (error) throw error;
      return (data || []) as PersonaOption[];
    },
    enabled: enabled && (mode === "all" ? trimmed.length >= 2 : true),
  });
}
