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
 * Phase 1: admin-only.  Change EVENT_FIRST_ACCESS to broaden.
 */
export function useEventFirstAccess(): EventFirstAccess {
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin-event-first"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (EVENT_FIRST_ACCESS === "disabled") {
    return { isLoading: false, canAccess: false, reason: "disabled" };
  }

  if (isLoading) {
    return { isLoading: true, canAccess: false };
  }

  if (isAdmin === null) {
    return { isLoading: false, canAccess: false, reason: "not_authenticated" };
  }

  if (EVENT_FIRST_ACCESS === "all_dashboard_users") {
    // TODO phase 2: check has_backstage_access or similar
    return { isLoading: false, canAccess: true };
  }

  // admin_only
  if (!isAdmin) {
    return { isLoading: false, canAccess: false, reason: "not_admin" };
  }

  return { isLoading: false, canAccess: true };
}
