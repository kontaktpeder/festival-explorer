import type { LiveRolePreset } from "@/types/live-role";

export interface LivePermissions {
  /** Can see the live view at all */
  canView: boolean;
  /** Can trigger Start / Complete / Delay / Cancel */
  canOperate: boolean;
  /** Can edit slot metadata (title, time, performer) */
  canEdit: boolean;
  /** Full admin: can change permissions, delete slots */
  canAdmin: boolean;
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
  viewer: { canView: true, canOperate: false, canEdit: false, canAdmin: false },
  crew: { canView: true, canOperate: true, canEdit: false, canAdmin: false },
  editor: { canView: true, canOperate: true, canEdit: true, canAdmin: false },
  admin: { canView: true, canOperate: true, canEdit: true, canAdmin: true },
};

/** Turn a preset into a concrete permission object */
export function getLivePermissions(role: LiveRolePreset): LivePermissions {
  return PRESET_MAP[role];
}
