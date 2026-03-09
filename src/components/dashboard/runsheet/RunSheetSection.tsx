import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { ExtendedEventProgramSlot, ProgramSlotType } from "@/types/program-slots";
import { RunSheetRowCard, type ParallelGroup } from "./RunSheetRowCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface RunSheetSectionProps {
  title: string;
  slots: ExtendedEventProgramSlot[];
  slotTypeMap: Map<string, ProgramSlotType>;
  startIndex: number;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  onDelete: (slot: ExtendedEventProgramSlot) => void;
  onAddToSection?: (sectionTitle: string) => void;
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
    // First item is primary (drives shared fields display)
    groups.push({ primary: arr[0], items: arr });
  }

  // Maintain chronological order by primary's starts_at
  groups.sort((a, b) => {
    const ta = new Date(a.primary.starts_at).getTime();
    const tb = new Date(b.primary.starts_at).getTime();
    if (ta !== tb) return ta - tb;
    return (a.primary.sequence_number ?? 0) - (b.primary.sequence_number ?? 0);
  });

  return groups;
}

export function RunSheetSection({
  title,
  slots,
  slotTypeMap,
  startIndex,
  onEdit,
  onDelete,
  onAddToSection,
}: RunSheetSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const groups = useMemo(() => groupParallelSlots(slots), [slots]);

  if (slots.length === 0) return null;

  return (
    <div className="space-y-0">
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
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </span>
          <span className="text-[10px] text-muted-foreground/40 ml-1 tabular-nums">
            {slots.length} {slots.length === 1 ? "punkt" : "punkter"}
          </span>
        </button>
        {onAddToSection && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground/40 hover:text-foreground hover:bg-muted/70"
            onClick={() => onAddToSection(title)}
            title={`Legg til rad i ${title}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Rows */}
      {!collapsed && (
        <div className="space-y-2 pt-2">
          {groups.map((group, i) => (
            <RunSheetRowCard
              key={group.primary.id}
              group={group}
              index={startIndex + i}
              slotTypeLabel={group.primary.slot_type ? slotTypeMap.get(group.primary.slot_type)?.label : undefined}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
