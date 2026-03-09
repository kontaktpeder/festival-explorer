import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ExtendedEventProgramSlot, ProgramSlotType } from "@/types/program-slots";
import { RunSheetRowCard } from "./RunSheetRowCard";
import { cn } from "@/lib/utils";

interface RunSheetSectionProps {
  title: string;
  slots: ExtendedEventProgramSlot[];
  slotTypeMap: Map<string, ProgramSlotType>;
  startIndex: number;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  onDelete: (slot: ExtendedEventProgramSlot) => void;
}

export function RunSheetSection({
  title,
  slots,
  slotTypeMap,
  startIndex,
  onEdit,
  onDelete,
}: RunSheetSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (slots.length === 0) return null;

  return (
    <div className="space-y-0">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors",
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

      {/* Rows */}
      {!collapsed && (
        <div className="space-y-2 pt-2">
          {slots.map((slot, i) => (
            <RunSheetRowCard
              key={slot.id}
              slot={slot}
              index={startIndex + i}
              slotTypeLabel={slot.slot_type ? slotTypeMap.get(slot.slot_type)?.label : undefined}
              onEdit={() => onEdit(slot)}
              onDelete={() => onDelete(slot)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
