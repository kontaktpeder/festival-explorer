import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExtendedEventProgramSlot, ProgramSlotType, PerformerKind } from "@/types/program-slots";
import { INTERNAL_STATUS_OPTIONS, SLOT_KIND_OPTIONS, getFieldsForSlotKind } from "@/lib/program-slots";
import type { SlotKind } from "@/types/database";
import {
  type RunSheetSectionKey,
  RUNSHEET_SECTION_KEYS,
  getSectionForSlot,
  groupSlotsBySection,
} from "@/lib/runsheet-sections";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn, isoToLocalDatetimeString } from "@/lib/utils";
import { Plus, ClipboardList, ChevronDown, Printer, Filter, Download } from "lucide-react";
import { getSceneColor } from "@/lib/runsheet-scene-colors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { usePersonaSearch } from "@/hooks/usePersonaSearch";
import { FestivalMediaPickerDialog } from "./FestivalMediaPickerDialog";
import { RunSheetSection } from "./runsheet/RunSheetSection";
import { RunSheetPrintView } from "./runsheet/RunSheetPrintView";
import { useFestivalSubjects } from "@/hooks/useFestivalSubjects";
import { useEventRunSheetDefault, useEventSceneOptions } from "@/hooks/useEventRunSheetDefault";

interface FestivalRunSheetProps {
  festivalId: string;
  readOnly?: boolean;
}

