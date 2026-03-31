import { useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ExtendedEventProgramSlot } from "@/types/program-slots";
import { resolveDuration, snapTo5Min } from "@/lib/runsheet-plan-time";
import { cn } from "@/lib/utils";
import { AlertTriangle, GripVertical } from "lucide-react";

const PX_PER_MIN = 4;
const MIN_BLOCK_PX = 48;

interface RunSheetPlanBlockProps {
  slots: ExtendedEventProgramSlot[];
  sectionPrefix?: string;
  startIndex: number;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  /** Anchor date ISO for this section (event start_at + section starts_at_local) */
  sectionAnchorIso?: string | null;
  /** Called when a block is dragged to a new time position */
  onBlockMove?: (payload: {
    slotId: string;
    newStartsAtIso: string;
    newEndsAtIso: string | null;
    newStageLabel: string | null;
  }) => void;
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

function quarterMarkers(anchorMs: number, totalMin: number): { offsetMin: number; label: string }[] {
  const markers: { offsetMin: number; label: string }[] = [];
  // Start from 0 and generate markers every 15 minutes
  for (let m = 0; m <= totalMin; m += 15) {
    markers.push({
      offsetMin: m,
      label: format(new Date(anchorMs + m * 60000), "HH:mm"),
    });
  }
  return markers;
}

function getColumnKeys(slots: ExtendedEventProgramSlot[]): string[] {
  const labels = new Set<string>();
  for (const s of slots) {
    labels.add(s.stage_label?.trim() || "");
  }
  const sorted = [...labels].filter((k) => k !== "").sort((a, b) => a.localeCompare(b, "nb"));
  if (labels.has("")) sorted.push("");
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
};

/* ── Draggable block wrapper ── */
function DraggableBlock({
  item,
  label,
  multiColumn,
  colCount,
  colIndex,
  onEdit,
  isDraggable,
}: {
  item: BlockItem;
  label: string;
  multiColumn: boolean;
  colCount: number;
  colIndex: number;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  isDraggable: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.slot.id, disabled: !isDraggable });

  const title = item.slot.title_override || item.slot.slot_kind;
  const showDuration = item.heightPx >= 64;

  const colWidthPct = 100 / colCount;
  const leftPct = multiColumn ? colIndex * colWidthPct : 0;
  const widthPct = multiColumn ? colWidthPct - 1 : 100;

  const style = {
    top: item.topPx,
    height: item.heightPx,
    left: multiColumn ? `calc(40px + ${leftPct}%)` : 40,
    width: multiColumn ? `calc(${widthPct}% - 40px / ${colCount})` : "calc(100% - 40px)",
    transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute rounded-md border border-border/30 bg-card px-3 py-1.5 text-left transition-colors",
        "hover:border-accent/40 hover:bg-accent/5",
        "flex flex-col justify-between overflow-hidden",
        item.isFallback && "border-amber-500/30",
        isDragging && "shadow-lg"
      )}
      style={style}
    >
      <div className="flex items-baseline gap-1.5 min-w-0">
        {isDraggable && (
          <button
            type="button"
            className="flex items-center cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors touch-none shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="text-[10px] font-bold text-muted-foreground/50 shrink-0">
          {label}
        </span>
        <button
          type="button"
          className="text-sm font-medium text-foreground truncate text-left hover:underline"
          onClick={() => onEdit(item.slot)}
        >
          {title}
        </button>
        {item.isFallback && (
          <AlertTriangle className="h-3 w-3 text-amber-500/60 shrink-0" />
        )}
      </div>
      {showDuration && (
        <div className="flex items-center justify-between mt-auto">
          <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
            {fmtTime(item.slot.starts_at)}
          </span>
          <span className="text-[10px] text-muted-foreground/40">
            {fmtDurationLabel(item.durationMin)}
          </span>
        </div>
      )}
    </div>
  );
}

