import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LANDING_CONTENT_ID = 1;

export type LandingPageContent = {
  id: number;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_cta_text: string | null;
  hero_video_url: string | null;
  proof_enabled: boolean;
  proof_show_attendees: boolean;
  section_case_enabled: boolean;
  section_case_title: string | null;
  section_case_subtitle: string | null;
  updated_at: string;
};

export function useLandingPageContent() {
  return useQuery({
    queryKey: ["landing-page-content", LANDING_CONTENT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_page_content" as any)
        .select("*")
        .eq("id", LANDING_CONTENT_ID)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown as LandingPageContent | null) ?? null;
    },
  });
}
