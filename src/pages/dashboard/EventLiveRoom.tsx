import { useMemo, useCallback, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { useLiveRoleFromParticipants } from "@/hooks/useLiveRole";
import { LoadingState } from "@/components/ui/LoadingState";
import { LiveHeader } from "@/components/live/LiveHeader";
import { LiveNowBlock } from "@/components/live/LiveNowBlock";
import { LiveNextBlock } from "@/components/live/LiveNextBlock";
import { LiveLaterList } from "@/components/live/LiveLaterList";
import { LivePlanDeviationStrip } from "@/components/live/LivePlanDeviationStrip";
import { toLiveCardItem } from "@/lib/runsheet-live-view-model";
import { selectLiveBuckets } from "@/lib/runsheet-live-selection";
import { selectPlannedBuckets } from "@/lib/runsheet-live-planned";
import { computeLivePlanDeviation } from "@/lib/runsheet-live-plan-deviation";
import { computeEffectiveTimeline, type LiveAction } from "@/lib/runsheet-live";
import { resolveLiveRole, getLivePermissions, assertLiveAction } from "@/lib/live-permissions";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExtendedEventProgramSlot } from "@/types/program-slots";

export default function EventLiveRoom() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading, canEdit, canViewRunsheet, festivalContext } = useEventBackstageAccess(id);
  const festivalId = festivalContext?.festival_id ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [acting, setActing] = useState(false);

  const { data: explicitRole } = useLiveRoleFromParticipants("event", id);

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

  const role = resolveLiveRole(explicitRole, {
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

  const [planNow, setPlanNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setPlanNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);

  const effectiveTimeline = useMemo(() => computeEffectiveTimeline(slots), [slots]);
  const liveItems = useMemo(
    () => slots.map((s) => toLiveCardItem(s, effectiveTimeline.get(s.id))),
    [slots, effectiveTimeline]
  );
  const buckets = useMemo(() => selectLiveBuckets(liveItems), [liveItems]);
  const plannedBuckets = useMemo(() => selectPlannedBuckets(liveItems, planNow), [liveItems, planNow]);
  const deviation = useMemo(() => computeLivePlanDeviation(buckets, plannedBuckets, planNow), [buckets, plannedBuckets, planNow]);

  const handleAction = useCallback(
    async (slotId: string, action: LiveAction) => {
      try {
        assertLiveAction(role, action);
      } catch (e: any) {
        toast({ title: "Ingen tilgang", description: e.message, variant: "destructive" });
        return;
      }

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
    [slots, id, queryClient, toast, role]
  );

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-[#050505] flex items-center justify-center">
        <LoadingState message="Laster live-visning..." />
      </div>
    );
  }

  if (!event || !perms.canView) {
    return (
      <div className="min-h-[100svh] bg-[#050505] flex items-center justify-center">
        <p className="text-white/30">Ikke tilgang til live-visning.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-[#050505] text-white">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex flex-col min-h-[100svh]">
        {/* Back link */}
        <Link
          to={`/dashboard/events/${id}`}
          className="inline-flex items-center gap-1 text-white/20 text-xs uppercase tracking-wider mb-2 active:text-white/40 transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tilbake
        </Link>

        <LiveHeader title={event.title} role={role} showAdminBadge={perms.showAdminBadge} />

        {/* Main content */}
        <div className="flex flex-col gap-8 md:gap-10 flex-1">
          <LiveNowBlock
            items={buckets.now}
            role={role}
            onAction={handleAction}
            acting={acting}
          />

          <LiveNextBlock
            items={buckets.next}
            role={role}
            onAction={handleAction}
            acting={acting}
          />

          <LiveLaterList items={buckets.later} role={role} />
        </div>
      </div>
    </div>
  );
}
