import { useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { FestivalRunSheet } from "@/components/dashboard/FestivalRunSheet";
import { useOpenEventIssues } from "@/hooks/useOpenEventIssues";
import { useMyOpenIssues } from "@/hooks/useMyOpenIssues";
import { ProductionHealthBar } from "@/components/production/ProductionHealthBar";
import { OpenIssuesList, type IssueSlotContext } from "@/components/production/OpenIssuesList";
import { FindReplacementModal } from "@/components/production/FindReplacementModal";
import { useFestivalSubjects } from "@/hooks/useFestivalSubjects";
import type { Database } from "@/integrations/supabase/types";

type EventIssueRow = Database["public"]["Tables"]["event_issue"]["Row"];

export default function FestivalRunSheetRoom() {
  const { id } = useParams<{ id: string }>();
  const [replaceIssue, setReplaceIssue] = useState<EventIssueRow | null>(null);

  const { data: festival, isLoading } = useQuery({
    queryKey: ["festival-shell", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: openIssues = [] } = useOpenEventIssues({
    festivalId: id ?? null,
    eventId: null,
  });

  const { data: myIssues = [] } = useMyOpenIssues({
    festivalId: id ?? null,
    eventId: null,
  });

  const { data: festivalSubjects = [] } = useFestivalSubjects(id ?? null);
  const entityOptions = festivalSubjects
    .filter((s: any) => s.kind === "entity")
    .map((s: any) => ({ id: s.id, name: s.name }));

  // Build issue context from related slots
  const slotIds = useMemo(() => openIssues.map((i) => i.related_program_slot_id), [openIssues]);
  const { data: issueSlots = [] } = useQuery({
    queryKey: ["issue-slot-context", slotIds],
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

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  return (
    <BackstageShell
      title="Kjøreplan"
      subtitle={festival?.name}
      backTo={`/dashboard/festival/${id}`}
      externalLink={
        festival?.slug
          ? { to: `/festival/${festival.slug}`, label: "Se live" }
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

        <OpenIssuesList
          issues={openIssues}
          onFindReplacement={(issue) => setReplaceIssue(issue)}
          onScrollToSlot={scrollToSlot}
        />

        <FestivalRunSheet festivalId={id!} />
      </div>

      <FindReplacementModal
        open={!!replaceIssue}
        onOpenChange={(v) => !v && setReplaceIssue(null)}
        issue={replaceIssue}
        runsheetQueryKey={["festival-run-sheet", id]}
        entityOptions={entityOptions}
      />
    </BackstageShell>
  );
}
