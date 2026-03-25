import type { LiveRolePreset } from "@/types/live-role";

export interface LivePermissions {
  canView: boolean;
  canSeeNotes: boolean;
  canEditNotes: boolean;
  canStartDelayComplete: boolean;
  canCancel: boolean;
  showAdminBadge: boolean;
}

/**
 * Derive a LiveRolePreset from the raw permission flags
 * coming from event_participants / festival_participants + RPC checks.
 * Used as FALLBACK when no explicit live_role is stored.
 */
export function deriveLiveRole(flags: {
  canViewRunsheet: boolean;
  canOperateRunsheet: boolean;
  canEdit: boolean;
  isAdmin: boolean;
}): LiveRolePreset {
  if (flags.isAdmin) return "admin";
  if (flags.canEdit) return "editor";
  if (flags.canOperateRunsheet) return "crew";
  if (flags.canViewRunsheet) return "viewer";
  return "viewer";
}

/**
 * Resolve role: explicit live_role from participant row takes priority,
 * then fallback to derived role from permission flags.
 */
export function resolveLiveRole(
  explicitRole: LiveRolePreset | null | undefined,
  fallbackFlags: {
    canViewRunsheet: boolean;
    canOperateRunsheet: boolean;
    canEdit: boolean;
    isAdmin: boolean;
  }
): LiveRolePreset {
  if (explicitRole) return explicitRole;
  return deriveLiveRole(fallbackFlags);
}

const PRESET_MAP: Record<LiveRolePreset, LivePermissions> = {
  viewer: {
    canView: true,
    canSeeNotes: false,
    canEditNotes: false,
    canStartDelayComplete: false,
    canCancel: false,
    showAdminBadge: false,
  },
  crew: {
    canView: true,
    canSeeNotes: true,
    canEditNotes: false,
    canStartDelayComplete: false,   // crew sees notes but cannot operate
    canCancel: false,
    showAdminBadge: false,
  },
  editor: {
    canView: true,
    canSeeNotes: true,
    canEditNotes: true,
    canStartDelayComplete: true,
    canCancel: false,
    showAdminBadge: false,
  },
  admin: {
    canView: true,
    canSeeNotes: true,
    canEditNotes: true,
    canStartDelayComplete: true,
    canCancel: true,
    showAdminBadge: true,
  },
};

/** Turn a preset into a concrete permission object */
export function getLivePermissions(role: LiveRolePreset): LivePermissions {
  return PRESET_MAP[role];
}

/** Hard-guard: throws if the role lacks permission for the given action */
export function assertLiveAction(
  role: LiveRolePreset,
  action: string
): void {
  const p = PRESET_MAP[role];
  if (action === "cancel" && !p.canCancel) {
    throw new Error("Ingen tilgang til å avlyse (krever admin).");
  }
  if (
    (action === "start" || action === "complete" || action === "delay5") &&
    !p.canStartDelayComplete
  ) {
    throw new Error("Ingen tilgang til å utføre denne handlingen (krever editor eller admin).");
  }
}
