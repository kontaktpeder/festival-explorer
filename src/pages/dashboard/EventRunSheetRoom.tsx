import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ProductionBoard } from "@/components/production/ProductionBoard";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { syncRiderMissingForScope } from "@/lib/eventIssues";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EventRunSheetRoom() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading, canEdit } = useEventBackstageAccess(id);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSyncRiders = useCallback(async () => {
    setSyncing(true);
    try {
      const count = await syncRiderMissingForScope({ eventId: id });
      await queryClient.invalidateQueries({ queryKey: ["open-event-issues"] });
      await queryClient.invalidateQueries({ queryKey: ["production-board-slots"] });
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
        <LoadingState message="Laster..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Event ikke funnet.</p>
      </div>
    );
  }

  return (
    <BackstageShell
      title="Produksjon"
      subtitle={event.title}
      backTo={`/dashboard/events/${id}`}
      actions={
        canEdit ? (
          <Button variant="outline" size="sm" onClick={handleSyncRiders} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            Sjekk ridere
          </Button>
        ) : undefined
      }
    >
      <ProductionBoard
        festivalId={null}
        eventId={id!}
        liveBasePath={`/dashboard/events/${id}/live`}
      />
    </BackstageShell>
  );
}
