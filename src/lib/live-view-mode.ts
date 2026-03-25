import type { LiveRolePreset } from "@/types/live-role";

export function getLiveViewMode(role: LiveRolePreset) {
  const isViewer = role === "viewer";
  const isCrew = role === "crew";
  const isEditor = role === "editor";
  const isAdmin = role === "admin";

  return {
    isViewer,
    isCrew,
    isEditor,
    isAdmin,
    showMinimal: isViewer,
    showContext: isCrew || isEditor || isAdmin,
    showRichContext: isEditor || isAdmin,
    showNotes: isCrew || isEditor || isAdmin,
    showActions: isEditor || isAdmin,
    showCancel: isAdmin,
  };
}
