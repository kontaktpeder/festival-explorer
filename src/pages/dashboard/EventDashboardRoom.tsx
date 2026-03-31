import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  FileText, ClipboardList, ChevronRight, ChevronDown, ExternalLink, ArrowLeft, Radio, Wrench, UserCheck,
  Archive, ArchiveRestore, CheckCircle2, AlertTriangle, CircleX, Lock,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { useEventActors } from "@/hooks/useEventActors";
import { toast } from "sonner";

// ─── Types & helpers ───

type ModuleKey = "details" | "plan" | "actors" | "production" | "live";
type ModuleStatus = "done" | "warning" | "empty" | "locked";

interface ModuleHealth {
  key: ModuleKey;
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  status: ModuleStatus;
  primaryCta: string;
  secondary: string;
}

interface NextStep {
  id: string;
  label: string;
  to: string;
  priority: number;
}

function hasCoreDetails(event: any): boolean {
  return !!event?.title && !!event?.start_at && (!!event?.venue_id || !!event?.city);
}

function statusBadge(status: ModuleStatus) {
  switch (status) {
    case "done":
      return { label: "Ferdig", icon: CheckCircle2, className: "text-emerald-500" };
    case "warning":
      return { label: "Mangler", icon: AlertTriangle, className: "text-amber-500" };
    case "empty":
      return { label: "Tom", icon: CircleX, className: "text-destructive" };
    case "locked":
      return { label: "Låst", icon: Lock, className: "text-muted-foreground" };
  }
}

// ─── Component ───

