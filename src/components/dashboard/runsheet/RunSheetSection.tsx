import { useState, useMemo, useRef, useEffect, useCallback, forwardRef } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { format } from "date-fns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ExtendedEventProgramSlot, ProgramSlotType } from "@/types/program-slots";
import type { RunSheetSectionKey } from "@/lib/runsheet-sections";
import type { EffectiveTime, LiveAction } from "@/lib/runsheet-live";
import { RunSheetRowCard, type ParallelGroup } from "./RunSheetRowCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RunSheetSectionProps {
  sectionKey: RunSheetSectionKey;
  title: string;
  displayName?: string;
  sectionPrefix?: string;
  slots: ExtendedEventProgramSlot[];
  slotTypeMap: Map<string, ProgramSlotType>;
  startIndex: number;
  nowSlotId?: string | null;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  onDelete: (slot: ExtendedEventProgramSlot) => void;
  onAddToSection?: (sectionKey: RunSheetSectionKey) => void;
  onRenameSection?: (sectionKey: string, newName: string) => void;
  onDeleteSection?: (
    sectionKey: RunSheetSectionKey,
    slotsInSection: ExtendedEventProgramSlot[]
  ) => void;
  onTimeChange?: (slotId: string, startsAt: string, endsAt: string | null) => void;
  /** Reorder callback: receives ordered slot IDs after drag */
  onReorder?: (orderedSlotIds: string[]) => void;
  /** Live mode props */
  mode?: "plan" | "live";
  canOperate?: boolean;
  onLiveAction?: (slotId: string, action: LiveAction) => void;
  effectiveTimeline?: Map<string, EffectiveTime>;
  /** Chain-computed visual start times: slotId → ISO string */
  visualStartMap?: Map<string, string>;
}

/** Group slots by parallel_group_id; singletons become groups of 1 */
function groupParallelSlots(slots: ExtendedEventProgramSlot[]): ParallelGroup[] {
  const parallelMap = new Map<string, ExtendedEventProgramSlot[]>();
  const groups: ParallelGroup[] = [];

  for (const s of slots) {
    if (s.parallel_group_id) {
      const arr = parallelMap.get(s.parallel_group_id) || [];
      arr.push(s);
      parallelMap.set(s.parallel_group_id, arr);
    } else {
      groups.push({ primary: s, items: [s] });
    }
  }

  for (const [, arr] of parallelMap) {
    groups.push({ primary: arr[0], items: arr });
  }

  groups.sort((a, b) => {
    const sa = a.primary.sequence_number ?? Infinity;
    const sb = b.primary.sequence_number ?? Infinity;
    if (sa !== sb) return sa - sb;
    return new Date(a.primary.starts_at).getTime() - new Date(b.primary.starts_at).getTime();
  });

  return groups;
}

function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

