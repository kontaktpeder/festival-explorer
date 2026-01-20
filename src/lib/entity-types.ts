import type { EntityTypeConfig } from "@/hooks/useEntityTypes";

/**
 * Get config for a specific entity type from the loaded types
 */
export function getEntityTypeConfig(
  type: string,
  types: EntityTypeConfig[]
): EntityTypeConfig | undefined {
  return types.find((t) => t.key === type);
}

/**
 * Get default fallback config when types haven't loaded yet
 */
export function getDefaultEntityTypeConfig(type: string): EntityTypeConfig {
  const defaults: Record<string, EntityTypeConfig> = {
    venue: {
      key: "venue",
      label_nb: "Spillested",
      icon_key: "building2",
      admin_route: "/admin/entities",
      public_route_base: "/venue",
      is_enabled: true,
      sort_order: 10,
      capabilities: { has_capacity: true, has_tech: true },
      created_at: "",
    },
    solo: {
      key: "solo",
      label_nb: "Soloartist",
      icon_key: "user",
      admin_route: "/admin/entities",
      public_route_base: "/project",
      is_enabled: true,
      sort_order: 20,
      capabilities: { has_tracks: true, has_rider: true },
      created_at: "",
    },
    band: {
      key: "band",
      label_nb: "Band",
      icon_key: "users",
      admin_route: "/admin/entities",
      public_route_base: "/project",
      is_enabled: true,
      sort_order: 30,
      capabilities: { has_tracks: true, has_rider: true },
      created_at: "",
    },
  };

  return defaults[type] || defaults.solo;
}

/**
 * Get the public route for an entity
 */
export function getEntityPublicRoute(
  type: string,
  slug: string,
  types?: EntityTypeConfig[]
): string {
  const config = types?.length
    ? getEntityTypeConfig(type, types)
    : getDefaultEntityTypeConfig(type);
  
  return `${config?.public_route_base || '/project'}/${slug}`;
}
