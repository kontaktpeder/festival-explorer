import { useState } from "react";
import { useParams } from "react-router-dom";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { FestivalRunSheet } from "@/components/dashboard/FestivalRunSheet";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { useOpenEventIssues } from "@/hooks/useOpenEventIssues";
import { ProductionHealthBar } from "@/components/production/ProductionHealthBar";
import { OpenIssuesList } from "@/components/production/OpenIssuesList";
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
        {openIssues.length > 0 && (
          <>
            <ProductionHealthBar issues={openIssues} />
            <OpenIssuesList
              issues={openIssues}
              onFindReplacement={(issue) => setReplaceIssue(issue)}
            />
          </>
        )}

        <FestivalRunSheet eventId={id!} readOnly={!canEdit} />
      </div>

      <FindReplacementModal
        open={!!replaceIssue}
        onOpenChange={(v) => !v && setReplaceIssue(null)}
        issue={replaceIssue}
        runsheetQueryKey={["event-run-sheet", id]}
        entityOptions={[]}
      />
    </BackstageShell>
  );
}
