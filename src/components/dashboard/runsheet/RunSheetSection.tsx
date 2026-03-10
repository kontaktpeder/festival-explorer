import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import type { ExtendedEventProgramSlot, ProgramSlotType } from "@/types/program-slots";
import type { RunSheetSectionKey } from "@/lib/runsheet-sections";
import { RunSheetRowCard, type ParallelGroup } from "./RunSheetRowCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  onShiftSectionTime?: (
    sectionKey: RunSheetSectionKey,
    slots: ExtendedEventProgramSlot[],
    deltaMs: number
  ) => void;
  onTimeChange?: (slotId: string, startsAt: string, endsAt: string | null) => void;
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

/** Parse "HH:mm" to minutes since midnight */
function parseTimeToMinutes(time: string): number | null {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

export function RunSheetSection({
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
  onShiftSectionTime,
  onTimeChange,
}: RunSheetSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName || title);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => groupParallelSlots(slots), [slots]);

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

  const handleShiftTime = () => {
    if (!timeRange || !onShiftSectionTime) return;
    const currentMinutes = parseTimeToMinutes(timeRange.from);
    const newMinutes = parseTimeToMinutes(newStartTime);
    if (currentMinutes === null || newMinutes === null) return;
    const deltaMs = (newMinutes - currentMinutes) * 60 * 1000;
    if (deltaMs === 0) {
      setTimePopoverOpen(false);
      return;
    }
    onShiftSectionTime(sectionKey, slots, deltaMs);
    setTimePopoverOpen(false);
  };

  return (
    <div className="runsheet-section space-y-0" data-section={sectionKey} data-print-section>
      {/* Section header */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors",
            "bg-muted/50 hover:bg-muted/70 border border-border/20"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
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
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {shownName}
            </span>
          )}
          {/* Time range + count */}
          <div className="flex items-center gap-2 ml-1">
            {timeRange && (
              <span className="text-[10px] text-muted-foreground/50 tabular-nums font-mono">
                {timeRange.from} – {timeRange.to}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/40 tabular-nums">
              {slots.length} {slots.length === 1 ? "punkt" : "punkter"}
            </span>
          </div>
        </button>

        {/* Shift time button */}
        {onShiftSectionTime && timeRange && (
          <Popover open={timePopoverOpen} onOpenChange={(open) => {
            setTimePopoverOpen(open);
            if (open && timeRange) setNewStartTime(timeRange.from);
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground/30 hover:text-foreground hover:bg-muted/70 print:hidden"
                title="Endre starttid for seksjonen"
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="end">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Flytt seksjon</p>
                  <p className="text-[10px] text-muted-foreground">
                    Alle {slots.length} punkter flyttes relativt til ny starttid.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
                      Nåværende start
                    </label>
                    <p className="text-sm font-mono tabular-nums text-muted-foreground">{timeRange.from}</p>
                  </div>
                  <div className="text-muted-foreground/30">→</div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
                      Ny start
                    </label>
                    <Input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="h-8 text-sm font-mono tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => setTimePopoverOpen(false)}
                  >
                    Avbryt
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={handleShiftTime}
                    disabled={!newStartTime || newStartTime === timeRange.from}
                  >
                    Flytt
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Rename button */}
        {onRenameSection && !editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground/30 hover:text-foreground hover:bg-muted/70 print:hidden"
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
            className="h-9 w-9 shrink-0 text-muted-foreground/40 hover:text-foreground hover:bg-muted/70 print:hidden"
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
            className="h-9 w-9 shrink-0 text-destructive/30 hover:text-destructive hover:bg-muted/70 print:hidden"
            onClick={() => onDeleteSection(sectionKey, slots)}
            title={`Slett ${shownName} (${slots.length} punkt)`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Rows */}
      {!collapsed && !isEmpty && (
        <div className="pt-2 space-y-2">
          {groups.map((group, i) => (
            <RunSheetRowCard
              key={group.primary.id}
              group={group}
              index={startIndex + i}
              sectionKey={sectionKey}
              sectionPrefix={sectionPrefix}
              slotTypeLabel={group.primary.slot_type ? slotTypeMap.get(group.primary.slot_type)?.label : undefined}
              isNow={nowSlotId === group.primary.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!collapsed && isEmpty && (
        <div className="py-6 text-center border border-dashed border-border/20 rounded-lg mt-2">
          <p className="text-xs text-muted-foreground/40">Ingen punkter ennå</p>
        </div>
      )}
    </div>
  );
}
