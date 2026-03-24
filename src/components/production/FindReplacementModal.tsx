import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { completeFindReplacementFlow } from "@/lib/eventIssues";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type EventIssueRow = Database["public"]["Tables"]["event_issue"]["Row"];
type SlotRow = Database["public"]["Tables"]["event_program_slots"]["Row"];

export function FindReplacementModal(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  issue: EventIssueRow | null;
  runsheetQueryKey: unknown[];
  entityOptions: { id: string; name: string }[];
}) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: cancelledSlot } = useQuery({
    queryKey: ["program-slot", props.issue?.related_program_slot_id],
    enabled: !!props.issue?.related_program_slot_id && props.open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_program_slots")
        .select("*")
        .eq("id", props.issue!.related_program_slot_id)
        .single();
      if (error) throw error;
      return data as SlotRow;
    },
  });

  useEffect(() => {
    if (!props.open) setSelectedEntityId(null);
  }, [props.open]);

  const replace = useMutation({
    mutationFn: async () => {
      if (!props.issue || !cancelledSlot || !selectedEntityId)
        throw new Error("Mangler data");

      const s = cancelledSlot;
      const newSlot: Record<string, unknown> = {
        festival_id: s.festival_id,
        event_id: s.event_id,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        duration_minutes: s.duration_minutes,
        stage_label: s.stage_label,
        slot_kind: s.slot_kind,
        slot_type: s.slot_type,
        visibility: s.visibility,
        is_visible_public: s.is_visible_public,
        internal_status: s.internal_status,
        internal_note: s.internal_note,
        source: s.source,
        performer_kind: s.performer_kind,
        performer_entity_id: selectedEntityId,
        performer_persona_id: null,
        title_override: s.title_override,
        is_canceled: false,
        parallel_group_id: s.parallel_group_id,
        sequence_number: s.sequence_number,
      };

      return completeFindReplacementFlow({
        issueId: props.issue.id,
        newSlot,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: props.runsheetQueryKey as string[] });
      await qc.invalidateQueries({ queryKey: ["open-event-issues"] });
      await qc.invalidateQueries({ queryKey: ["my-open-event-issues"] });
      props.onOpenChange(false);
    },
  });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finn erstatter</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Velg artist (entity). Ny rad opprettes i kjøreplanen; avlysningen
          blir liggende som historikk.
        </p>

        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {props.entityOptions.map((e) => (
            <button
              key={e.id}
              className={`w-full text-left rounded-md px-3 py-2 text-sm border transition-colors ${
                selectedEntityId === e.id
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border bg-muted/30 hover:bg-muted/60"
              }`}
              onClick={() => setSelectedEntityId(e.id)}
            >
              {e.name}
            </button>
          ))}
          {props.entityOptions.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Ingen tilgjengelige artister
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            disabled={!selectedEntityId || replace.isPending}
            onClick={() => replace.mutate()}
          >
            {replace.isPending ? "Legger til..." : "Legg til erstatter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
