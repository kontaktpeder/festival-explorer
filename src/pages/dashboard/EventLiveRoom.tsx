import { useMemo, useCallback, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { LoadingState } from "@/components/ui/LoadingState";
import { LiveHeader } from "@/components/live/LiveHeader";
import { LiveNowBlock } from "@/components/live/LiveNowBlock";
import { LiveNextBlock } from "@/components/live/LiveNextBlock";
import { LiveLaterList } from "@/components/live/LiveLaterList";
import { LiveActionBar } from "@/components/live/LiveActionBar";
import { toLiveCardItem } from "@/lib/runsheet-live-view-model";
import { selectLiveBuckets } from "@/lib/runsheet-live-selection";
import { computeEffectiveTimeline, type LiveAction } from "@/lib/runsheet-live";
import { deriveLiveRole, getLivePermissions } from "@/lib/live-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExtendedEventProgramSlot } from "@/types/program-slots";

export default function EventLiveRoom() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading, canEdit, canViewRunsheet, festivalContext } = useEventBackstageAccess(id);
  const festivalId = festivalContext?.festival_id ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [acting, setActing] = useState(false);

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

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin-live"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    },
  });

  const role = deriveLiveRole({
    canViewRunsheet: canViewRunsheet ?? false,
    canOperateRunsheet: canOperate,
    canEdit: canEdit ?? false,
    isAdmin,
  });
  const perms = getLivePermissions(role);

  const { data: slots = [] } = useQuery({
    queryKey: ["event-live-slots", id],
    enabled: !!id,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_program_slots")
        .select(
          "*, performer_entity:entities!event_program_slots_performer_entity_id_fkey(id, name, slug, is_published), performer_persona:personas!event_program_slots_performer_persona_id_fkey(id, name, slug, is_public)"
        )
        .eq("event_id", id!)
        .order("starts_at");
      return (data ?? []) as ExtendedEventProgramSlot[];
    },
  });

  const effectiveTimeline = useMemo(() => computeEffectiveTimeline(slots), [slots]);
  const liveItems = useMemo(
    () => slots.map((s) => toLiveCardItem(s, effectiveTimeline.get(s.id))),
    [slots, effectiveTimeline]
  );
  const buckets = useMemo(() => selectLiveBuckets(liveItems), [liveItems]);

  const handleAction = useCallback(
    async (slotId: string, action: LiveAction) => {
      setActing(true);
      try {
        const now = new Date().toISOString();
        let update: Record<string, unknown> = {};
        if (action === "start") {
          update = { live_status: "in_progress", actual_started_at: now };
        } else if (action === "complete") {
          update = { live_status: "completed", actual_ended_at: now, completed_at: now };
        } else if (action === "delay5") {
          const slot = slots.find((s) => s.id === slotId);
          update = { delay_minutes: (slot?.delay_minutes ?? 0) + 5 };
        } else if (action === "cancel") {
          update = { live_status: "cancelled", is_canceled: true };
        }
        const { error } = await supabase
          .from("event_program_slots")
          .update(update)
          .eq("id", slotId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["event-live-slots", id] });
      } catch (e: any) {
        toast({ title: "Feil", description: e.message, variant: "destructive" });
      } finally {
        setActing(false);
      }
    },
    [slots, id, queryClient, toast]
  );

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster live-visning..." />
      </div>
    );
  }

  if (!event || !perms.canView) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ikke tilgang til live-visning.</p>
      </div>
    );
  }

  const ROLE_LABELS: Record<string, string> = {
    viewer: "Leser",
    crew: "Crew",
    editor: "Editor",
    admin: "Admin",
  };

  const showActions = perms.canStartDelayComplete || perms.canCancel;

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/dashboard/events/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Tilbake
            </Link>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {perms.showAdminBadge && (
              <Badge variant="destructive" className="text-[10px]">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              {ROLE_LABELS[role] ?? role}
            </Badge>
          </div>
        </div>

        <LiveHeader title={event.title} />

        <div className="space-y-6">
          <div>
            <LiveNowBlock items={buckets.now} showNotes={perms.canSeeNotes} />
            {showActions && buckets.now.length > 0 && (
              <div className="mt-2 space-y-1">
                {buckets.now.map((item) => (
                  <LiveActionBar
                    key={item.id}
                    slotId={item.id}
                    liveStatus={item.liveStatus}
                    canStartDelayComplete={perms.canStartDelayComplete}
                    canCancel={perms.canCancel}
                    onAction={handleAction}
                    disabled={acting}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <LiveNextBlock items={buckets.next} showNotes={perms.canSeeNotes} />
            {showActions && buckets.next.length > 0 && (
              <div className="mt-2 space-y-1">
                {buckets.next.map((item) => (
                  <LiveActionBar
                    key={item.id}
                    slotId={item.id}
                    liveStatus={item.liveStatus}
                    canStartDelayComplete={perms.canStartDelayComplete}
                    canCancel={perms.canCancel}
                    onAction={handleAction}
                    disabled={acting}
                  />
                ))}
              </div>
            )}
          </div>

          <LiveLaterList items={buckets.later} />
        </div>
      </div>
    </div>
  );
}
