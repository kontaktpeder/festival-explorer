// v1: Link performer to existing slot only — no new slots created.
// TODO: When DB has contributor_role (Artist|Gjest|…), add type selector here.

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExtendedEventProgramSlot, PerformerKind } from "@/types/program-slots";
import { slotsEligibleForPerformerLink } from "@/lib/production-board-mappers";
import { usePersonaSearch } from "@/hooks/usePersonaSearch";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FocusDialogContent, FocusSelectContent } from "@/components/ui/focus-overlays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateSlots: ExtendedEventProgramSlot[];
  festivalEntities?: { id: string; name: string; slug: string }[];
  festivalId: string | null;
  eventId: string | null;
  onSaved: () => void;
}

export function AddPerformerToSlotDialog({
  open,
  onOpenChange,
  candidateSlots,
  festivalEntities = [],
  festivalId,
  eventId,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const eligible = useMemo(
    () => slotsEligibleForPerformerLink(candidateSlots),
    [candidateSlots],
  );

  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [performerKind, setPerformerKind] = useState<PerformerKind>("entity");
  const [performerEntityId, setPerformerEntityId] = useState("");
  const [performerPersonaId, setPerformerPersonaId] = useState("");
  const [personaQuery, setPersonaQuery] = useState("");
  const [nameOverride, setNameOverride] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: personaResults = [] } = usePersonaSearch({
    query: personaQuery,
    mode: "all",
    enabled: performerKind === "persona" && open,
  });

  const selectedPersonaName = useMemo(() => {
    if (!performerPersonaId) return null;
    return personaResults.find((p) => p.id === performerPersonaId)?.name || null;
  }, [performerPersonaId, personaResults]);

  const canSave =
    selectedSlotId &&
    ((performerKind === "entity" && performerEntityId) ||
      (performerKind === "persona" && performerPersonaId) ||
      (performerKind === "text" && nameOverride.trim()));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        performer_kind: performerKind,
        performer_entity_id: performerKind === "entity" ? performerEntityId : null,
        performer_persona_id: performerKind === "persona" ? performerPersonaId : null,
        performer_name_override: performerKind === "text" ? nameOverride.trim() : null,
      };
      const { error } = await supabase
        .from("event_program_slots")
        .update(payload)
        .eq("id", selectedSlotId);
      if (error) throw error;

      await queryClient.invalidateQueries({
        queryKey: ["production-board-slots", festivalId, eventId],
      });
      toast({ title: "Medvirkende koblet til post" });
      onSaved();
      onOpenChange(false);
      // Reset
      setSelectedSlotId("");
      setPerformerEntityId("");
      setPerformerPersonaId("");
      setNameOverride("");
      setPersonaQuery("");
    } catch (e: any) {
      toast({ title: "Feil", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const slotLabel = (s: ExtendedEventProgramSlot) => {
    const time = s.starts_at
      ? format(new Date(s.starts_at), "HH:mm", { locale: nb })
      : "—";
    const title = s.title_override || s.slot_kind;
    const scene = s.stage_label ? ` · ${s.stage_label}` : "";
    return `${time} – ${title}${scene}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FocusDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Legg til medvirkende</DialogTitle>
        </DialogHeader>

        {eligible.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Alle poster har allerede en medvirkende.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Opprett først en ny post i Plan, deretter kan du koble medvirkende her.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Slot picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Velg planpost</Label>
              <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Velg post..." />
                </SelectTrigger>
                <FocusSelectContent>
                  {eligible.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {slotLabel(s)}
                    </SelectItem>
                  ))}
                </FocusSelectContent>
              </Select>
            </div>

            {/* Performer kind */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Koble til medvirkende</Label>
              <RadioGroup
                value={performerKind}
                onValueChange={(v) => setPerformerKind(v as PerformerKind)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="entity" id="ap-entity" />
                  <Label htmlFor="ap-entity" className="text-xs cursor-pointer">
                    Prosjekt
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="persona" id="ap-persona" />
                  <Label htmlFor="ap-persona" className="text-xs cursor-pointer">
                    Persona
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="text" id="ap-text" />
                  <Label htmlFor="ap-text" className="text-xs cursor-pointer">
                    Fri tekst
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Entity picker */}
            {performerKind === "entity" && (
              <div className="space-y-1.5">
                <Select value={performerEntityId || "__none__"} onValueChange={(v) => setPerformerEntityId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Velg prosjekt..." />
                  </SelectTrigger>
                  <FocusSelectContent>
                    <SelectItem value="__none__">Ingen valgt</SelectItem>
                    {festivalEntities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </FocusSelectContent>
                </Select>
              </div>
            )}

            {/* Persona search */}
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
                          p.id === performerPersonaId && "bg-accent/10 font-medium",
                        )}
                        onClick={() => {
                          setPerformerPersonaId(p.id);
                          setPersonaQuery("");
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Free text */}
            {performerKind === "text" && (
              <Input
                placeholder="Navn på medvirkende"
                value={nameOverride}
                onChange={(e) => setNameOverride(e.target.value)}
                className="h-9 text-sm"
              />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          {eligible.length > 0 && (
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Lagrer..." : "Koble"}
            </Button>
          )}
        </DialogFooter>
      </FocusDialogContent>
    </Dialog>
  );
}
