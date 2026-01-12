import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Wrapper for Supabase queries med riktig error handling
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<{ data: T | null; error: PostgrestError | null }> {
  try {
    const result = await queryFn();
    
    if (result.error) {
      console.error("Supabase error:", result.error);
      
      // Håndter spesifikke error codes
      if (result.error.code === "PGRST116") {
        // Not found - ikke nødvendigvis en feil
        return { data: null, error: null };
      }
      
      if (result.error.code === "42501" || result.error.message?.includes("permission denied")) {
        // RLS policy error
        throw new Error("Ingen tilgang. Sjekk at du er innlogget og har riktige rettigheter.");
      }
    }
    
    return result;
  } catch (error) {
    console.error("Unexpected error in Supabase query:", error);
    throw error;
  }
}

/**
 * Sjekk om bruker er autentisert
 */
export async function ensureAuthenticated() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Du må være innlogget for å utføre denne handlingen.");
  }
  
  return user;
}
