import { useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { FestivalRunSheet } from "@/components/dashboard/FestivalRunSheet";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { useOpenEventIssues } from "@/hooks/useOpenEventIssues";
import { useMyOpenIssues } from "@/hooks/useMyOpenIssues";
import { ProductionHealthBar } from "@/components/production/ProductionHealthBar";
import { OpenIssuesList, type IssueSlotContext } from "@/components/production/OpenIssuesList";
import { FindReplacementModal } from "@/components/production/FindReplacementModal";
import { syncRiderMissingForScope } from "@/lib/eventIssues";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type EventIssueRow = Database["public"]["Tables"]["event_issue"]["Row"];

export default function EventRunSheetRoom() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading, canEdit, festivalContext } = useEventBackstageAccess(id);
  const festivalId = festivalContext?.festival_id ?? null;
  const { data: canOperate = false } = useQuery({
    queryKey: ["can-operate-runsheet-slot", festivalId, id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.rpc("can_operate_runsheet_slot" as any, {
        p_festival_id: festivalId,
        p_event_id: id!,
      });
      return !!data;
    },
  });
  const [replaceIssue, setReplaceIssue] = useState<EventIssueRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: openIssues = [] } = useOpenEventIssues({
    festivalId: null,
    eventId: id ?? null,
  });

  const { data: myIssues = [] } = useMyOpenIssues({
    festivalId: null,
    eventId: id ?? null,
  });

  // Entity options for FindReplacementModal (from event participants + slots)
  const { data: eventEntities = [] } = useQuery({
    queryKey: ["event-entities-for-replacement", id],
    enabled: !!id,
    queryFn: async () => {
      const [participantsRes, legacyRes, slotsRes] = await Promise.all([
        supabase.from("event_participants").select("participant_kind, participant_id").eq("event_id", id!),
        supabase.from("event_entities").select("entity_id").eq("event_id", id!),
        supabase.from("event_program_slots").select("performer_entity_id").eq("event_id", id!),
      ]);
      const entityIds = new Set<string>();
      (participantsRes.data ?? []).forEach((p: any) => {
        if (p.participant_kind === "entity") entityIds.add(p.participant_id);
      });
      (legacyRes.data ?? []).forEach((r: any) => r.entity_id && entityIds.add(r.entity_id));
      (slotsRes.data ?? []).forEach((s: any) => s.performer_entity_id && entityIds.add(s.performer_entity_id));
      if (!entityIds.size) return [];
      const { data } = await supabase.from("entities").select("id, name").in("id", [...entityIds]);
      return (data ?? []).map((e: any) => ({ id: e.id, name: e.name }));
    },
  });

  // Build issue context from related slots
  const slotIds = useMemo(() => openIssues.map((i) => i.related_program_slot_id), [openIssues]);
  const { data: issueSlots = [] } = useQuery({
    queryKey: ["issue-slot-context-event", slotIds],
    enabled: slotIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_program_slots")
        .select("id, stage_label, slot_kind, performer_entity_id, performer_name_override, performer_entity:entities!event_program_slots_performer_entity_id_fkey(name)")
        .in("id", slotIds);
      return data ?? [];
    },
  });
  const issueContextBySlotId = useMemo(() => {
    const map: Record<string, IssueSlotContext> = {};
    for (const s of issueSlots) {
      map[s.id] = {
        performerName: (s as any).performer_entity?.name ?? s.performer_name_override ?? undefined,
        stageLabel: s.stage_label ?? undefined,
        slotKind: s.slot_kind ?? undefined,
      };
    }
    return map;
  }, [issueSlots]);

  const scrollToSlot = useCallback((slotId: string) => {
    const el = document.getElementById(`runsheet-slot-${slotId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background"), 2500);
  }, []);

  const handleSyncRiders = useCallback(async () => {
    setSyncing(true);
    try {
      const count = await syncRiderMissingForScope({ eventId: id });
      await queryClient.invalidateQueries({ queryKey: ["open-event-issues"] });
      await queryClient.invalidateQueries({ queryKey: ["my-open-event-issues"] });
      toast({ title: `Sjekket ${count} poster for manglende rider` });
    } catch (e: any) {
      toast({ title: "Feil", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [id, queryClient, toast]);

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster kjøreplan..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Event ikke funnet.</p>
      </div>
    );
  }

  return (
    <BackstageShell
      title="Kjøreplan"
      subtitle={event.title}
      backTo={`/dashboard/events/${id}`}
      externalLink={
        event.slug
          ? { to: `/event/${event.slug}`, label: "Se live" }
          : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <ProductionHealthBar issues={openIssues} />
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleSyncRiders} disabled={syncing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              Sjekk ridere
            </Button>
          )}
        </div>

        {myIssues.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
            <p className="text-xs font-medium text-primary mb-1">
              Dine åpne saker ({myIssues.length})
            </p>
            <div className="space-y-1">
              {myIssues.map((i) => (
                <p key={i.id} className="text-xs text-muted-foreground">
                  {i.type.replace(/_/g, " ")} · {i.severity}
                </p>
              ))}
            </div>
          </div>
        )}

        {openIssues.length > 0 && (
          <OpenIssuesList
            issues={openIssues}
            onFindReplacement={(issue) => setReplaceIssue(issue)}
            onScrollToSlot={scrollToSlot}
            issueContextBySlotId={issueContextBySlotId}
          />
        )}

        <FestivalRunSheet eventId={id!} readOnly={!canEdit} canOperate={canOperate} />
      </div>

      <FindReplacementModal
        open={!!replaceIssue}
        onOpenChange={(v) => !v && setReplaceIssue(null)}
        issue={replaceIssue}
        runsheetQueryKey={["event-run-sheet", id]}
        entityOptions={eventEntities}
      />
    </BackstageShell>
  );
}
