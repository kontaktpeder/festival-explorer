import { useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import type { Database } from "@/integrations/supabase/types";

type EventIssueRow = Database["public"]["Tables"]["event_issue"]["Row"];

export default function EventRunSheetRoom() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading, canEdit } = useEventBackstageAccess(id);
  const [replaceIssue, setReplaceIssue] = useState<EventIssueRow | null>(null);

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

  const scrollToSlot = useCallback((slotId: string) => {
    const el = document.getElementById(`runsheet-slot-${slotId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background"), 2500);
  }, []);

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
        <ProductionHealthBar issues={openIssues} />

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
          />
        )}

        <FestivalRunSheet eventId={id!} readOnly={!canEdit} />
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
