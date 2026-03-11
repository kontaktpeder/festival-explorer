import { useState } from "react";
import { Link } from "react-router-dom";
import type { ExtendedEventProgramSlot, ProgramSlotType } from "@/types/program-slots";
import type { RunSheetSectionKey } from "@/lib/runsheet-sections";
import { getPerformerDisplay } from "@/lib/program-performers";
import { getSlotKindConfig, getFieldsForSlotKind } from "@/lib/program-slots";
import type { SlotKind } from "@/types/database";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RunSheetTimeBlock } from "./RunSheetTimeBlock";
import { RunSheetMetaBadges } from "./RunSheetMetaBadges";
import { getSceneColor, isCriticalSlotKind } from "@/lib/runsheet-scene-colors";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ParallelGroup {
  primary: ExtendedEventProgramSlot;
  items: ExtendedEventProgramSlot[];
}

interface RunSheetRowCardProps {
  group: ParallelGroup;
  index: number;
  sectionKey?: RunSheetSectionKey;
  sectionPrefix?: string;
  slotTypeLabel?: string;
  isNow?: boolean;
  onEdit: (slot: ExtendedEventProgramSlot) => void;
  onDelete: (slot: ExtendedEventProgramSlot) => void;
  onTimeChange?: (slotId: string, startsAt: string, endsAt: string | null) => void;
}

