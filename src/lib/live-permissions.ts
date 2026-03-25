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
    canStartDelayComplete: false,
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
