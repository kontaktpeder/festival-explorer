import { supabase } from "@/integrations/supabase/client";

/**
 * Sjekk og opprett profil hvis den ikke eksisterer
 * Sikrer at grunnmuren (Person først) respekteres
 * Alle brukere må ha profil før de kan opprette data
 */
export async function ensureProfile(userId: string): Promise<void> {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!existingProfile) {
    const { error } = await supabase
      .from("profiles")
      .insert({ id: userId });
    
    if (error) {
      console.error("Error creating profile:", error);
      throw new Error(`Kunne ikke opprette profil: ${error.message}`);
    }
  }
}

/**
 * Hent autentisert bruker og sjekk/opprett profil automatisk
 * Gjenbrukbar helper for alle admin-operasjoner
 * 
 * @returns Autentisert bruker (med garantert profil)
 * @throws Error hvis ikke innlogget eller profil ikke kan opprettes
 */
export async function getAuthenticatedUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Du må være innlogget for å utføre denne handlingen.");
  }

  // Sjekk/opprett profil (sikrer grunnmuren: Person først)
  await ensureProfile(user.id);

  return user;
}