export function FestivalRunSheet({ festivalId, readOnly = false }: FestivalRunSheetProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingSlot, setEditingSlot] = useState<ExtendedEventProgramSlot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sceneFilter, setSceneFilter] = useState<string | null>(null);
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

  // Fetch festival info for venue + print header
  const { data: festivalInfo } = useQuery({
    queryKey: ["festival-info-runsheet", festivalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("venue_id, name, start_at, venue:venues!festivals_venue_id_fkey(name)")
        .eq("id", festivalId)
        .single();
      return data;
    },
  });
  const festivalVenueId = festivalInfo?.venue_id ?? null;
  const [printFilter, setPrintFilter] = useState<"all" | "lydprover" | "event" | string>("all");

  // Prosjekter + personas fra alle kilder via felles hook
  const { data: allSubjects = [] } = useFestivalSubjects(festivalId);
  const festivalEntities = useMemo(
    () => allSubjects.filter((s) => s.kind === "entity"),
    [allSubjects]
  );

  /** Renumber all slots' sequence_number to be consecutive (1, 2, 3, ...) based on current order */
  const renumberSlots = async () => {
    const allSlots = data?.slots ?? [];
    if (!allSlots.length) return;
    // Sort by current sequence_number, then starts_at
    const sorted = [...allSlots].sort((a, b) => {
      const sa = a.sequence_number ?? Infinity;
      const sb = b.sequence_number ?? Infinity;
      if (sa !== sb) return sa - sb;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
    // Build updates only for slots whose sequence_number needs to change
    const updates: { id: string; seq: number }[] = [];
    sorted.forEach((s, i) => {
      const desired = i + 1;
      if (s.sequence_number !== desired) {
        updates.push({ id: s.id, seq: desired });
      }
    });
    if (!updates.length) return;
    // Batch update
    await Promise.all(
      updates.map(({ id, seq }) =>
        supabase
          .from("event_program_slots" as any)
          .update({ sequence_number: seq })
          .eq("id", id)
      )
    );
  };

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
    mutationFn: async ({ sectionType, seq }: { sectionType: "opprigg" | "lydprøve" | "event" | "doors" | "closing" | "stage_talk" | "giggen_info" | "break" | "crew" | "custom"; seq: number }) => {
      const now = new Date();
      const presets: Record<string, { slot_kind: string; title_override: string; visibility: string; is_visible_public: boolean }> = {
        opprigg: { slot_kind: "rigging", title_override: "OPPRIGG", visibility: "internal", is_visible_public: false },
        lydprøve: { slot_kind: "soundcheck", title_override: "LYDPRØVE", visibility: "internal", is_visible_public: false },
        event: { slot_kind: "concert", title_override: "", visibility: "public", is_visible_public: true },
        doors: { slot_kind: "doors", title_override: "", visibility: "public", is_visible_public: true },
        closing: { slot_kind: "closing", title_override: "", visibility: "public", is_visible_public: true },
        stage_talk: { slot_kind: "stage_talk", title_override: "", visibility: "public", is_visible_public: true },
        giggen_info: { slot_kind: "giggen_info", title_override: "", visibility: "public", is_visible_public: true },
        break: { slot_kind: "break", title_override: "", visibility: "internal", is_visible_public: false },
        crew: { slot_kind: "crew", title_override: "", visibility: "internal", is_visible_public: false },
        custom: { slot_kind: "custom", title_override: "", visibility: "public", is_visible_public: true },
      };
      const preset = presets[sectionType];
      const { error } = await supabase
        .from("event_program_slots" as any)
        .insert({
          festival_id: festivalId,
          event_id: null,
          entity_id: null,
          starts_at: now.toISOString(),
          ends_at: null,
          duration_minutes: null,
          sequence_number: seq,
          slot_kind: preset.slot_kind,
          slot_type: null,
          source: "manual",
          visibility: preset.visibility,
          internal_status: "contract_pending",
          internal_note: "",
          is_canceled: false,
          is_visible_public: preset.is_visible_public,
          title_override: preset.title_override || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
      await renumberSlots();
      queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
      toast({ title: "Ny rad opprettet" });
    },
    onError: (e: Error) =>
      toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });



  const handleSingleTimeChange = (slotId: string, startsAt: string, endsAt: string | null) => {
    updateSlot.mutate({ id: slotId, starts_at: startsAt, ...(endsAt !== undefined ? { ends_at: endsAt } : {}) } as any);
  };

  /** Map section key → preset type for "add to section" */
  const handleAddToSection = (sectionKey: RunSheetSectionKey) => {
    const map: Record<RunSheetSectionKey, "opprigg" | "lydprøve" | "event"> = {
      "Lydprøver": "lydprøve",
      "Event": "event",
    };
    createManualSlot.mutate({ sectionType: map[sectionKey] ?? "event", seq: nextSequenceNumber });
  };

  /** Custom section display names (stored in state) */
  const [sectionNames, setSectionNames] = useState<Record<string, string>>({});
  const handleRenameSection = (sectionKey: string, newName: string) => {
    setSectionNames((prev) => ({ ...prev, [sectionKey]: newName }));
  };

  /** Delete all slots in a section – only deletes the slots passed in */
  const deleteSection = useMutation({
    mutationFn: async (slotIds: string[]) => {
      const { error } = await supabase
        .from("event_program_slots" as any)
        .delete()
        .in("id", slotIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
      toast({ title: "Seksjon slettet" });
    },
    onError: (e: Error) =>
      toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const handleDeleteSection = (
    sectionKey: RunSheetSectionKey,
    slotsToDelete: ExtendedEventProgramSlot[]
  ) => {
    if (slotsToDelete.length === 0) return;
    const displayName = sectionNames[sectionKey] || sectionKey;
    if (!window.confirm(`Slette seksjonen «${displayName}» og alle ${slotsToDelete.length} punkter? Dette kan ikke angres.`)) return;
    deleteSection.mutate(slotsToDelete.map((s) => s.id));
  };

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_program_slots" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
      // Refetch to get fresh data, then renumber
      const fresh = queryClient.getQueryData<{ slots: ExtendedEventProgramSlot[] }>(["festival-run-sheet", festivalId]);
      if (fresh?.slots) {
        const sorted = [...fresh.slots].sort((a, b) => {
          const sa = a.sequence_number ?? Infinity;
          const sb = b.sequence_number ?? Infinity;
          if (sa !== sb) return sa - sb;
          return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
        });
        const updates: { id: string; seq: number }[] = [];
        sorted.forEach((s, i) => {
          if (s.sequence_number !== i + 1) updates.push({ id: s.id, seq: i + 1 });
        });
        if (updates.length) {
          await Promise.all(
            updates.map(({ id, seq }) =>
              supabase.from("event_program_slots" as any).update({ sequence_number: seq }).eq("id", id)
            )
          );
          queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
        }
      }
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

  /* Collect unique scene labels for filter */
  const sceneLabels = useMemo(() => {
    const allSlots = data?.slots ?? [];
    const labels = new Set<string>();
    allSlots.forEach((s) => { if (s.stage_label) labels.add(s.stage_label); });
    return Array.from(labels).sort();
  }, [data?.slots]);

  /* Group into the fixed sections, applying scene filter */
  const sectionsWithSlots = useMemo(() => {
    let allSlots = data?.slots ?? [];
    if (sceneFilter) {
      allSlots = allSlots.filter((s) => s.stage_label === sceneFilter);
    }
    const grouped = groupSlotsBySection(allSlots);
    return RUNSHEET_SECTION_KEYS.map((key) => ({
      sectionKey: key,
      slots: grouped[key],
    }));
  }, [data?.slots, sceneFilter]);

  /* NOW marker – find the slot that's currently active */
  const nowSlotId = useMemo(() => {
    const allSlots = data?.slots ?? [];
    const now = Date.now();
    for (const s of allSlots) {
      const start = new Date(s.starts_at).getTime();
      const end = s.ends_at ? new Date(s.ends_at).getTime() : (s.duration_minutes ? start + s.duration_minutes * 60000 : start + 15 * 60000);
      if (now >= start && now < end) return s.id;
    }
    return null;
  }, [data?.slots]);

  const nextSequenceNumber = useMemo(() => {
    const allSlots = data?.slots ?? [];
    if (!allSlots.length) return 1;
    const max = Math.max(...allSlots.map((s) => s.sequence_number ?? 0), 0);
    return max + 1;
  }, [data?.slots]);

  /* ── Print-filtered slots ── */
  const printSlots = useMemo(() => {
    const allSlots = data?.slots ?? [];
    if (printFilter === "all") return allSlots;
    if (printFilter === "lydprover") return allSlots.filter((s) => getSectionForSlot(s) === "Lydprøver");
    if (printFilter === "event") return allSlots.filter((s) => getSectionForSlot(s) === "Event");
    return allSlots.filter((s) => s.stage_label === printFilter);
  }, [data?.slots, printFilter]);

  if (isLoading || !data) {
    return <LoadingState message="Laster kjøreplan..." />;
  }

  const { slots, types } = data;

  const openEdit = (slot: ExtendedEventProgramSlot) => {
    if (readOnly) return;
    setEditingSlot(slot);
    setDialogOpen(true);
  };

  const handleDelete = (slot: ExtendedEventProgramSlot) => {
    if (readOnly) return;
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

  const handleDownloadPdf = async () => {
    const el = document.querySelector(".runsheet-print-doc") as HTMLElement | null;
    if (!el) return;
    // Temporarily show the print view for capture
    el.style.display = "block";
    toast({ title: "Genererer PDF..." });
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdfW = 210; // A4 mm
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageH = 297;
      let yOffset = 0;
      while (yOffset < pdfH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yOffset, pdfW, pdfH);
        yOffset += pageH;
      }
      const name = festivalInfo?.name ? `Kjøreplan – ${festivalInfo.name}.pdf` : "Kjøreplan.pdf";
      pdf.save(name);
    } catch (e: any) {
      toast({ title: "Feil", description: e.message, variant: "destructive" });
    } finally {
      el.style.display = "";
    }
  };

  const triggerPrint = (filter: "all" | "lydprover" | "event" | string) => {
    setPrintFilter(filter);
    setTimeout(() => window.print(), 100);
  };

  const venueName = (festivalInfo as any)?.venue?.name ?? null;

  /* ── Render ── */
  return (
    <div className="space-y-8">
      {/* Document header (screen only) */}
      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
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
          {/* Desktop: all buttons inline */}
          <div className="hidden md:flex items-center gap-2">
            {/* Download PDF dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-border/30 hover:border-accent/40"
                >
                  <Download className="h-3.5 w-3.5" />
                  Last ned
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setPrintFilter("all"); setTimeout(handleDownloadPdf, 100); }}>
                  Hele kjøreplanen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPrintFilter("lydprover"); setTimeout(handleDownloadPdf, 100); }}>
                  Kun lydprøver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPrintFilter("event"); setTimeout(handleDownloadPdf, 100); }}>
                  Kun event
                </DropdownMenuItem>
                {sceneLabels.map((label) => (
                  <DropdownMenuItem key={label} onClick={() => { setPrintFilter(label); setTimeout(handleDownloadPdf, 100); }}>
                    Kun {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Print dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-border/30 hover:border-accent/40"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Skriv ut
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => triggerPrint("all")}>
                  Hele kjøreplanen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => triggerPrint("lydprover")}>
                  Kun lydprøver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => triggerPrint("event")}>
                  Kun event
                </DropdownMenuItem>
                {sceneLabels.map((label) => (
                  <DropdownMenuItem key={label} onClick={() => triggerPrint(label)}>
                    Kun {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-border/30 hover:border-accent/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ny rad
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "opprigg", seq: nextSequenceNumber })}>
                  Opprigg
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "lydprøve", seq: nextSequenceNumber })}>
                  Lydprøve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "event", seq: nextSequenceNumber })}>
                  Konsert
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "doors", seq: nextSequenceNumber })}>
                  Dører
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "closing", seq: nextSequenceNumber })}>
                  Stenging
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "stage_talk", seq: nextSequenceNumber })}>
                  Snakk fra scenen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "giggen_info", seq: nextSequenceNumber })}>
                  Hva er GIGGEN
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "break", seq: nextSequenceNumber })}>
                  Pause
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "crew", seq: nextSequenceNumber })}>
                  Crew
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "custom", seq: nextSequenceNumber })}>
                  Egendefinert
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile: compact button row */}
        <div className="flex md:hidden items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1 flex-1 border-border/30">
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => { setPrintFilter("all"); setTimeout(handleDownloadPdf, 100); }}>
                Hele kjøreplanen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPrintFilter("lydprover"); setTimeout(handleDownloadPdf, 100); }}>
                Kun lydprøver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPrintFilter("event"); setTimeout(handleDownloadPdf, 100); }}>
                Kun event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1 flex-1 border-border/30">
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => triggerPrint("all")}>Hele kjøreplanen</DropdownMenuItem>
              <DropdownMenuItem onClick={() => triggerPrint("lydprover")}>Kun lydprøver</DropdownMenuItem>
              <DropdownMenuItem onClick={() => triggerPrint("event")}>Kun event</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1 flex-1 border-border/30">
                <Plus className="h-3.5 w-3.5" />
                Ny rad
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "opprigg", seq: nextSequenceNumber })}>Opprigg</DropdownMenuItem>
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "lydprøve", seq: nextSequenceNumber })}>Lydprøve</DropdownMenuItem>
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "event", seq: nextSequenceNumber })}>Konsert</DropdownMenuItem>
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "doors", seq: nextSequenceNumber })}>Dører</DropdownMenuItem>
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "closing", seq: nextSequenceNumber })}>Stenging</DropdownMenuItem>
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "stage_talk", seq: nextSequenceNumber })}>Snakk fra scenen</DropdownMenuItem>
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "giggen_info", seq: nextSequenceNumber })}>Hva er GIGGEN</DropdownMenuItem>
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "break", seq: nextSequenceNumber })}>Pause</DropdownMenuItem>
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "crew", seq: nextSequenceNumber })}>Crew</DropdownMenuItem>
              <DropdownMenuItem onClick={() => createManualSlot.mutate({ sectionType: "custom", seq: nextSequenceNumber })}>Egendefinert</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scene filter bar */}
      {slots.length > 0 && sceneLabels.length > 1 && (
        <div className="flex items-center gap-2 print:hidden flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground/50" />
          <button
            onClick={() => setSceneFilter(null)}
            className={cn(
              "text-[11px] px-3 py-1 rounded-full border transition-colors font-medium",
              !sceneFilter
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border/40 hover:border-foreground/30"
            )}
          >
            Alle
          </button>
          {sceneLabels.map((label) => {
            const color = getSceneColor(label);
            const isActive = sceneFilter === label;
            return (
              <button
                key={label}
                onClick={() => setSceneFilter(isActive ? null : label)}
                className={cn(
                  "text-[11px] px-3 py-1 rounded-full border transition-colors font-medium uppercase tracking-wider",
                  isActive
                    ? color ? `${color.bg} ${color.text} ${color.border}` : "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border/40 hover:border-foreground/30"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {slots.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/30 rounded-xl">
          <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Ingen programrader ennå.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Legg til rader via «Ny intern rad» eller via event‑program.
          </p>
        </div>
      ) : (
        <div className="runsheet-print space-y-5">
          {(() => {
            const sectionPrefixes: Record<string, string> = { "Lydprøver": "L", "Event": "E" };
            let globalIndex = 0;
            return sectionsWithSlots.map(({ sectionKey, slots: sectionSlots }) => {
              const startIdx = globalIndex;
              globalIndex += sectionSlots.length;
              return (
                <RunSheetSection
                  key={sectionKey}
                  sectionKey={sectionKey}
                  title={sectionKey}
                  displayName={sectionNames[sectionKey] || (sectionKey === "Lydprøver" ? "Lydprøver & Opprigg" : undefined)}
                  sectionPrefix={sectionPrefixes[sectionKey]}
                  slots={sectionSlots}
                  slotTypeMap={slotTypeMap}
                  startIndex={startIdx}
                  nowSlotId={nowSlotId}
                  onEdit={readOnly ? () => {} : openEdit}
                  onDelete={readOnly ? () => {} : handleDelete}
                  onAddToSection={readOnly ? undefined : handleAddToSection}
                  onRenameSection={readOnly ? undefined : handleRenameSection}
                  onDeleteSection={readOnly ? undefined : handleDeleteSection}
                  onTimeChange={readOnly ? undefined : handleSingleTimeChange}
                 />
              );
            });
          })()}
        </div>
      )}

      {/* Edit dialog */}
      {editingSlot && (
        <RunSheetEditDialog
          festivalId={festivalId}
          festivalVenueId={festivalVenueId ?? null}
          slot={editingSlot}
          suggestedSequenceNumber={nextSequenceNumber}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingSlot(null);
          }}
          onSave={handleSave}
          onParallelCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["festival-run-sheet", festivalId] });
            setEditingSlot(null);
          }}
          types={types}
          festivalEntities={festivalEntities}
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

      {/* ── Clean print view (hidden on screen, shown on print) ── */}
      <RunSheetPrintView
        festivalName={festivalInfo?.name}
        festivalDate={festivalInfo?.start_at ? format(new Date(festivalInfo.start_at), "d. MMMM yyyy", { locale: nb }) : undefined}
        venueName={venueName}
        slots={printSlots}
        sectionNames={sectionNames}
      />
    </div>
  );
}

/* ── Edit Dialog ── */
interface RunSheetEditDialogProps {
  slot: ExtendedEventProgramSlot;
  festivalId: string;
  festivalVenueId: string | null;
  suggestedSequenceNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Record<string, unknown>) => void;
  onParallelCreated?: () => void;
  types: ProgramSlotType[];
  festivalEntities: { id: string; name: string; slug: string }[];
}

