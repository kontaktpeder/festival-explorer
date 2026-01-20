import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlatformAccess } from "@/types/database";

/**
 * Check if current user has platform access
 */
export function useHasPlatformAccess() {
  return useQuery({
    queryKey: ["platform-access", "has-access"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("platform_access")
        .select("access_level")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });
}

/**
 * Get current user's platform access details
 */
export function usePlatformAccess() {
  return useQuery({
    queryKey: ["platform-access"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("platform_access")
        .select("*")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .maybeSingle();

      if (error) throw error;
      return data as PlatformAccess | null;
    },
  });
}

/**
 * Check platform access using RPC function (for use in components)
 */
export function useHasPlatformAccessRPC() {
  return useQuery({
    queryKey: ["platform-access", "rpc"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_platform_access");
      if (error) throw error;
      return data || false;
    },
  });
}

/**
 * Get platform access level using RPC function
 */
export function usePlatformAccessLevelRPC() {
  return useQuery({
    queryKey: ["platform-access", "level-rpc"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_access_level");
      if (error) throw error;
      return data;
    },
  });
}