/* ── Sortable row wrapper ── */
function SortableRow({
  group,
  index,
  sectionKey,
  sectionPrefix,
  slotTypeMap,
  nowSlotId,
  onEdit,
  onDelete,
  onTimeChange,
  mode,
  canOperate,
  onLiveAction,
  effectiveTimeline,
  isDraggable,
  visualStartAt,
}: {
  group: ParallelGroup;
  index: number;
  sectionKey: RunSheetSectionKey;
  sectionPrefix?: string;
  slotTypeMap: Map<string, ProgramSlotType>;
  nowSlotId?: string | null;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  onDelete: (slot: ExtendedEventProgramSlot) => void;
  onTimeChange?: (slotId: string, startsAt: string, endsAt: string | null) => void;
  mode?: "plan" | "live";
  canOperate?: boolean;
  onLiveAction?: (slotId: string, action: LiveAction) => void;
  effectiveTimeline?: Map<string, EffectiveTime>;
  isDraggable: boolean;
  visualStartAt?: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.primary.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 50 : undefined,
  };

  const et = effectiveTimeline?.get(group.primary.id);

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-0">
      {isDraggable && (
        <button
          type="button"
          className="flex items-center px-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors print:hidden touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <RunSheetRowCard
          group={group}
          index={index}
          sectionKey={sectionKey}
          sectionPrefix={sectionPrefix}
          slotTypeLabel={group.primary.slot_type ? slotTypeMap.get(group.primary.slot_type)?.label : undefined}
          isNow={nowSlotId === group.primary.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onTimeChange={onTimeChange}
          mode={mode}
          canOperate={canOperate}
          onLiveAction={onLiveAction}
          liveEffectiveStart={et?.effectiveStart.toISOString() ?? null}
          liveEffectiveEnd={et?.effectiveEnd?.toISOString() ?? null}
          visualStartAt={visualStartAt}
        />
      </div>
    </div>
  );
}

export const RunSheetSection = forwardRef<HTMLDivElement, RunSheetSectionProps>(function RunSheetSection({
  sectionKey,
  title,
  displayName,
  sectionPrefix,
  slots,
  slotTypeMap,
  startIndex,
  nowSlotId,
  onEdit,
  onDelete,
  onAddToSection,
  onRenameSection,
  onDeleteSection,
  onTimeChange,
  onReorder,
  mode = "plan",
  canOperate = false,
  onLiveAction,
  effectiveTimeline,
  visualStartMap,
}, ref) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName || title);
  const inputRef = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => groupParallelSlots(slots), [slots]);
  const isDraggable = mode === "plan" && !!onReorder;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title && onRenameSection) {
      onRenameSection(title, trimmed);
    }
    setEditing(false);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorder) return;

      const oldIndex = groups.findIndex((g) => g.primary.id === active.id);
      const newIndex = groups.findIndex((g) => g.primary.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(groups, oldIndex, newIndex);
      // Collect all slot IDs in new order (flatten parallel groups)
      const orderedIds: string[] = [];
      for (const g of reordered) {
        for (const item of g.items) {
          orderedIds.push(item.id);
        }
      }
      onReorder(orderedIds);
    },
    [groups, onReorder]
  );

  const isEmpty = slots.length === 0;
  const shownName = displayName || title;

  // Compute section time range
  const timeRange = useMemo(() => {
    if (slots.length === 0) return null;
    const sorted = [...slots].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const first = sorted[0].starts_at;
    const lastSlot = sorted[sorted.length - 1];
    const last = lastSlot.ends_at || lastSlot.starts_at;
    return { from: fmtTime(first), to: fmtTime(last), firstIso: first };
  }, [slots]);

  const sortableIds = useMemo(() => groups.map((g) => g.primary.id), [groups]);

  return (
    <div ref={ref} className="runsheet-section space-y-0" data-section={sectionKey} data-print-section>
      {/* Section header */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex-1 min-w-0 flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 rounded-lg transition-colors",
            "bg-muted/50 active:bg-muted/80 hover:bg-muted/70 border border-border/20"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          )}
          {editing ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setEditValue(shownName); setEditing(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-6 text-[11px] font-bold uppercase tracking-[0.2em] bg-transparent border-none p-0 focus-visible:ring-0 text-muted-foreground"
            />
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-muted-foreground truncate">
              {shownName}
            </span>
          )}
          {/* Time range + count */}
          <div className="flex items-center gap-1.5 md:gap-2 ml-auto shrink-0">
            {timeRange && (
              <span className="text-[9px] md:text-[10px] text-muted-foreground/50 tabular-nums font-mono">
                {timeRange.from}–{timeRange.to}
              </span>
            )}
            <span className="text-[9px] md:text-[10px] text-muted-foreground/40 tabular-nums hidden md:inline">
              {slots.length} {slots.length === 1 ? "punkt" : "punkter"}
            </span>
            <span className="text-[9px] text-muted-foreground/40 tabular-nums md:hidden">
              {slots.length}
            </span>
          </div>
        </button>

        {/* Rename button */}
        {onRenameSection && !editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground/30 active:text-foreground hover:text-foreground hover:bg-muted/70 print:hidden hidden md:flex"
            onClick={() => { setEditValue(shownName); setEditing(true); }}
            title="Endre navn"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Add row to this section */}
        {onAddToSection && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground/40 active:text-foreground hover:text-foreground hover:bg-muted/70 print:hidden"
            onClick={() => onAddToSection(sectionKey)}
            title={`Ny rad i ${shownName}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Delete section */}
        {onDeleteSection && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-destructive/30 active:text-destructive hover:text-destructive hover:bg-muted/70 print:hidden"
            onClick={() => onDeleteSection(sectionKey, slots)}
            title={`Slett ${shownName} (${slots.length} punkt)`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Rows with DnD */}
      {!collapsed && !isEmpty && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="pt-2 space-y-2">
              {groups.map((group, i) => (
                <SortableRow
                  key={group.primary.id}
                  group={group}
                  index={startIndex + i}
                  sectionKey={sectionKey}
                  sectionPrefix={sectionPrefix}
                  slotTypeMap={slotTypeMap}
                  nowSlotId={nowSlotId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onTimeChange={onTimeChange}
                  mode={mode}
                  canOperate={canOperate}
                  onLiveAction={onLiveAction}
                  effectiveTimeline={effectiveTimeline}
                  isDraggable={isDraggable}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty state */}
      {!collapsed && isEmpty && (
        <div className="py-6 text-center border border-dashed border-border/20 rounded-lg mt-2">
          <p className="text-xs text-muted-foreground/40">Ingen punkter ennå</p>
        </div>
      )}
    </div>
  );
});