interface FestivalEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  city: string | null;
  venue: { id: string; name: string } | null;
  scene_id: string | null;
  scene_name: string | null;
}

function getRunSheetSectionFromSlot(kind: string, visibility: string, title?: string | null): RunSheetSectionKey {
  const upper = (title ?? "").toUpperCase();
  if (
    kind === "soundcheck" ||
    kind === "rigging" ||
    kind === "crew" ||
    (visibility === "internal" && upper.includes("LYDPRØVE"))
  ) return "Lydprøver";
  return "Event";
}

function RunSheetEditDialog({ slot, festivalId, festivalVenueId, suggestedSequenceNumber, open, onOpenChange, onSave, onParallelCreated, types, festivalEntities }: RunSheetEditDialogProps) {
  const { toast } = useToast();
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
  const [editSection, setEditSection] = useState<RunSheetSectionKey>(
    getRunSheetSectionFromSlot(slot.slot_kind, slot.visibility, slot.title_override)
  );
  const [internalStatus, setInternalStatus] = useState(slot.internal_status);
  const [isVisiblePublic, setIsVisiblePublic] = useState(slot.is_visible_public);
  const [isCanceled, setIsCanceled] = useState(slot.is_canceled);
  const [nameOverride, setNameOverride] = useState(slot.performer_name_override ?? "");

  // Performer fields
  const [performerKind, setPerformerKind] = useState<PerformerKind>(slot.performer_kind || "entity");
  const [performerEntityId, setPerformerEntityId] = useState(slot.performer_entity_id || slot.entity_id || "");
  const [performerPersonaId, setPerformerPersonaId] = useState(slot.performer_persona_id || "");
  const [personaQuery, setPersonaQuery] = useState("");

  // Auto-calculate duration from start/end times
  useEffect(() => {
    if (!startsAt || !endsAt) return;
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (end <= start) return;
    const minutes = Math.round((end - start) / 60000);
    setDurationMinutes(String(minutes));
  }, [startsAt, endsAt]);

  // Default sequence number when slot doesn't have one
  useEffect(() => {
    if (!open || !slot) return;
    if (slot.sequence_number == null) {
      setSequenceNumber(String(suggestedSequenceNumber));
    } else {
      setSequenceNumber(String(slot.sequence_number));
    }
    setEditSection(getRunSheetSectionFromSlot(slot.slot_kind, slot.visibility, slot.title_override));
  }, [open, slot?.id, slot?.sequence_number, slot?.slot_kind, slot?.visibility, slot?.title_override, suggestedSequenceNumber]);

  useEffect(() => {
    setEditSection(getRunSheetSectionFromSlot(slotKind, visibility, titleOverride));
  }, [slotKind, visibility, titleOverride]);

  const handleSectionChange = (value: RunSheetSectionKey) => {
    setEditSection(value);
    if (value === "Lydprøver") {
      if (!["soundcheck", "rigging", "crew"].includes(slotKind)) setSlotKind("soundcheck");
      setVisibility("internal");
      setIsVisiblePublic(false);
      return;
    }
    if (["soundcheck", "rigging", "crew"].includes(slotKind)) setSlotKind("concert");
    if (visibility === "internal") setVisibility("public");
    setIsVisiblePublic(true);
  };

  // Helper: get current performer name for auto-title comparison
  const getCurrentPerformerName = (): string => {
    if (performerKind === "entity") {
      const e = festivalEntities.find((x) => x.id === performerEntityId);
      return e?.name || slot.performer_entity?.name || "";
    }
    if (performerKind === "persona") {
      if (slot.performer_persona?.id === performerPersonaId) return slot.performer_persona.name;
      const found = personaResults.find((p) => p.id === performerPersonaId);
      return found?.name || "";
    }
    return "";
  };

  // Persona search
  const { data: personaResults = [] } = usePersonaSearch({
    query: personaQuery,
    mode: "all",
    enabled: performerKind === "persona" && open,
  });

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
        .select("id, title, start_at, end_at, city, venue:venues(id, name), scene_id")
        .in("id", eventIds)
        .order("start_at", { ascending: true });
      if (evError) throw evError;

      // Resolve scene names for events that have scene_id
      const eventsWithScene = (events ?? []) as unknown as (Omit<FestivalEvent, 'scene_name'>)[];
      const sceneIds = eventsWithScene.map((e) => e.scene_id).filter(Boolean) as string[];
      let sceneMap = new Map<string, string>();
      if (sceneIds.length > 0) {
        const { data: scenes } = await supabase
          .from("venue_scenes" as any)
          .select("id, name")
          .in("id", sceneIds);
        if (scenes) {
          (scenes as unknown as { id: string; name: string }[]).forEach((s) => sceneMap.set(s.id, s.name));
        }
      }

      return eventsWithScene.map((e) => ({
        ...e,
        scene_name: e.scene_id ? sceneMap.get(e.scene_id) ?? null : null,
      })) as FestivalEvent[];
    },
    enabled: open,
  });

  // Run sheet defaults for the selected event
  const { default: runSheetDefault } = useEventRunSheetDefault(eventId || null);

  // Scene options: from defaults, event's venue, or festival's venue as fallback
  const selectedEvent = festivalEvents?.find((e) => e.id === eventId);
  const venueIdForScenes = runSheetDefault?.venue_id ?? selectedEvent?.venue?.id ?? festivalVenueId ?? null;
  const sceneIdsFromDefault = runSheetDefault?.scene_ids?.length ? runSheetDefault.scene_ids : null;
  const { data: sceneOptions = [] } = useEventSceneOptions(venueIdForScenes, sceneIdsFromDefault);

  const handleEventSelect = (selectedEventId: string) => {
    if (selectedEventId === "__none__") {
      setEventId("");
      return;
    }
    setEventId(selectedEventId);
    const ev = festivalEvents?.find((e) => e.id === selectedEventId);
    if (!ev) return;

    // Time & duration: use defaults if available, otherwise from event
    // Note: runSheetDefault won't be loaded yet for the NEW eventId,
    // so we always use event data on initial select. Defaults apply on re-open.
    setStartsAt(isoToLocalDatetimeString(ev.start_at));
    if (ev.end_at) setEndsAt(isoToLocalDatetimeString(ev.end_at));
    if (ev.end_at) {
      const mins = Math.round((new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()) / 60000);
      if (mins > 0) setDurationMinutes(String(mins));
    }

    // Scene: prefer scene name, fallback to venue name
    if (ev.scene_name) {
      setStageLabel(ev.scene_name);
    } else if (ev.venue?.name) {
      setStageLabel(ev.venue.name);
    }

    if (!titleOverride) setTitleOverride(ev.title);
  };

  // When defaults load (async after eventId changes), apply time from defaults
  useEffect(() => {
    if (!runSheetDefault) return;
    setStartsAt(isoToLocalDatetimeString(runSheetDefault.starts_at));
    if (runSheetDefault.ends_at) setEndsAt(isoToLocalDatetimeString(runSheetDefault.ends_at));
    if (runSheetDefault.duration_minutes != null) setDurationMinutes(String(runSheetDefault.duration_minutes));
  }, [runSheetDefault?.id]);

  const handlePerformerKindChange = (v: string) => {
    const kind = v as PerformerKind;
    setPerformerKind(kind);
    if (kind !== "persona") setPerformerPersonaId("");
    if (kind !== "entity") setPerformerEntityId("");
    if (kind !== "text") setNameOverride("");
  };

  const handleCreateParallel = async () => {
    // 1) Save the current slot first so it exists in DB with latest values
    const savedPayload: any = {
      event_id: eventId || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : slot.starts_at,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      duration_minutes: durationMinutes ? Number(durationMinutes) : null,
      sequence_number: sequenceNumber ? Number(sequenceNumber) : suggestedSequenceNumber,
      title_override: titleOverride || null,
      stage_label: stageLabel || null,
      internal_note: internalNote || null,
      slot_kind: slotKind,
      slot_type: slotType || null,
      visibility,
      internal_status: internalStatus,
      performer_kind: performerKind,
      performer_entity_id: performerEntityId || null,
      performer_persona_id: performerPersonaId || null,
      performer_name_override: nameOverride || null,
    };

    const { error: saveErr } = await supabase
      .from("event_program_slots" as any)
      .update(savedPayload)
      .eq("id", slot.id);

    if (saveErr) {
      toast({ title: "Feil ved lagring", description: saveErr.message, variant: "destructive" });
      return;
    }

    // 2) Assign parallel group
    const groupId = slot.parallel_group_id || crypto.randomUUID();

    if (!slot.parallel_group_id) {
      const { error: upErr } = await supabase
        .from("event_program_slots" as any)
        .update({ parallel_group_id: groupId })
        .eq("id", slot.id);
      if (upErr) {
        toast({ title: "Feil", description: upErr.message, variant: "destructive" });
        return;
      }
    }

    // 3) Insert parallel slot using the just-saved values
    const { error: insErr } = await supabase
      .from("event_program_slots" as any)
      .insert({
        festival_id: slot.festival_id,
        event_id: eventId || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : slot.starts_at,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        duration_minutes: durationMinutes ? Number(durationMinutes) : null,
        sequence_number: sequenceNumber ? Number(sequenceNumber) : suggestedSequenceNumber,
        slot_kind: slotKind,
        slot_type: slotType || null,
        internal_status: internalStatus,
        internal_note: internalNote || null,
        visibility,
        is_canceled: slot.is_canceled,
        is_visible_public: slot.is_visible_public,
        title_override: titleOverride || null,
        stage_label: null,
        performer_kind: "entity",
        performer_entity_id: null,
        performer_persona_id: null,
        performer_name_override: null,
        entity_id: null,
        source: "manual",
        parallel_group_id: groupId,
      } as any);

    if (insErr) {
      toast({ title: "Feil", description: insErr.message, variant: "destructive" });
      return;
    }

    toast({ title: "Rad lagret og parallell rad opprettet" });
    onOpenChange(false);
    onParallelCreated?.();
  };

  const handleSubmit = () => {
    onSave({
      event_id: eventId || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      duration_minutes: durationMinutes ? Number(durationMinutes) : null,
      sequence_number: sequenceNumber ? Number(sequenceNumber) : suggestedSequenceNumber,
      title_override: titleOverride || null,
      stage_label: stageLabel || null,
      internal_note: internalNote || null,
      slot_kind: slotKind,
      slot_type: slotType || null,
      visibility,
      internal_status: internalStatus,
      is_visible_public: isVisiblePublic,
      is_canceled: isCanceled,
      performer_kind: performerKind,
      performer_entity_id: performerKind === "entity" ? performerEntityId || null : null,
      performer_persona_id: performerKind === "persona" ? performerPersonaId || null : null,
      performer_name_override: performerKind === "text" ? nameOverride || null : null,
    });
  };

  // Selected persona display name
  const selectedPersonaName = useMemo(() => {
    if (!performerPersonaId) return null;
    // Check from slot data first
    if (slot.performer_persona?.id === performerPersonaId) return slot.performer_persona.name;
    // Check from search results
    const found = personaResults.find((p) => p.id === performerPersonaId);
    return found?.name || null;
  }, [performerPersonaId, slot.performer_persona, personaResults]);

  const showFields = useMemo(
    () => getFieldsForSlotKind(slotKind as SlotKind),
    [slotKind]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rediger rad</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
          {/* Section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Seksjon</Label>
            <Select value={editSection} onValueChange={(v) => handleSectionChange(v as RunSheetSectionKey)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lydprøver">Lydprøver (L)</SelectItem>
                <SelectItem value="Event">Event (E)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Flytt enkelt mellom L- og E-seksjon uten å endre andre rader.</p>
          </div>

          {/* Type – always shown, controls which fields appear */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Type</Label>
            <Select value={slotKind} onValueChange={setSlotKind}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* Event selector */}
          {showFields.has("event") && festivalEvents && festivalEvents.length > 0 && (
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
          {showFields.has("time") && (
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
          )}

          {(showFields.has("duration") || showFields.has("sequence")) && (
            <div className="grid grid-cols-2 gap-3">
              {showFields.has("duration") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Varighet (min)</Label>
                  <Input type="number" placeholder="—" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="h-9" />
                  <p className="text-[10px] text-muted-foreground">Beregnes fra start/slutt</p>
                </div>
              )}
              {showFields.has("sequence") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Løpenummer</Label>
                  <Input type="number" placeholder="#" value={sequenceNumber} onChange={(e) => setSequenceNumber(e.target.value)} className="h-9" />
                </div>
              )}
            </div>
          )}

          {/* Content / title */}
          {showFields.has("title") && (
            <div className="space-y-1.5">
              <Label className="text-xs">Innhold / tittel</Label>
              <Input placeholder="F.eks. LYDPRØVE 1ETG" value={titleOverride} onChange={(e) => setTitleOverride(e.target.value)} className="h-9 text-sm uppercase" />
            </div>
          )}

          {/* Scene */}
          {showFields.has("scene") && (
            <div className="space-y-1.5">
              <Label className="text-xs">Scene / sted</Label>
              {sceneOptions.length > 0 ? (
                <Select
                  value={sceneOptions.find((s) => s.name === stageLabel)?.id ?? "__custom__"}
                  onValueChange={(v) => {
                    if (v === "__custom__") {
                      setStageLabel("");
                      return;
                    }
                    const scene = sceneOptions.find((s) => s.id === v);
                    if (scene) setStageLabel(scene.name);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Velg scene..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sceneOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">Annet (fritekst)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="F.eks. 1ETG, FOH" value={stageLabel} onChange={(e) => setStageLabel(e.target.value)} className="h-9 text-sm" />
              )}
              {sceneOptions.length > 0 && stageLabel && !sceneOptions.find((s) => s.name === stageLabel) && (
                <Input placeholder="Fritekst scene..." value={stageLabel} onChange={(e) => setStageLabel(e.target.value)} className="h-9 text-sm mt-1" />
              )}
            </div>
          )}

          {/* På scenen – performer */}
          {showFields.has("performer") && (
            <div className="space-y-2 rounded-lg border border-border/20 p-3">
              <Label className="text-xs font-semibold">På scenen</Label>
              <RadioGroup value={performerKind} onValueChange={handlePerformerKindChange} className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="entity" id="pk-entity" />
                  <Label htmlFor="pk-entity" className="text-xs cursor-pointer">Prosjekt</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="persona" id="pk-persona" />
                  <Label htmlFor="pk-persona" className="text-xs cursor-pointer">Persona</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="text" id="pk-text" />
                  <Label htmlFor="pk-text" className="text-xs cursor-pointer">Fri tekst</Label>
                </div>
              </RadioGroup>

              {performerKind === "entity" && (
                <div className="space-y-1.5">
                  <Select
                    value={performerEntityId || "__none__"}
                    onValueChange={(v) => {
                      const newId = v === "__none__" ? "" : v;
                      const selected = festivalEntities.find((e) => e.id === newId);
                      const prevName = getCurrentPerformerName();
                      setPerformerEntityId(newId);
                      if (!titleOverride || titleOverride === prevName) {
                        setTitleOverride(selected?.name ?? "");
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Velg prosjekt..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Ingen prosjekt</SelectItem>
                      {festivalEntities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {performerKind === "persona" && (
                <div className="space-y-1.5">
                  <Input
                    placeholder="Søk persona..."
                    value={personaQuery}
                    onChange={(e) => setPersonaQuery(e.target.value)}
                    className="h-9 text-sm"
                  />
                  {selectedPersonaName && (
                    <p className="text-xs text-accent font-medium">
                      Valgt: {selectedPersonaName}
                    </p>
                  )}
                  {personaResults.length > 0 && (
                    <div className="max-h-32 overflow-y-auto border border-border/20 rounded-md">
                      {personaResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors",
                            p.id === performerPersonaId && "bg-accent/10 font-medium"
                          )}
                          onClick={() => {
                            const prevName = getCurrentPerformerName();
                            setPerformerPersonaId(p.id);
                            setPersonaQuery("");
                            if (!titleOverride || titleOverride === prevName) {
                              setTitleOverride(p.name);
                            }
                          }}
                        >
                          {p.name}
                          {p.category_tags?.length ? (
                            <span className="text-[10px] text-muted-foreground ml-2">
                              {p.category_tags.slice(0, 2).join(", ")}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {performerKind === "text" && (
                <div className="space-y-1.5">
                  <Input
                    placeholder="Navn på scenen"
                    value={nameOverride}
                    onChange={(e) => setNameOverride(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Kommentar */}
          {showFields.has("note") && (
            <div className="space-y-1.5">
              <Label className="text-xs">Kommentar</Label>
              <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Interne instrukser..." rows={3} className="text-sm" />
            </div>
          )}

          {/* Kategori */}
          {showFields.has("category") && types.length > 0 && (
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

          {/* Synlighet & Status */}
          {showFields.has("visibilityStatus") && (
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
          )}

          {/* Toggles */}
          {showFields.has("toggles") && (
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
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mr-auto"
            onClick={handleCreateParallel}
          >
            + Legg til parallell rad
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={handleSubmit}>Lagre</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
