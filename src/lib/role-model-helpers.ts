/**
 * NEW ROLE MODEL STEP 1: Helper functions for backward compatibility
 * 
 * These helpers bridge the gap between the old model (venue/solo/band)
 * and the new model (host/project entity_kind + persona.type).
 */

import type { EntityKind } from "@/types/database";

// ============================================
// Entity Kind Helpers
// ============================================

/** 
 * Infer entity_kind from an entity. 
 * Falls back to type-based inference when entity_kind is null (pre-migration data).
 */
export function inferEntityKind(entity: { entity_kind?: string | null; type?: string }): EntityKind {
  if (entity.entity_kind === 'host' || entity.entity_kind === 'project') {
    return entity.entity_kind;
  }
  // Fallback: venues are hosts, everything else is a project
  return entity.type === 'venue' ? 'host' : 'project';
}

/** Check if an entity is a host (venue/organizer) */
export function isHostEntity(entity: { entity_kind?: string | null; type?: string }): boolean {
  return inferEntityKind(entity) === 'host';
}

/** Check if an entity is a project (band/solo) */
export function isProjectEntity(entity: { entity_kind?: string | null; type?: string }): boolean {
  return inferEntityKind(entity) === 'project';
}

// ============================================
// Event Host Helpers
// ============================================

/** 
 * Get the host entity ID for an event.
 * NEW ROLE MODEL: uses host_entity_id, falls back to venue_id for backward compat.
 */
export function getEventHostId(event: { host_entity_id?: string | null; venue_id?: string | null }): string | null {
  return event.host_entity_id ?? event.venue_id ?? null;
}

// ============================================
// Persona Type Helpers
// ============================================

/** Persona types that belong "on stage" */
const ON_STAGE_TYPES = new Set(['musician', 'dj']);

/** Persona types that belong "backstage" */
const BACKSTAGE_TYPES = new Set(['photographer', 'video', 'technician', 'volunteer']);

/** Persona types that belong in "host/organizer" zone */
const HOST_TYPES = new Set(['organizer', 'manager']);

/** Check if a persona type is an on-stage performer */
export function isOnStageType(type?: string | null): boolean {
  return !type || ON_STAGE_TYPES.has(type);
}

/** Check if a persona type is a backstage crew member */
export function isBackstageType(type?: string | null): boolean {
  return !type || BACKSTAGE_TYPES.has(type);
}

/** Check if a persona type is a host/organizer */
export function isHostType(type?: string | null): boolean {
  return !!type && HOST_TYPES.has(type);
}

/** Check if a persona type is audience */
export function isAudienceType(type?: string | null): boolean {
  return !type || type === 'audience';
}
