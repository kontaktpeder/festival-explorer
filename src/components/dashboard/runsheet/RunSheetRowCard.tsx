import { Link } from "react-router-dom";
import type { ExtendedEventProgramSlot, ProgramSlotType } from "@/types/program-slots";
import { getPerformerDisplay } from "@/lib/program-performers";
import { getSlotKindConfig } from "@/lib/program-slots";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RunSheetTimeBlock } from "./RunSheetTimeBlock";
import { RunSheetMetaBadges } from "./RunSheetMetaBadges";

export interface ParallelGroup {
  primary: ExtendedEventProgramSlot;
  items: ExtendedEventProgramSlot[];
}

interface RunSheetRowCardProps {
  group: ParallelGroup;
  index: number;
  slotTypeLabel?: string;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  onDelete: (slot: ExtendedEventProgramSlot) => void;
}

export function RunSheetRowCard({ group, index, slotTypeLabel, onEdit, onDelete }: RunSheetRowCardProps) {
  const slot = group.primary;
  const kindConfig = getSlotKindConfig(slot.slot_kind as any);
  const KindIcon = kindConfig.icon;
  const isLydprøve = slot.slot_kind === "soundcheck" ||
    (slot.visibility === "internal" && (slot.title_override ?? "").toUpperCase().includes("LYDPRØVE"));
  const displayTitle = isLydprøve ? "LYDPRØVE" : (slot.title_override || kindConfig.label);
  const seqNum = slot.sequence_number ?? (index + 1);
  const isParallel = group.items.length > 1;

  return (
    <div
      className={cn(
        "group relative border border-border/20 rounded-xl bg-card/80 hover:border-border/40 transition-all duration-200",
        slot.is_canceled && "opacity-40",
        slot.visibility === "internal" && "border-l-2 border-l-amber-500/30"
      )}
    >
      <div className="flex gap-0 min-h-[88px]">
        {/* ── Time block ── */}
        <div className="w-[100px] md:w-[120px] shrink-0 px-4 py-4 border-r border-border/10 flex items-start">
          <RunSheetTimeBlock
            startsAt={slot.starts_at}
            endsAt={slot.ends_at}
            durationMinutes={slot.duration_minutes}
          />
        </div>

        {/* ── Sequence number ── */}
        <div className="w-[56px] md:w-[64px] shrink-0 flex items-center justify-center border-r border-border/10">
          <span className="text-2xl md:text-3xl font-bold text-muted-foreground/20 tabular-nums select-none">
            {String(seqNum).padStart(2, "0")}
          </span>
        </div>

        {/* ── Main content area ── */}
        <div className="flex-1 min-w-0 px-5 py-4 flex flex-col justify-center gap-2">

          {/* Performer(s) – show each item's scene + performer */}
          <div className={cn("flex gap-1.5", isParallel ? "flex-row justify-between" : "flex-col")}>
            {group.items.map((item) => {
              const performer = getPerformerDisplay(item);
              const showPerformer = performer.name !== "Ukjent prosjekt" && performer.name !== "TBA";
              return (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  {item.stage_label && (
                    <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide shrink-0">
                      {item.stage_label}
                    </span>
                  )}
                  {item.stage_label && showPerformer && (
                    <span className="text-muted-foreground/30">·</span>
                  )}
                  {showPerformer && (
                    performer.href ? (
                      <Link
                        to={performer.href}
                        className="text-sm font-medium text-accent hover:underline underline-offset-2 truncate"
                      >
                        {performer.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-foreground/70 truncate">
                        {performer.name}
                      </span>
                    )
                  )}
                  {/* Edit button for parallel sub-items (not the primary) */}
                  {isParallel && item.id !== slot.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground/40 hover:text-foreground ml-auto shrink-0"
                      onClick={() => onEdit(item)}
                      title="Rediger parallell"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Row 2: Comment */}
          {slot.internal_note && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {slot.internal_note}
            </p>
          )}

          {/* Row 3: Meta badges */}
          <RunSheetMetaBadges
            stageLabel={!isParallel ? slot.stage_label : undefined}
            visibility={slot.visibility}
            internalStatus={slot.internal_status}
            hasContract={!!slot.contract_media_id}
            slotTypeLabel={slotTypeLabel}
            isLydprøve={isLydprøve}
            isParallel={isParallel}
          />
        </div>

        {/* ── Actions ── */}
        <div className="w-[48px] shrink-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(slot)}
            title="Rediger"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {slot.source === "manual" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive/60 hover:text-destructive"
              onClick={() => onDelete(slot)}
              title="Slett"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
