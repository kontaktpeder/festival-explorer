import { useParams, Link } from "react-router-dom";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { FestivalRunSheet } from "@/components/dashboard/FestivalRunSheet";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { Button } from "@/components/ui/button";

export default function EventRunSheetRoom() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading, canEdit } = useEventBackstageAccess(id);

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
      <FestivalRunSheet eventId={id!} readOnly={!canEdit} />
    </BackstageShell>
  );
}