export default function EventDashboardRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { event, isLoading, canEdit, canViewRunsheet, festivalContext } = useEventBackstageAccess(id);
  const { participants, invitations } = useEventActors(id);

  const isArchived = !!(event as any)?.archived_at;

  // ─── Slot counts ───
  const { data: slotCount = 0 } = useQuery({
    queryKey: ["event-dashboard-slot-count", id],
    enabled: !!id && (canEdit || canViewRunsheet),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_program_slots")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: slotsWithStartCount = 0 } = useQuery({
    queryKey: ["event-dashboard-slot-start-count", id],
    enabled: !!id && (canEdit || canViewRunsheet),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_program_slots")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id!)
        .not("starts_at", "is", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // ─── Archive mutation ───
  const archiveEvent = useMutation({
    mutationFn: async ({ archive }: { archive: boolean }) => {
      const { error } = await supabase.rpc("archive_event", {
        p_event_id: id!,
        p_archive: archive,
      });
      if (error) throw error;
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ["event-backstage"] });
      queryClient.invalidateQueries({ queryKey: ["admin-event", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-events-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success(archive ? "Event arkivert" : "Event gjenopprettet");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Loading / error states ───
  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster event..." />
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

  if (!canEdit && !canViewRunsheet) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Du har ikke tilgang til dette eventet.</p>
        {event.slug && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/event/${event.slug}`}>Se publikumsvisning</Link>
          </Button>
        )}
      </div>
    );
  }

  // ─── Derived counts ───
  const base = `/dashboard/events/${id}`;
  const dateStr = event.start_at
    ? new Date(event.start_at).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const detailsDone = hasCoreDetails(event);
  const activeActorCount = participants.filter((p) => p.participant_kind !== "offline").length;
  const invitationPendingCount = invitations.filter((i) => i.status === "pending").length;
  const invitationDeclinedCount = invitations.filter((i) => i.status === "declined").length;
  const invitationTotalCount = invitationPendingCount + invitationDeclinedCount;

  const productionStatus: ModuleStatus = canEdit || canViewRunsheet ? "warning" : "locked";
  const productionSecondary = canEdit || canViewRunsheet ? "Sjekk status og mangler" : "Ingen tilgang";

  // ─── Next steps ───
  const nextSteps: NextStep[] = [];
  if (!detailsDone) nextSteps.push({ id: "details", label: "Fullfør grunninfo", to: `${base}/details`, priority: 1 });
  if (slotCount === 0) nextSteps.push({ id: "plan", label: "Sett opp kjøreplan", to: `${base}/plan`, priority: 2 });
  if (activeActorCount === 0 && invitationTotalCount === 0) nextSteps.push({ id: "actors", label: "Legg til aktører", to: `${base}/actors`, priority: 3 });
  if (invitationPendingCount > 0) nextSteps.push({ id: "invite", label: "Følg opp invitasjoner", to: `${base}/actors`, priority: 4 });
  if ((canEdit || canViewRunsheet) && slotCount > 0) nextSteps.push({ id: "prod", label: "Gå gjennom produksjon", to: `${base}/run-sheet`, priority: 5 });
  if (!(slotCount > 0 && activeActorCount > 0)) nextSteps.push({ id: "live", label: "Klargjør live-visning", to: `${base}/live`, priority: 6 });
  const prioritizedSteps = nextSteps.sort((a, b) => a.priority - b.priority).slice(0, 3);

  // ─── Module health ───
  const moduleHealth: ModuleHealth[] = [
    {
      key: "details",
      title: "Detaljer",
      icon: FileText,
      to: `${base}/details`,
      status: detailsDone ? "done" : "warning",
      primaryCta: "Fullfør grunninfo",
      secondary: detailsDone ? "Grunninfo er satt" : "Mangler tittel/tid/sted",
    },
    {
      key: "plan",
      title: "Plan",
      icon: ClipboardList,
      to: `${base}/plan`,
      status: slotCount === 0 ? "empty" : slotsWithStartCount > 0 ? "done" : "warning",
      primaryCta: "Sett opp kjøreplan",
      secondary: `${slotCount} poster`,
    },
    {
      key: "actors",
      title: "Aktører",
      icon: UserCheck,
      to: `${base}/actors`,
      status:
        activeActorCount === 0 && invitationTotalCount === 0
          ? "empty"
          : activeActorCount === 0
          ? "warning"
          : "done",
      primaryCta: "Legg til folk og invitasjoner",
      secondary: `${activeActorCount} aktive · ${invitationPendingCount} invitert`,
    },
    {
      key: "production",
      title: "Produksjon",
      icon: Wrench,
      to: `${base}/run-sheet`,
      status: productionStatus,
      primaryCta: "Avklar mangler",
      secondary: productionSecondary,
    },
    {
      key: "live",
      title: "Live-visning",
      icon: Radio,
      to: `${base}/live`,
      status: slotCount > 0 && activeActorCount > 0 ? "done" : "warning",
      primaryCta: "Klargjør gjennomføring",
      secondary: slotCount > 0 && activeActorCount > 0 ? "Klar for gjennomføring" : "Krever plan + aktører",
    },
  ];

  const visibleModules = moduleHealth.filter((m) => {
    if (m.key === "details" || m.key === "plan" || m.key === "actors") return canEdit;
    if (m.key === "production" || m.key === "live") return canEdit || canViewRunsheet;
    return false;
  });

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-foreground truncate">
                  {event.title}
                </h1>
                {isArchived && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                    Arkivert
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {[dateStr, event.city].filter(Boolean).join(" · ")}
                {festivalContext?.festival && (
                  <span>
                    · {(festivalContext.festival as { name?: string }).name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border/30"
                onClick={() => archiveEvent.mutate({ archive: !isArchived })}
              >
                {isArchived ? (
                  <><ArchiveRestore className="h-3.5 w-3.5 mr-1" />Gjenopprett</>
                ) : (
                  <><Archive className="h-3.5 w-3.5 mr-1" />Arkiver</>
                )}
              </Button>
            )}
            {event.slug && (
              <Button asChild variant="outline" size="sm" className="text-xs border-border/30 hover:border-accent/40">
                <Link to={`/event/${event.slug}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Se live
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-6">
        {/* Next steps panel */}
        {prioritizedSteps.length > 0 && (
          <div className="rounded-xl border border-border/30 bg-card/40 p-5">
            <div className="mb-3">
              <p className="text-xs font-medium text-foreground">Neste steg</p>
              <p className="text-[11px] text-muted-foreground">Dette bør du gjøre nå</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {prioritizedSteps.map((s) => (
                <Link
                  key={s.id}
                  to={s.to}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium px-3 py-1.5 transition-colors"
                >
                  <ChevronRight className="h-3 w-3" />
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {prioritizedSteps.length === 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Alt ser bra ut. Du er klar for gjennomføring.
            </p>
          </div>
        )}

        {/* Module grid */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-4">
            Moduler
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleModules.map((mod) => {
              const Icon = mod.icon;
              const badge = statusBadge(mod.status);
              const StatusIcon = badge.icon;
              return (
                <Link
                  key={mod.key}
                  to={mod.to}
                  className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${badge.className}`} />
                      <span className={`text-[10px] font-medium ${badge.className}`}>{badge.label}</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-foreground">{mod.title}</h3>
                  <p className="text-xs text-accent/80 mt-0.5">{mod.primaryCta}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{mod.secondary}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
