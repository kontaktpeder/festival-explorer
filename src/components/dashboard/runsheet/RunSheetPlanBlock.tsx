import { useMemo } from "react";
import { format } from "date-fns";
import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import { resolveDuration } from "@/lib/runsheet-plan-time";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const PX_PER_MIN = 4;
const MIN_BLOCK_PX = 48;

interface RunSheetPlanBlockProps {
  slots: ExtendedEventProgramSlot[];
  sectionPrefix?: string;
  startIndex: number;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  /** Anchor date ISO for this section (event start_at + section starts_at_local) */
  sectionAnchorIso?: string | null;
}

function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

function fmtDurationLabel(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}t ${m}m` : `${h}t`;
}

/** Check if a slot uses fallback duration (no explicit duration_minutes or valid ends_at) */
function usesFallbackDuration(slot: ExtendedEventProgramSlot): boolean {
  if (slot.duration_minutes && slot.duration_minutes > 0) return false;
  if (slot.ends_at) {
    const diff = Math.round(
      (new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60000
    );
    if (diff > 0) return false;
  }
  return true;
}

/** Generate quarter-hour markers between start and end */
function quarterMarkers(startMin: number, totalMin: number): { offsetMin: number; label: string }[] {
  const markers: { offsetMin: number; label: string }[] = [];
  const firstQ = Math.ceil(startMin / 15) * 15;
  for (let m = firstQ; m <= startMin + totalMin; m += 15) {
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    markers.push({
      offsetMin: m - startMin,
      label: `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    });
  }
  return markers;
}

/** Get unique stage labels for column layout */
function getColumnKeys(slots: ExtendedEventProgramSlot[]): string[] {
  const labels = new Set<string>();
  for (const s of slots) {
    labels.add(s.stage_label?.trim() || "");
  }
  const sorted = [...labels].filter((k) => k !== "").sort((a, b) => a.localeCompare(b, "nb"));
  if (labels.has("")) sorted.push(""); // "No stage" last
  return sorted;
}

type BlockItem = {
  slot: ExtendedEventProgramSlot;
  visualIndex: number;
  topPx: number;
  heightPx: number;
  durationMin: number;
  isFallback: boolean;
  columnKey: string;
  chainStartIso: string;
};

export function RunSheetPlanBlock({
  slots,
  sectionPrefix,
  startIndex,
  onEdit,
  sectionAnchorIso,
}: RunSheetPlanBlockProps) {
  const computed = useMemo(() => {
    if (!slots.length) return { items: [], totalPx: 0, markers: [], startMinOfDay: 0, columns: [""] };

    const sorted = [...slots].sort((a, b) => {
      const sa = a.sequence_number ?? Infinity;
      const sb = b.sequence_number ?? Infinity;
      if (sa !== sb) return sa - sb;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });

    // Use section anchor for chain-based positioning
    const anchorMs = sectionAnchorIso
      ? new Date(sectionAnchorIso).getTime()
      : new Date(sorted[0].starts_at).getTime();

    const anchorDate = new Date(anchorMs);
    const startMinOfDay = anchorDate.getHours() * 60 + anchorDate.getMinutes();

    // Compute chain times
    let chainMs = anchorMs;
    const items: BlockItem[] = [];
    const columns = getColumnKeys(sorted);

    for (let i = 0; i < sorted.length; i++) {
      const slot = sorted[i];
      const dur = resolveDuration(slot, 15);
      const isFallback = usesFallbackDuration(slot);
      const heightPx = Math.max(dur * PX_PER_MIN, MIN_BLOCK_PX);

      const offsetMin = (chainMs - anchorMs) / 60000;
      const topPx = Math.round(offsetMin * PX_PER_MIN);
      const chainStartIso = new Date(chainMs).toISOString();

      items.push({
        slot,
        visualIndex: startIndex + i,
        topPx,
        heightPx,
        durationMin: dur,
        isFallback,
        columnKey: slot.stage_label?.trim() || "",
        chainStartIso,
      });

      chainMs += dur * 60000;
    }

    const totalPx = items.length
      ? items[items.length - 1].topPx + items[items.length - 1].heightPx
      : 0;

    const totalMinCovered = Math.ceil(totalPx / PX_PER_MIN);
    const markers = quarterMarkers(startMinOfDay, totalMinCovered);

    return { items, totalPx, markers, startMinOfDay, columns };
  }, [slots, startIndex, sectionAnchorIso]);

  if (!computed.items.length) return null;

  const multiColumn = computed.columns.length > 1;
  const colCount = computed.columns.length;

  return (
    <div className="relative mt-2 print:hidden">
      {/* Column headers */}
      {multiColumn && (
        <div className="flex items-center gap-0 ml-10 mb-1">
          {computed.columns.map((col) => (
            <div
              key={col || "__none__"}
              className="flex-1 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40"
            >
              {col || "Ingen scene"}
            </div>
          ))}
        </div>
      )}

      <div className="relative" style={{ height: computed.totalPx }}>
        {/* Quarter-hour markers */}
        {computed.markers.map((m, i) => {
          const yPx = m.offsetMin * PX_PER_MIN;
          if (yPx < 0 || yPx > computed.totalPx) return null;
          return (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-center pointer-events-none"
              style={{ top: yPx }}
            >
              <span className="text-[9px] text-muted-foreground/30 font-mono tabular-nums w-10 text-right pr-1.5 shrink-0">
                {m.label}
              </span>
              <div className="flex-1 border-t border-border/10" />
            </div>
          );
        })}

        {/* Blocks */}
        {computed.items.map((item) => {
          const label = sectionPrefix
            ? `${sectionPrefix}${item.visualIndex + 1}`
            : `${item.visualIndex + 1}`;
          const title = item.slot.title_override || item.slot.slot_kind;
          const showDuration = item.heightPx >= 64;
          const colIndex = computed.columns.indexOf(item.columnKey);

          // Calculate left/right based on column
          const colWidthPct = 100 / colCount;
          const leftPct = multiColumn ? colIndex * colWidthPct : 0;
          const widthPct = multiColumn ? colWidthPct - 1 : 100; // 1% gap

          return (
            <button
              key={item.slot.id}
              type="button"
              className={cn(
                "absolute rounded-md border border-border/30 bg-card px-3 py-1.5 text-left transition-colors",
                "hover:border-accent/40 hover:bg-accent/5 active:bg-accent/10",
                "flex flex-col justify-between overflow-hidden",
                item.isFallback && "border-amber-500/30"
              )}
              style={{
                top: item.topPx,
                height: item.heightPx,
                left: multiColumn ? `calc(40px + ${leftPct}%)` : 40,
                width: multiColumn ? `calc(${widthPct}% - 40px / ${colCount})` : "calc(100% - 40px)",
              }}
              onClick={() => onEdit(item.slot)}
            >
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[10px] font-bold text-muted-foreground/50 shrink-0">
                  {label}
                </span>
                <span className="text-sm font-medium text-foreground truncate">
                  {title}
                </span>
                {item.isFallback && (
                  <AlertTriangle className="h-3 w-3 text-amber-500/60 shrink-0" />
                )}
              </div>
              {showDuration && (
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
                    {fmtTime(item.chainStartIso)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">
                    {fmtDurationLabel(item.durationMin)}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
