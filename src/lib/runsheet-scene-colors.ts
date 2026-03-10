/**
 * Scene color mapping for runsheet visual differentiation.
 * Returns consistent HSL-based color tokens for each stage/scene label.
 */

const SCENE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "1etg": {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  "2etg": {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  "kjeller": {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
  },
  "boiler room": {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
  "boiler": {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
};

// Fallback palette for unknown scenes
const FALLBACK_PALETTE = [
  { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500" },
  { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-500" },
  { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/30", dot: "bg-pink-500" },
  { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/30", dot: "bg-orange-500" },
];

const dynamicMap = new Map<string, number>();

export function getSceneColor(label: string | null | undefined) {
  if (!label) return null;
  const key = label.toLowerCase().trim();
  if (SCENE_COLORS[key]) return SCENE_COLORS[key];

  // Assign a consistent fallback color per unknown scene
  if (!dynamicMap.has(key)) {
    dynamicMap.set(key, dynamicMap.size % FALLBACK_PALETTE.length);
  }
  return FALLBACK_PALETTE[dynamicMap.get(key)!];
}

/** Check if a slot kind is a "critical" production marker */
export function isCriticalSlotKind(kind: string): boolean {
  return ["doors", "closing"].includes(kind);
}
