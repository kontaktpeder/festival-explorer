import { useMemo } from "react";
import { format } from "date-fns";
import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import { cn } from "@/lib/utils";

const PX_PER_MIN = 4;
const MIN_BLOCK_PX = 48;
const DURATION_FLOOR_MIN = 15;

interface RunSheetPlanBlockProps {
  slots: ExtendedEventProgramSlot[];
  sectionPrefix?: string;
  startIndex: number;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  /** Anchor date ISO for this section (event start_at + section starts_at_local) */
  sectionAnchorIso?: string | null;
}

function calcDuration(slot: ExtendedEventProgramSlot): number {
  if (slot.duration_minutes && slot.duration_minutes > 0) return slot.duration_minutes;
  if (slot.ends_at) {
    const diff = Math.round(
      (new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60000
    );
    return diff > 0 ? diff : DURATION_FLOOR_MIN;
  }
  return DURATION_FLOOR_MIN;
}

function blockHeight(durationMin: number): number {
  return Math.max(durationMin * PX_PER_MIN, MIN_BLOCK_PX);
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

/** Generate quarter-hour markers between start and end */
function quarterMarkers(startMin: number, totalMin: number): { offsetMin: number; label: string }[] {
  const markers: { offsetMin: number; label: string }[] = [];
  // First quarter boundary after start
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

export function RunSheetPlanBlock({
  slots,
  sectionPrefix,
  startIndex,
  onEdit,
  sectionAnchorIso,
}: RunSheetPlanBlockProps) {
  const blocks = useMemo(() => {
    if (!slots.length) return { items: [], totalPx: 0, markers: [], startMinOfDay: 0 };

    const sorted = [...slots].sort((a, b) => {
      const sa = a.sequence_number ?? Infinity;
      const sb = b.sequence_number ?? Infinity;
      if (sa !== sb) return sa - sb;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });

    const firstStart = new Date(sorted[0].starts_at);
    const startMinOfDay = firstStart.getHours() * 60 + firstStart.getMinutes();
    let cursor = 0; // cumulative px offset

    const items: {
      slot: ExtendedEventProgramSlot;
      visualIndex: number;
      topPx: number;
      heightPx: number;
      durationMin: number;
      gapPx: number;
    }[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const slot = sorted[i];
      const dur = calcDuration(slot);
      const hPx = blockHeight(dur);

      // Gap: minutes between end of previous and start of this
      let gapPx = 0;
      if (i > 0) {
        const prevSlot = sorted[i - 1];
        const prevEnd = prevSlot.ends_at
          ? new Date(prevSlot.ends_at).getTime()
          : new Date(prevSlot.starts_at).getTime() + calcDuration(prevSlot) * 60000;
        const thisStart = new Date(slot.starts_at).getTime();
        const gapMin = Math.max(0, Math.round((thisStart - prevEnd) / 60000));
        if (gapMin > 0) {
          gapPx = Math.max(gapMin * PX_PER_MIN, 8); // min 8px for visible gap
        }
      }

      cursor += gapPx;
      items.push({
        slot,
        visualIndex: startIndex + i,
        topPx: cursor,
        heightPx: hPx,
        durationMin: dur,
        gapPx,
      });
      cursor += hPx;
    }

    // Total minutes covered for marker generation
    const lastItem = items[items.length - 1];
    const totalMinCovered = lastItem
      ? Math.ceil((lastItem.topPx + lastItem.heightPx) / PX_PER_MIN)
      : 0;

    const markers = quarterMarkers(startMinOfDay, totalMinCovered);

    return { items, totalPx: cursor, markers, startMinOfDay };
  }, [slots, startIndex]);

  if (!blocks.items.length) return null;

  return (
    <div
      className="relative mt-2 print:hidden"
      style={{ height: blocks.totalPx }}
    >
      {/* Quarter-hour markers */}
      {blocks.markers.map((m, i) => {
        const yPx = m.offsetMin * PX_PER_MIN;
        if (yPx < 0 || yPx > blocks.totalPx) return null;
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
      {blocks.items.map((item) => {
        const label = sectionPrefix
          ? `${sectionPrefix}${item.visualIndex + 1}`
          : `${item.visualIndex + 1}`;
        const title = item.slot.title_override || item.slot.slot_kind;
        const showDuration = item.heightPx >= 64;

        return (
          <button
            key={item.slot.id}
            type="button"
            className={cn(
              "absolute left-10 right-0 rounded-md border border-border/30 bg-card px-3 py-1.5 text-left transition-colors",
              "hover:border-accent/40 hover:bg-accent/5 active:bg-accent/10",
              "flex flex-col justify-between overflow-hidden"
            )}
            style={{
              top: item.topPx,
              height: item.heightPx,
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
            </div>
            {showDuration && (
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
                  {fmtTime(item.slot.starts_at)}
                  {item.slot.ends_at && `–${fmtTime(item.slot.ends_at)}`}
                </span>
                <span className="text-[10px] text-muted-foreground/40">
                  {fmtDurationLabel(item.durationMin)}
                </span>
              </div>
            )}
          </button>
        );
      })}

      {/* Gap indicators */}
      {blocks.items
        .filter((item) => item.gapPx > 16)
        .map((item) => (
          <div
            key={`gap-${item.slot.id}`}
            className="absolute left-10 right-0 flex items-center justify-center pointer-events-none"
            style={{
              top: item.topPx - item.gapPx,
              height: item.gapPx,
            }}
          >
            <div className="h-px w-8 bg-border/20" />
          </div>
        ))}
    </div>
  );
}
