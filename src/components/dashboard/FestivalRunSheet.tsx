import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExtendedEventProgramSlot, ProgramSlotType } from "@/types/program-slots";
import { INTERNAL_STATUS_OPTIONS, SLOT_KIND_OPTIONS } from "@/lib/program-slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn, isoToLocalDatetimeString } from "@/lib/utils";
import { Plus, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { FestivalMediaPickerDialog } from "./FestivalMediaPickerDialog";
import { RunSheetSection } from "./runsheet/RunSheetSection";

interface FestivalRunSheetProps {
  festivalId: string;
}

/** Map slot_kind to a section category for grouping */
function getSectionForSlot(slot: ExtendedEventProgramSlot): string {
  // Use slot_kind + visibility heuristics for sectioning
  const kind = slot.slot_kind;
  if (kind === "doors" || kind === "closing") return "Dører & logistikk";
  if (slot.visibility === "internal" && (kind === "break" || !slot.entity_id)) return "Opprigg & intern";
  if (kind === "concert" || kind === "boiler" || kind === "stage_talk" || kind === "giggen_info") return "Event";
  return "Annet";
}

const SECTION_ORDER = ["Opprigg & intern", "Dører & logistikk", "Event", "Annet"];

export function FestivalRunSheet({ festivalId }: FestivalRunSheetProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingSlot, setEditingSlot] = useState<ExtendedEventProgramSlot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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
          .select(`
            *,
            entity:entities!event_program_slots_entity_id_fkey(id, name, slug),
            performer_entity:entities!event_program_slots_performer_entity_id_fkey(id, name, slug, is_published),
            performer_persona:personas!event_program_slots_performer_persona_id_fkey(id, name, slug, is_public)
          `)
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
      const { id, entity, event, performer_entity, performer_persona, ...payload } = partial as any;
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
  const slotTypeMap = useMemo(() => {
    const map = new Map<string, ProgramSlotType>();
    (data?.types ?? []).forEach((t) => map.set(t.code, t));
    return map;
  }, [data?.types]);

  if (isLoading || !data) {
    return <LoadingState message="Laster kjøreplan..." />;
  }

  const { slots, types } = data;

  /* Group by day, then by section within each day */
  const slotsByDay = slots.reduce((acc, slot) => {
    const day = format(new Date(slot.starts_at), "EEEE d. MMMM yyyy", { locale: nb });
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<string, ExtendedEventProgramSlot[]>);

  const openEdit = (slot: ExtendedEventProgramSlot) => {
    setEditingSlot(slot);
    setDialogOpen(true);
  };

  const handleDelete = (slot: ExtendedEventProgramSlot) => {
    if (window.confirm("Slette denne raden?")) {
      deleteSlot.mutate(slot.id);
    }
  };

  const handleSave = (updates: Record<string, unknown>) => {
    if (!editingSlot) return;
    updateSlot.mutate({ id: editingSlot.id, ...updates } as any);
    setDialogOpen(false);
    setEditingSlot(null);
  };

  /* ── Render ── */
  return (
    <div className="space-y-8">
      {/* Document header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Kjøreplan
            </h2>
            <p className="text-xs text-muted-foreground">
              {slots.length} punkt{slots.length !== 1 ? "er" : ""} · Produksjonsdokument
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => createManualSlot.mutate()}
          className="h-8 text-xs gap-1.5 border-border/30 hover:border-accent/40"
        >
          <Plus className="h-3.5 w-3.5" />
          Ny intern rad
        </Button>
      </div>

      {slots.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/30 rounded-xl">
          <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Ingen programrader ennå.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Legg til rader via «Ny intern rad» eller via event‑program.
          </p>
        </div>
      ) : (
        Object.entries(slotsByDay).map(([day, daySlots]) => {
          // Group within each day by section
          const sectionMap = new Map<string, ExtendedEventProgramSlot[]>();
          for (const slot of daySlots) {
            const section = getSectionForSlot(slot);
            const list = sectionMap.get(section) || [];
            list.push(slot);
            sectionMap.set(section, list);
          }

          // Order sections
          const orderedSections = SECTION_ORDER
            .filter((s) => sectionMap.has(s))
            .map((s) => ({ title: s, slots: sectionMap.get(s)! }));

          // Add any sections not in predefined order
          sectionMap.forEach((sSlots, title) => {
            if (!SECTION_ORDER.includes(title)) {
              orderedSections.push({ title, slots: sSlots });
            }
          });

          let runningIndex = 0;

          return (
            <div key={day} className="space-y-4">
              {/* Day header */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/30" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground/60 whitespace-nowrap">
                  {day}
                </h3>
                <div className="h-px flex-1 bg-border/30" />
              </div>

              {/* Sections */}
              <div className="space-y-5">
                {orderedSections.map((section) => {
                  const startIdx = runningIndex;
                  runningIndex += section.slots.length;
                  return (
                    <RunSheetSection
                      key={section.title}
                      title={section.title}
                      slots={section.slots}
                      slotTypeMap={slotTypeMap}
                      startIndex={startIdx}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Edit dialog */}
      {editingSlot && (
        <RunSheetEditDialog
          slot={editingSlot}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingSlot(null);
          }}
          onSave={handleSave}
          types={types}
        />
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

/* ── Edit Dialog ── */
interface RunSheetEditDialogProps {
  slot: ExtendedEventProgramSlot;
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Record<string, unknown>) => void;
  types: ProgramSlotType[];
}

interface FestivalEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  city: string | null;
  venue: { id: string; name: string } | null;
}

function RunSheetEditDialog({ slot, festivalId, open, onOpenChange, onSave, types }: RunSheetEditDialogProps) {
  const [eventId, setEventId] = useState(slot.event_id ?? "");
  const [startsAt, setStartsAt] = useState(isoToLocalDatetimeString(slot.starts_at));
  const [endsAt, setEndsAt] = useState(slot.ends_at ? isoToLocalDatetimeString(slot.ends_at) : "");
  const [durationMinutes, setDurationMinutes] = useState(String(slot.duration_minutes ?? ""));
  const [sequenceNumber, setSequenceNumber] = useState(String(slot.sequence_number ?? ""));
  const [titleOverride, setTitleOverride] = useState(slot.title_override ?? "");
  const [stageLabel, setStageLabel] = useState(slot.stage_label ?? "");
  const [internalNote, setInternalNote] = useState(slot.internal_note ?? "");
  const [slotKind, setSlotKind] = useState(slot.slot_kind);
  const [slotType, setSlotType] = useState(slot.slot_type ?? "");
  const [visibility, setVisibility] = useState(slot.visibility);
  const [internalStatus, setInternalStatus] = useState(slot.internal_status);
  const [isVisiblePublic, setIsVisiblePublic] = useState(slot.is_visible_public);
  const [isCanceled, setIsCanceled] = useState(slot.is_canceled);
  const [nameOverride, setNameOverride] = useState(slot.performer_name_override ?? "");

  // Fetch festival events for the selector
  const { data: festivalEvents } = useQuery({
    queryKey: ["festival-events-for-runsheet", festivalId],
    queryFn: async () => {
      const { data: feRows, error: feError } = await supabase
        .from("festival_events")
        .select("event_id")
        .eq("festival_id", festivalId);
      if (feError) throw feError;
      if (!feRows?.length) return [] as FestivalEvent[];

      const eventIds = feRows.map((r) => r.event_id);
      const { data: events, error: evError } = await supabase
        .from("events")
        .select("id, title, start_at, end_at, city, venue:venues(id, name)")
        .in("id", eventIds)
        .order("start_at", { ascending: true });
      if (evError) throw evError;
      return (events ?? []) as unknown as FestivalEvent[];
    },
    enabled: open,
  });

  const handleEventSelect = (selectedEventId: string) => {
    setEventId(selectedEventId);
    if (selectedEventId === "__none__") {
      setEventId("");
      return;
    }
    const ev = festivalEvents?.find((e) => e.id === selectedEventId);
    if (!ev) return;
    // Auto-fill time fields
    setStartsAt(isoToLocalDatetimeString(ev.start_at));
    if (ev.end_at) setEndsAt(isoToLocalDatetimeString(ev.end_at));
    // Auto-fill venue/stage
    if (ev.venue?.name) setStageLabel(ev.venue.name);
    // Auto-fill title if empty
    if (!titleOverride) setTitleOverride(ev.title);
    // Calculate duration
    if (ev.end_at) {
      const mins = Math.round((new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()) / 60000);
      if (mins > 0) setDurationMinutes(String(mins));
    }
  };

  const handleSubmit = () => {
    onSave({
      event_id: eventId || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      duration_minutes: durationMinutes ? Number(durationMinutes) : null,
      sequence_number: sequenceNumber ? Number(sequenceNumber) : null,
      title_override: titleOverride || null,
      stage_label: stageLabel || null,
      internal_note: internalNote || null,
      slot_kind: slotKind,
      slot_type: slotType || null,
      visibility,
      internal_status: internalStatus,
      is_visible_public: isVisiblePublic,
      is_canceled: isCanceled,
      performer_name_override: nameOverride || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rediger rad</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
          {/* Event selector */}
          {festivalEvents && festivalEvents.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Koble til event</Label>
              <Select value={eventId || "__none__"} onValueChange={handleEventSelect}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Velg event..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ingen (manuell rad)</SelectItem>
                  {festivalEvents.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Velg event for å fylle ut tid, sted og varighet automatisk</p>
            </div>
          )}

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Starttid</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-9 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sluttid</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-9 text-base" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Varighet (min)</Label>
              <Input type="number" placeholder="—" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Løpenummer</Label>
              <Input type="number" placeholder="#" value={sequenceNumber} onChange={(e) => setSequenceNumber(e.target.value)} className="h-9" />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-xs">Innhold / tittel</Label>
            <Input placeholder="F.eks. LYDPRØVE 1ETG" value={titleOverride} onChange={(e) => setTitleOverride(e.target.value)} className="h-9 text-sm uppercase" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Scene / sted</Label>
              <Input placeholder="F.eks. 1ETG, FOH" value={stageLabel} onChange={(e) => setStageLabel(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Performer (fritekst)</Label>
              <Input placeholder="Overstyr navn" value={nameOverride} onChange={(e) => setNameOverride(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Kommentar</Label>
            <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Interne instrukser..." rows={3} className="text-sm" />
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Slot-type</Label>
              <Select value={slotKind} onValueChange={setSlotKind}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOT_KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {types.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori</Label>
                <Select value={slotType} onValueChange={setSlotType}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Synlighet</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Publikum</SelectItem>
                  <SelectItem value="internal">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={internalStatus} onValueChange={setInternalStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERNAL_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between pt-2 border-t border-border/20">
            <div className="flex items-center gap-2">
              <Switch id="rs-visible" checked={isVisiblePublic} onCheckedChange={setIsVisiblePublic} />
              <Label htmlFor="rs-visible" className="text-sm cursor-pointer">Synlig for publikum</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="rs-canceled" checked={isCanceled} onChange={(e) => setIsCanceled(e.target.checked)} className="h-4 w-4 rounded" />
              <Label htmlFor="rs-canceled" className="text-sm cursor-pointer">Avlyst</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={handleSubmit}>Lagre</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
