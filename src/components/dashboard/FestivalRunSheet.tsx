import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExtendedEventProgramSlot, ProgramSlotType } from "@/types/program-slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";
import {
  Plus,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { isoToLocalDatetimeString } from "@/lib/utils";
import { FestivalMediaPickerDialog } from "./FestivalMediaPickerDialog";

interface FestivalRunSheetProps {
  festivalId: string;
}

export function FestivalRunSheet({ festivalId }: FestivalRunSheetProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [attachTarget, setAttachTarget] = useState<{
    slotId: string;
    field: "contract_media_id" | "tech_rider_media_id" | "hosp_rider_media_id";
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["festival-run-sheet", festivalId],
    queryFn: async () => {
      const [slotsRes, typesRes] = await Promise.all([
        supabase
          .from("event_program_slots" as any)
          .select("*, entity:entities(id, name, slug)")
          .eq("festival_id", festivalId)
          .order("starts_at", { ascending: true }),
        supabase
          .from("program_slot_types" as any)
          .select("*")
          .eq("festival_id", festivalId)
          .order("sort_order", { ascending: true }),
      ]);
      if (slotsRes.error) throw slotsRes.error;
      if (typesRes.error) throw typesRes.error;
      return {
        slots: (slotsRes.data ?? []) as unknown as ExtendedEventProgramSlot[],
        types: (typesRes.data ?? []) as unknown as ProgramSlotType[],
      };
    },
  });

  const updateSlot = useMutation({
    mutationFn: async (partial: Partial<ExtendedEventProgramSlot> & { id: string }) => {
      const { id, entity, event, ...payload } = partial as any;
      const { error } = await supabase
        .from("event_program_slots" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
    },
    onError: (e: Error) =>
      toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const createManualSlot = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const { error } = await supabase
        .from("event_program_slots" as any)
        .insert({
          festival_id: festivalId,
          event_id: null,
          starts_at: now.toISOString(),
          ends_at: null,
          source: "manual",
          visibility: "internal",
          slot_kind: "break",
          slot_type: null,
          internal_status: "confirmed",
          internal_note: "",
          is_canceled: false,
          is_visible_public: false,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
      toast({ title: "Ny rad opprettet" });
    },
    onError: (e: Error) =>
      toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_program_slots" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
      toast({ title: "Slettet" });
    },
  });

  const slotTypeByCode = useMemo(() => {
    const map = new Map<string, ProgramSlotType>();
    (data?.types ?? []).forEach((t) => map.set(t.code, t));
    return map;
  }, [data?.types]);

  if (isLoading || !data) {
    return <LoadingState message="Laster kjøreplan..." />;
  }

  const { slots, types } = data;

  // Group by day
  const slotsByDay = slots.reduce((acc, slot) => {
    const day = format(new Date(slot.starts_at), "EEEE d. MMMM", { locale: nb });
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<string, ExtendedEventProgramSlot[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Kjøreplan
          </h2>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {slots.length} rad{slots.length !== 1 ? "er" : ""}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => createManualSlot.mutate()}
          className="h-7 text-xs gap-1.5 border-border/30 hover:border-accent/40"
        >
          <Plus className="h-3 w-3" />
          Ny intern rad
        </Button>
      </div>

      {/* Slots grouped by day */}
      {slots.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border/30 rounded-lg">
          <ClipboardList className="h-6 w-6 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            Ingen programrader ennå.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Legg til rader via «Ny intern rad» eller koble events med festival_id.
          </p>
        </div>
      ) : (
        Object.entries(slotsByDay).map(([day, daySlots]) => (
          <div key={day} className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium mb-3">
              {day}
            </div>
            <div className="space-y-0 divide-y divide-border/10">
              {daySlots.map((slot) => {
                const type = slot.slot_type
                  ? slotTypeByCode.get(slot.slot_type)
                  : undefined;
                const isInternal = slot.visibility === "internal";

                return (
                  <div
                    key={slot.id}
                    className={cn(
                      "py-3 flex items-start gap-3 group",
                      isInternal && "bg-muted/5",
                      slot.is_canceled && "opacity-40"
                    )}
                  >
                    {/* Time */}
                    <div className="w-[72px] shrink-0 space-y-1">
                      <Input
                        type="datetime-local"
                        className="h-6 text-[10px] px-1 border-border/20 bg-transparent"
                        defaultValue={isoToLocalDatetimeString(slot.starts_at)}
                        onBlur={(e) => {
                          if (e.target.value) {
                            updateSlot.mutate({
                              id: slot.id,
                              starts_at: new Date(e.target.value).toISOString(),
                            });
                          }
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {slot.entity?.name ?? slot.internal_note ?? "—"}
                        </span>
                        {slot.source === "manual" && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5 border-border/20 text-muted-foreground/60"
                          >
                            Manuell
                          </Badge>
                        )}
                        {type && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5"
                            style={{
                              borderColor: `var(--${type.color}, currentColor)`,
                              color: `var(--${type.color}, currentColor)`,
                            }}
                          >
                            {type.label}
                          </Badge>
                        )}
                      </div>

                      {/* Inline controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Slot type selector */}
                        {types.length > 0 && (
                          <Select
                            value={slot.slot_type ?? ""}
                            onValueChange={(v) =>
                              updateSlot.mutate({
                                id: slot.id,
                                slot_type: v || null,
                              })
                            }
                          >
                            <SelectTrigger className="h-6 w-28 text-[10px] border-border/20 bg-transparent">
                              <SelectValue placeholder="Type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {types.map((t) => (
                                <SelectItem
                                  key={t.code}
                                  value={t.code}
                                  className="text-xs"
                                >
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Visibility */}
                        <Select
                          value={slot.visibility}
                          onValueChange={(v) =>
                            updateSlot.mutate({
                              id: slot.id,
                              visibility: v as any,
                            })
                          }
                        >
                          <SelectTrigger className="h-6 w-24 text-[10px] border-border/20 bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public" className="text-xs">
                              <span className="flex items-center gap-1">
                                <Eye className="h-2.5 w-2.5" /> Publikum
                              </span>
                            </SelectItem>
                            <SelectItem value="internal" className="text-xs">
                              <span className="flex items-center gap-1">
                                <EyeOff className="h-2.5 w-2.5" /> Intern
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Note (inline) */}
                        <Input
                          className="h-6 text-[10px] px-1.5 flex-1 min-w-[120px] border-border/20 bg-transparent placeholder:text-muted-foreground/30"
                          placeholder="Notat..."
                          defaultValue={slot.internal_note ?? ""}
                          onBlur={(e) =>
                            updateSlot.mutate({
                              id: slot.id,
                              internal_note: e.target.value || null,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Koble kontrakt"
                        onClick={() =>
                          setAttachTarget({
                            slotId: slot.id,
                            field: "contract_media_id",
                          })
                        }
                      >
                        <FileText
                          className={cn(
                            "h-3 w-3",
                            slot.contract_media_id
                              ? "text-accent"
                              : "text-muted-foreground/40"
                          )}
                        />
                      </Button>
                      {slot.source === "manual" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive/60"
                          title="Slett"
                          onClick={() => {
                            if (confirm("Slette denne raden?"))
                              deleteSlot.mutate(slot.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Media picker dialog for attaching documents */}
      {attachTarget && (
        <FestivalMediaPickerDialog
          festivalId={festivalId}
          open={!!attachTarget}
          onOpenChange={(open) => !open && setAttachTarget(null)}
          onSelect={async (mediaId) => {
            await updateSlot.mutateAsync({
              id: attachTarget.slotId,
              [attachTarget.field]: mediaId,
            } as any);
            setAttachTarget(null);
          }}
        />
      )}
    </div>
  );
}
