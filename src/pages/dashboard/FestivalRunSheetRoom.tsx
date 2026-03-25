import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ProductionBoard } from "@/components/production/ProductionBoard";
import { syncRiderMissingForScope } from "@/lib/eventIssues";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FestivalRunSheetRoom() {
  const { id } = useParams<{ id: string }>();
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const { data: canOperate = false } = useQuery({
    queryKey: ["can-operate-runsheet-festival", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.rpc("can_operate_runsheet_festival" as any, { p_festival_id: id! });
      return !!data;
    },
  });

  const handleSyncRiders = useCallback(async () => {
    setSyncing(true);
    try {
      const count = await syncRiderMissingForScope({ festivalId: id });
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

  return (
    <BackstageShell
      title="Produksjon"
      subtitle={festival?.name}
      backTo={`/dashboard/festival/${id}`}
      actions={
        canOperate ? (
          <Button variant="outline" size="sm" onClick={handleSyncRiders} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            Sjekk ridere
          </Button>
        ) : undefined
      }
    >
      <ProductionBoard
        festivalId={id!}
        eventId={null}
        liveBasePath={`/dashboard/festival/${id}/live`}
      />
    </BackstageShell>
  );
}
