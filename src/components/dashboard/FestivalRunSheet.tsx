import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExtendedEventProgramSlot, ProgramSlotType } from "@/types/program-slots";
import { INTERNAL_STATUS_OPTIONS } from "@/lib/program-slots";
import { getPerformerDisplay } from "@/lib/program-performers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn, isoToLocalDatetimeString } from "@/lib/utils";
import { Plus, FileText, Trash2, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { FestivalMediaPickerDialog } from "./FestivalMediaPickerDialog";

interface FestivalRunSheetProps {
  festivalId: string;
}

/* ── Shared cell class for the tiny spreadsheet inputs ── */
const cellInput = "h-7 text-[11px] px-1.5 border-border/30 bg-background/60";
const cellSelect = "h-7 text-[11px] border-border/30 bg-background/60";

export function FestivalRunSheet({ festivalId }: FestivalRunSheetProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [attachTarget, setAttachTarget] = useState<{
    slotId: string;
    field: "contract_media_id" | "tech_rider_media_id" | "hosp_rider_media_id";
  } | null>(null);

  /* ── Data ── */
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

  /* ── Mutations ── */
  const updateSlot = useMutation({
    mutationFn: async (partial: Partial<ExtendedEventProgramSlot> & { id: string }) => {
      const { id, entity, event, ...payload } = partial as any;
      const { error } = await supabase
        .from("event_program_slots" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] }),
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
          entity_id: null,
          starts_at: now.toISOString(),
          ends_at: null,
          duration_minutes: null,
          sequence_number: null,
          slot_kind: "break",
          slot_type: null,
          source: "manual",
          visibility: "internal",
          internal_status: "contract_pending",
          internal_note: "",
          is_canceled: false,
          is_visible_public: false,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
      toast({ title: "Ny intern rad opprettet" });
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
      toast({ title: "Rad slettet" });
    },
    onError: (e: Error) =>
      toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  /* ── Derived ── */
  const slotTypeByCode = useMemo(() => {
    const map = new Map<string, ProgramSlotType>();
    (data?.types ?? []).forEach((t) => map.set(t.code, t));
    return map;
  }, [data?.types]);

  if (isLoading || !data) {
    return <LoadingState message="Laster kjøreplan..." />;
  }

  const { slots, types } = data;

  const slotsByDay = slots.reduce((acc, slot) => {
    const day = format(new Date(slot.starts_at), "EEEE d. MMMM", { locale: nb });
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<string, ExtendedEventProgramSlot[]>);

  /* ── Render ── */
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

      {slots.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border/30 rounded-lg">
          <ClipboardList className="h-6 w-6 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Ingen programrader ennå.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Legg til rader via «Ny intern rad» eller via event‑program.
          </p>
        </div>
      ) : (
        Object.entries(slotsByDay).map(([day, daySlots]) => (
          <section
            key={day}
            className="border border-border/30 rounded-lg overflow-hidden bg-card/60"
          >
            {/* Day header */}
            <div className="bg-muted/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
              {day}
            </div>

            {/* Spreadsheet table */}
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full table-fixed border-t border-border/10 text-[11px]">
                <thead className="bg-background/80">
                  <tr>
                    <th className="w-[76px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Start</th>
                    <th className="w-[52px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Min</th>
                    <th className="w-[76px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Slutt</th>
                    <th className="w-[42px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Nr</th>
                    <th className="w-[160px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Innhold</th>
                    <th className="w-[120px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">På scenen</th>
                    <th className="w-[80px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Scene</th>
                    <th className="w-[140px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Kommentar</th>
                    <th className="w-[100px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Type</th>
                    <th className="w-[86px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Synlighet</th>
                    <th className="w-[100px] px-2 py-1.5 text-left font-medium text-[10px] text-muted-foreground">Status</th>
                    <th className="w-[40px] px-2 py-1.5 text-center font-medium text-[10px] text-muted-foreground">Dok</th>
                    <th className="w-[36px] px-1 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {daySlots.map((slot) => {
                    const type = slot.slot_type ? slotTypeByCode.get(slot.slot_type) : undefined;
                    const isInternal = slot.visibility === "internal";

                    return (
                      <tr
                        key={slot.id}
                        className={cn(
                          "border-t border-border/10",
                          isInternal && "bg-muted/20",
                          slot.is_canceled && "opacity-40"
                        )}
                      >
                        {/* Start */}
                        <td className="px-2 py-2 align-top">
                          <Input
                            type="datetime-local"
                            className={cellInput}
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
                        </td>

                        {/* Duration */}
                        <td className="px-2 py-2 align-top">
                          <Input
                            type="number"
                            className={cellInput}
                            placeholder="—"
                            defaultValue={slot.duration_minutes ?? ""}
                            onBlur={(e) =>
                              updateSlot.mutate({
                                id: slot.id,
                                duration_minutes: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </td>

                        {/* End */}
                        <td className="px-2 py-2 align-top">
                          <Input
                            type="datetime-local"
                            className={cellInput}
                            defaultValue={slot.ends_at ? isoToLocalDatetimeString(slot.ends_at) : ""}
                            onBlur={(e) =>
                              updateSlot.mutate({
                                id: slot.id,
                                ends_at: e.target.value
                                  ? new Date(e.target.value).toISOString()
                                  : null,
                              })
                            }
                          />
                        </td>

                        {/* Sequence number */}
                        <td className="px-2 py-2 align-top">
                          <Input
                            type="number"
                            className={cellInput}
                            placeholder="#"
                            defaultValue={slot.sequence_number ?? ""}
                            onBlur={(e) =>
                              updateSlot.mutate({
                                id: slot.id,
                                sequence_number: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </td>

                        {/* Title override / content */}
                        <td className="px-2 py-2 align-top">
                          <Input
                            className={cellInput}
                            placeholder="Tittel..."
                            defaultValue={slot.title_override ?? ""}
                            onBlur={(e) =>
                              updateSlot.mutate({
                                id: slot.id,
                                title_override: e.target.value || null,
                              })
                            }
                          />
                        </td>

                        {/* Entity name (read-only) */}
                        <td className="px-2 py-2 align-top">
                          <div className="text-[11px] font-medium truncate leading-7">
                            {slot.entity?.name ?? "—"}
                          </div>
                        </td>

                        {/* Stage label */}
                        <td className="px-2 py-2 align-top">
                          <Input
                            className={cellInput}
                            placeholder="Scene..."
                            defaultValue={slot.stage_label ?? ""}
                            onBlur={(e) =>
                              updateSlot.mutate({
                                id: slot.id,
                                stage_label: e.target.value || null,
                              })
                            }
                          />
                        </td>

                        {/* Internal note */}
                        <td className="px-2 py-2 align-top">
                          <Input
                            className={cellInput}
                            placeholder="Notat..."
                            defaultValue={slot.internal_note ?? ""}
                            onBlur={(e) =>
                              updateSlot.mutate({
                                id: slot.id,
                                internal_note: e.target.value || null,
                              })
                            }
                          />
                        </td>

                        {/* Slot type */}
                        <td className="px-2 py-2 align-top">
                          {types.length > 0 && (
                            <Select
                              value={slot.slot_type ?? ""}
                              onValueChange={(v) =>
                                updateSlot.mutate({ id: slot.id, slot_type: v || null })
                              }
                            >
                              <SelectTrigger className={cellSelect}>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {types.map((t) => (
                                  <SelectItem key={t.code} value={t.code}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>

                        {/* Visibility */}
                        <td className="px-2 py-2 align-top">
                          <Select
                            value={slot.visibility}
                            onValueChange={(v) =>
                              updateSlot.mutate({ id: slot.id, visibility: v as any })
                            }
                          >
                            <SelectTrigger className={cellSelect}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">Publikum</SelectItem>
                              <SelectItem value="internal">Intern</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Internal status */}
                        <td className="px-2 py-2 align-top">
                          <Select
                            value={slot.internal_status}
                            onValueChange={(v) =>
                              updateSlot.mutate({ id: slot.id, internal_status: v })
                            }
                          >
                            <SelectTrigger className={cellSelect}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INTERNAL_STATUS_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Contract doc */}
                        <td className="px-2 py-2 align-top text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Koble kontrakt"
                            onClick={() =>
                              setAttachTarget({ slotId: slot.id, field: "contract_media_id" })
                            }
                          >
                            <FileText
                              className={cn(
                                "h-3.5 w-3.5",
                                slot.contract_media_id
                                  ? "text-accent"
                                  : "text-muted-foreground/40"
                              )}
                            />
                          </Button>
                        </td>

                        {/* Delete (manual only) */}
                        <td className="px-1 py-2 align-top text-right">
                          {slot.source === "manual" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive/70"
                              title="Slett rad"
                              onClick={() => {
                                if (confirm("Slette denne raden?")) deleteSlot.mutate(slot.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {/* Media picker for documents */}
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