export function RunSheetPlanBlock({
  slots,
  sectionPrefix,
  startIndex,
  onEdit,
  sectionAnchorIso,
  onBlockMove,
}: RunSheetPlanBlockProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const computed = useMemo(() => {
    if (!slots.length) return { items: [], totalPx: 0, markers: [], columns: [""], anchorMs: 0 };

    const sorted = [...slots].sort((a, b) => {
      const sa = a.sequence_number ?? Infinity;
      const sb = b.sequence_number ?? Infinity;
      if (sa !== sb) return sa - sb;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });

    // Anchor = section anchor or earliest slot
    const anchorMs = sectionAnchorIso
      ? new Date(sectionAnchorIso).getTime()
      : new Date(sorted[0].starts_at).getTime();

    const columns = getColumnKeys(sorted);
    const items: BlockItem[] = [];

    // Find span for total height: from anchor to latest end
    let latestEndMs = anchorMs;

    for (let i = 0; i < sorted.length; i++) {
      const slot = sorted[i];
      const dur = resolveDuration(slot, 15);
      const isFallback = usesFallbackDuration(slot);
      const heightPx = Math.max(dur * PX_PER_MIN, MIN_BLOCK_PX);

      // Position based on stored starts_at relative to anchor
      const slotStartMs = new Date(slot.starts_at).getTime();
      const offsetMin = Math.max(0, (slotStartMs - anchorMs) / 60000);
      const topPx = Math.round(offsetMin * PX_PER_MIN);

      const slotEndMs = slotStartMs + dur * 60000;
      if (slotEndMs > latestEndMs) latestEndMs = slotEndMs;

      items.push({
        slot,
        visualIndex: startIndex + i,
        topPx,
        heightPx,
        durationMin: dur,
        isFallback,
        columnKey: slot.stage_label?.trim() || "",
      });
    }

    // Total height covers anchor to latest end
    const rawSpanMin = Math.max(0, Math.ceil((latestEndMs - anchorMs) / 60000));
    const totalMinCovered = Math.max(Math.ceil(rawSpanMin / 15) * 15, 15);
    const totalPx = totalMinCovered * PX_PER_MIN;

    // Quarter markers from anchor time
    const markers = quarterMarkers(anchorMs, totalMinCovered);

    return { items, totalPx, markers, columns, anchorMs };
  }, [slots, startIndex, sectionAnchorIso]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!onBlockMove || !computed.anchorMs) return;
      const { active, delta } = event;
      if (Math.abs(delta.y) < 2) return;

      const slotId = active.id as string;
      const item = computed.items.find((i) => i.slot.id === slotId);
      if (!item) return;

      // Calculate new position in minutes from anchor
      const newTopPx = Math.max(0, item.topPx + delta.y);
      const newOffsetMin = newTopPx / PX_PER_MIN;
      const newStartMs = computed.anchorMs + newOffsetMin * 60000;
      const snapped = snapTo5Min(new Date(newStartMs));

      const dur = item.durationMin;
      const hasExplicitEnd = item.slot.ends_at || (item.slot.duration_minutes && item.slot.duration_minutes > 0);
      const newEndsAtIso = hasExplicitEnd
        ? new Date(snapped.getTime() + dur * 60000).toISOString()
        : null;

      onBlockMove({
        slotId,
        newStartsAtIso: snapped.toISOString(),
        newEndsAtIso,
        newStageLabel: item.slot.stage_label ?? null,
      });
    },
    [onBlockMove, computed.anchorMs, computed.items]
  );

  if (!computed.items.length) return null;

  const multiColumn = computed.columns.length > 1;
  const colCount = computed.columns.length;
  const isDraggable = !!onBlockMove;

  return (
    <div className="relative mt-2 print:hidden">
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

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
            const colIndex = computed.columns.indexOf(item.columnKey);

            return (
              <DraggableBlock
                key={item.slot.id}
                item={item}
                label={label}
                multiColumn={multiColumn}
                colCount={colCount}
                colIndex={colIndex}
                onEdit={onEdit}
                isDraggable={isDraggable}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
