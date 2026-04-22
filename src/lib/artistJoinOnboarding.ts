/**
 * Artist/band first onboarding — backend orchestration.
 *
 * Creates: profile (via ensureProfile), entity (solo|band), compatibility persona,
 * and links persona to the entity team via RPC.
 *
 * UI must NOT use the words "persona", "entity", "backstage" or "request access".
 * The persona row is kept for compatibility with dashboard/RPC code.
 *
 * Supabase Dashboard requirements:
 *   - Auth → URL Configuration → Redirect URLs must include
 *     `<origin>/auth/callback` for every environment used.
 *   - To enable Google/Apple, turn the providers on under Auth → Providers.
 */
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/admin-helpers";
import { generateSlug } from "@/lib/utils";
import type { EntityType, Persona } from "@/types/database";

const PERSONA_STORAGE_EVENT = "personaChanged";

function emitPersonaChanged(personaId: string) {
  try {
    localStorage.setItem("selectedPersonaId", personaId);
    window.dispatchEvent(new Event(PERSONA_STORAGE_EVENT));
  } catch {
    /* ignore */
  }
}

async function uniqueSlugForTable(
  table: "entities" | "personas",
  baseRaw: string,
): Promise<string> {
  const base =
    generateSlug(baseRaw) || (table === "entities" ? "prosjekt" : "profil");
  let slug = base;
  let counter = 1;
  // Hard cap to prevent infinite loops in pathological cases.
  while (counter < 250) {
    const { data } = await supabase
      .from(table)
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
  // Fallback: append timestamp.
  return `${base}-${Date.now().toString(36)}`;
}

export type ArtistJoinKind = "solo" | "band";

export interface CompleteArtistJoinInput {
  kind: ArtistJoinKind;
  name: string;
  heroImageUrl: string | null;
  heroImageSettings?: unknown | null;
}

export interface CompleteArtistJoinResult {
  entityId: string;
  entitySlug: string;
  personaId: string;
}

export async function completeArtistJoin(
  input: CompleteArtistJoinInput,
): Promise<CompleteArtistJoinResult> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    throw new Error("Du må være innlogget for å fullføre.");
  }

  await ensureProfile(user.id);

  const entityType: EntityType = input.kind === "solo" ? "solo" : "band";
  const name = input.name.trim();
  if (!name) {
    throw new Error("Navn kan ikke være tomt.");
  }

  const entitySlug = await uniqueSlugForTable("entities", name);

  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .insert({
      type: entityType,
      name,
      slug: entitySlug,
      entity_kind: "project",
      hero_image_url: input.heroImageUrl || null,
      hero_image_settings: (input.heroImageSettings ?? null) as never,
      created_by: user.id,
      is_published: true,
    } as never)
    .select("id, slug")
    .single();

  if (entityError) throw entityError;
  if (!entity) throw new Error("Kunne ikke opprette prosjekt.");

  const entityRow = entity as { id: string; slug: string };

  const personaSlug = await uniqueSlugForTable("personas", name);

  const { data: persona, error: personaError } = await supabase
    .from("personas")
    .insert({
      user_id: user.id,
      name,
      slug: personaSlug,
      bio: null,
      avatar_url: input.heroImageUrl || null,
      avatar_image_settings: (input.heroImageSettings ?? null) as never,
      category_tags: [],
      is_public: true,
      allow_team_credit: true,
      type: "musician",
    } as never)
    .select()
    .single();

  if (personaError) throw personaError;
  if (!persona) throw new Error("Kunne ikke fullføre oppsett.");

  const personaRow = persona as Persona;

  const { error: rpcError } = await supabase.rpc("set_entity_team_persona", {
    p_entity_id: entityRow.id,
    p_persona_id: personaRow.id,
  });
  if (rpcError) {
    console.error("set_entity_team_persona", rpcError);
    throw new Error(
      rpcError.message || "Kunne ikke koble profilen din til prosjektet.",
    );
  }

  emitPersonaChanged(personaRow.id);

  return {
    entityId: entityRow.id,
    entitySlug: entityRow.slug,
    personaId: personaRow.id,
  };
}

/**
 * Returns the OAuth callback URL.
 *
 * OAuth providers (Google/Apple) require a clean origin + path, with NO
 * query string and NO trailing slash, otherwise they reject the redirect
 * with "Invalid Origin". For email-link signups (`emailRedirectTo`) the
 * same clean URL works fine — pass `next` via `queryParams` instead.
 */
export function getAuthCallbackUrl(): string {
  const fallbackOrigin = "https://giggen.org";

  if (typeof window === "undefined") {
    return `${fallbackOrigin}/auth/callback`;
  }

  const { origin, hostname } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const isLovablePreview =
    hostname.includes("lovable.app") || hostname.includes("lovableproject.com");

  const baseOrigin = isLocal ? origin : isLovablePreview ? fallbackOrigin : origin;
  return `${baseOrigin}/auth/callback`;
}