export function RunSheetRowCard({ group, index, sectionKey, sectionPrefix, slotTypeLabel, isNow, onEdit, onDelete, onTimeChange }: RunSheetRowCardProps) {
  const slot = group.primary;
  const kindConfig = getSlotKindConfig(slot.slot_kind as any);
  const showFields = getFieldsForSlotKind(slot.slot_kind as SlotKind);
  const seqNum = index + 1;
  const isParallel = group.items.length > 1;
  const isCritical = isCriticalSlotKind(slot.slot_kind);
  const sceneColor = !isParallel && showFields.has("scene") ? getSceneColor(slot.stage_label) : null;

  // Inline time editing
  const [timePopOpen, setTimePopOpen] = useState(false);
  const toTimeStr = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const openTimePop = () => {
    setEditStart(toTimeStr(slot.starts_at));
    setEditEnd(slot.ends_at ? toTimeStr(slot.ends_at) : "");
    setTimePopOpen(true);
  };

  const commitTime = () => {
    if (!onTimeChange || !editStart) return;
    const base = new Date(slot.starts_at);
    const [sh, sm] = editStart.split(":").map(Number);
    base.setHours(sh, sm, 0, 0);
    let endIso: string | null = null;
    if (editEnd) {
      const endDate = new Date(slot.ends_at || slot.starts_at);
      const [eh, em] = editEnd.split(":").map(Number);
      endDate.setHours(eh, em, 0, 0);
      if (endDate.getTime() <= base.getTime()) endDate.setDate(endDate.getDate() + 1);
      endIso = endDate.toISOString();
    }
    onTimeChange(slot.id, base.toISOString(), endIso);
    setTimePopOpen(false);
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl transition-all duration-200",
        isCritical
          ? "border-2 border-accent/40 bg-accent/5"
          : "border border-border/20 bg-card/80 hover:border-border/40",
        slot.is_canceled && "opacity-40",
        slot.visibility === "internal" && !isCritical && "border-l-2 border-l-amber-500/30",
        isNow && "ring-2 ring-accent/60 ring-offset-1 ring-offset-background"
      )}
    >
      {isNow && (
        <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-widest rounded-full">
          NÅ
        </div>
      )}

      <div className="flex gap-0 min-h-[100px] md:min-h-[120px]">
        {/* ── Time block (clickable for inline edit) ── */}
        <Popover open={timePopOpen} onOpenChange={setTimePopOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={openTimePop}
              className={cn(
                "w-[90px] md:w-[110px] shrink-0 px-3 py-4 border-r flex items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors rounded-l-xl print:cursor-default",
                isCritical ? "border-accent/20" : "border-border/10"
              )}
              title="Endre tidspunkt"
            >
              <RunSheetTimeBlock
                startsAt={slot.starts_at}
                endsAt={slot.ends_at}
                durationMinutes={slot.duration_minutes}
                isCritical={isCritical}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-4" align="start">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-foreground">Endre tidspunkt</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Start</label>
                  <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="h-8 text-sm font-mono tabular-nums" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Slutt</label>
                  <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="h-8 text-sm font-mono tabular-nums" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => setTimePopOpen(false)}>Avbryt</Button>
                <Button size="sm" className="flex-1 text-xs h-7" onClick={commitTime} disabled={!editStart}>Lagre</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* ── Sequence number ── */}
        <div className="w-[48px] md:w-[56px] shrink-0 flex items-center justify-center border-r border-border/10">
          <span className={cn(
            "text-xl md:text-2xl font-bold tabular-nums",
            isCritical ? "text-accent/40" : "text-muted-foreground/12"
          )}>
            {sectionPrefix || ""}{String(seqNum).padStart(2, "0")}
          </span>
        </div>

        {/* ── Main content area ── */}
        <div className="flex-1 min-w-0 px-5 md:px-6 py-4 flex flex-col justify-center gap-1.5">

          {/* Slot kind icon (standalone, no label – label moves inline with name) */}

          {/* Performer(s) – parallel tree view or single */}
          {showFields.has("performer") && (
            isParallel ? (
              <div className="flex flex-col gap-0.5 pl-1">
                {group.items.map((item, idx) => {
                  const performer = getPerformerDisplay(item);
                  const showPerformer = performer.name !== "Ukjent prosjekt" && performer.name !== "TBA";
                  const itemSceneColor = getSceneColor(item.stage_label);
                  const itemKindConfig = getSlotKindConfig(item.slot_kind as any);
                  const isLast = idx === group.items.length - 1;
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      {/* Tree connector */}
                      <span className="text-muted-foreground/30 font-mono text-xs shrink-0 w-3">
                        {isLast ? "└" : "├"}
                      </span>
                      {/* Scene badge with color */}
                      {showFields.has("scene") && item.stage_label && (
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                          itemSceneColor ? `${itemSceneColor.bg} ${itemSceneColor.text}` : "text-muted-foreground/50"
                        )}>
                          {item.stage_label}
                        </span>
                      )}
                      {/* Kind label inline */}
                      {itemKindConfig && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 shrink-0">
                          {itemKindConfig.label}
                        </span>
                      )}
                      {showPerformer && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          {performer.href ? (
                            <Link
                              to={performer.href}
                              className="text-xs font-medium text-accent hover:underline underline-offset-2 truncate"
                            >
                              {performer.name}
                            </Link>
                          ) : (
                            <span className="text-xs font-medium text-foreground/70 truncate">
                              {performer.name}
                            </span>
                          )}
                        </>
                      )}
                      <div className="flex items-center gap-0.5 ml-auto shrink-0 print:hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground/30 hover:text-foreground"
                          onClick={() => onEdit(item)}
                          title="Rediger"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground/30 hover:text-destructive"
                          onClick={() => onDelete(item)}
                          title="Slett"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {kindConfig && (
                  <div className="flex items-center gap-1 shrink-0">
                    <kindConfig.icon className={cn("h-3 w-3", isCritical ? "text-accent" : "text-muted-foreground/50")} />
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isCritical ? "text-accent" : "text-muted-foreground/60"
                    )}>
                      {kindConfig.label}
                    </span>
                  </div>
                )}
                {(() => {
                  const performer = getPerformerDisplay(slot);
                  const showPerformer = performer.name !== "Ukjent prosjekt" && performer.name !== "TBA";
                  return showPerformer ? (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      {performer.href ? (
                        <Link
                          to={performer.href}
                          className="text-sm font-semibold text-accent hover:underline underline-offset-2 truncate"
                        >
                          {performer.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-foreground/80 truncate">
                          {performer.name}
                        </span>
                      )}
                    </>
                  ) : null;
                })()}
              </div>
            )
          )}

          {/* Internal note */}
          {showFields.has("note") && slot.internal_note && (
            <p className="text-[11px] text-muted-foreground/50 leading-relaxed line-clamp-2 italic">
              {slot.internal_note}
            </p>
          )}

          {/* Meta badges */}
          <RunSheetMetaBadges
            stageLabel={showFields.has("scene") && !isParallel ? slot.stage_label : undefined}
            visibility={showFields.has("visibilityStatus") ? slot.visibility : undefined}
            internalStatus={showFields.has("visibilityStatus") ? slot.internal_status : undefined}
            hasContract={showFields.has("visibilityStatus") && !!slot.contract_media_id}
            slotTypeLabel={showFields.has("category") ? slotTypeLabel : undefined}
            isParallel={isParallel}
          />
        </div>

        {/* ── Actions ── */}
        <div className="w-[48px] shrink-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
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
