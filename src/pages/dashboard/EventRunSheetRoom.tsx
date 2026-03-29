import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ProductionBoard } from "@/components/production/ProductionBoard";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { syncRiderMissingForScope } from "@/lib/eventIssues";
import { LoadingState } from "@/components/ui/LoadingState";
import { FocusThemeProvider } from "@/contexts/FocusThemeContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
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
      <div className="finance-theme min-h-[100svh] flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="finance-theme min-h-[100svh] flex items-center justify-center">
        <p className="text-muted-foreground">Event ikke funnet.</p>
      </div>
    );
  }

  return (
    <FocusThemeProvider value="light">
    <div className="finance-theme min-h-[100svh]">
      <div className="max-w-[1400px] mx-auto px-3 py-4 md:px-6 md:py-8 space-y-6">
        <Link
          to={`/dashboard/events/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tilbake til eventet</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Produksjon
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
              {event.title} · fokusmodus
            </p>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleSyncRiders} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              Sjekk ridere
            </Button>
          )}
        </div>

        <ProductionBoard
          festivalId={null}
          eventId={id!}
          liveBasePath={`/dashboard/events/${id}/live`}
        />
      </div>
    </div>
    </FocusThemeProvider>
  );
}
