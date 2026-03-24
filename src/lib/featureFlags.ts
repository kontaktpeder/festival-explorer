/**
 * Feature flags for gradual rollout.
 *
 * eventFirstAccess:
 *   "admin_only"          – only platform admins (phase 1)
 *   "all_dashboard_users" – anyone with dashboard access (phase 2)
 *   "disabled"            – feature off
 *
 * To broaden rollout, change the value here – no route or component rewrites needed.
 */
export type EventFirstAccessLevel = "disabled" | "admin_only" | "all_dashboard_users";

export const EVENT_FIRST_ACCESS: EventFirstAccessLevel = "admin_only";

/**
 * rider_missing issue auto-sync.
 * Set to true once the asset_handles flow is fully QA'd and stable.
 */
export const RIDER_MISSING_ENABLED = false;
