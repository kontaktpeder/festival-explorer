import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_FIRST_ACCESS } from "@/lib/featureFlags";

interface EventFirstAccess {
  isLoading: boolean;
  canAccess: boolean;
  reason?: "disabled" | "not_admin" | "not_authenticated";
}

/**
 * Centralised gate for Event-first features.
 * Phase 2 (MVP): all authenticated dashboard users can access.
 */
export function useEventFirstAccess(): EventFirstAccess {
  const { data: sessionInfo, isLoading } = useQuery({
    queryKey: ["event-first-access-session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { user: null, isAdmin: false } as { user: null; isAdmin: false };
      const { data } = await supabase.rpc("is_admin");
      return { user, isAdmin: !!data };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (EVENT_FIRST_ACCESS === "disabled") {
    return { isLoading: false, canAccess: false, reason: "disabled" };
  }

  if (isLoading) {
    return { isLoading: true, canAccess: false };
  }

  if (!sessionInfo?.user) {
    return { isLoading: false, canAccess: false, reason: "not_authenticated" };
  }

  // MVP: alle innloggede brukere med dashboard-tilgang kan bruke event-først-flyt
  if (EVENT_FIRST_ACCESS === "all_dashboard_users") {
    return { isLoading: false, canAccess: true };
  }

  // admin_only
  if (!sessionInfo.isAdmin) {
    return { isLoading: false, canAccess: false, reason: "not_admin" };
  }

  return { isLoading: false, canAccess: true };
}
