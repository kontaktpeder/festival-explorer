import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  FileText, ClipboardList, ChevronRight, ExternalLink, ArrowLeft, Radio, Wrench, UserCheck,
  Archive, ArchiveRestore, CheckCircle2, AlertTriangle, CircleDot, Lock, X,
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

type ModuleKey = "details" | "program" | "actors" | "production" | "live";
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

type StageKey = "forbered" | "gjennomfor" | "grunnlag";

interface Stage {
  key: StageKey;
  title: string;
  description: string;
  moduleKeys: ModuleKey[];
}

const STAGES: Stage[] = [
  {
    key: "forbered",
    title: "Forbered",
    description: "Før eventet — få alt klart",
    moduleKeys: ["program", "production"],
  },
  {
    key: "gjennomfor",
    title: "Gjennomfør",
    description: "Under eventet — styr det live",
    moduleKeys: ["live"],
  },
  {
    key: "grunnlag",
    title: "Grunnlag",
    description: "Grunnlag og tilgang",
    moduleKeys: ["details", "actors"],
  },
];

function hasCoreDetails(event: any): boolean {
  return !!event?.title && !!event?.start_at && (!!event?.venue_id || !!event?.city);
}

function statusPresentation(status: ModuleStatus) {
  switch (status) {
    case "done":
      return { label: "Klar", icon: CheckCircle2, className: "text-emerald-400" };
    case "warning":
      return { label: "Pågår", icon: AlertTriangle, className: "text-amber-400" };
    case "empty":
      return { label: "Ikke startet", icon: CircleDot, className: "text-muted-foreground" };
    case "locked":
      return { label: "Låst", icon: Lock, className: "text-muted-foreground/50" };
  }
}

// ─── Component ───

export default function EventDashboardRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { event, isLoading, canEdit, canViewRunsheet, festivalContext } = useEventBackstageAccess(id);
  const { participants, invitations } = useEventActors(id);
  const [showIntro, setShowIntro] = useState(true);

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

  // ─── Module health ───
  const moduleHealth: ModuleHealth[] = [
    {
      key: "details",
      title: "Detaljer",
      icon: FileText,
      to: `${base}/details`,
      status: detailsDone ? "done" : "warning",
      primaryCta: "Rediger info, tid, sted",
      secondary: detailsDone ? "Grunninfo er satt" : "Mangler tittel/tid/sted",
    },
    {
      key: "program",
      title: "Program",
      icon: ClipboardList,
      to: `${base}/plan`,
      status: slotCount === 0 ? "empty" : slotsWithStartCount > 0 ? "done" : "warning",
      primaryCta: `${slotCount} poster`,
      secondary: slotCount === 0 ? "Ingen poster ennå" : `${slotsWithStartCount} med tidspunkt`,
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
      primaryCta: "Administrer deltakere og invitasjoner",
      secondary: activeActorCount > 0 || invitationPendingCount > 0
        ? `${activeActorCount} aktive · ${invitationPendingCount} invitert`
        : "Ingen aktører ennå",
    },
    {
      key: "production",
      title: "Produksjon",
      icon: Wrench,
      to: `${base}/run-sheet`,
      status: productionStatus,
      primaryCta: "Gå gjennom",
      secondary: productionSecondary,
    },
    {
      key: "live",
      title: "Live-visning",
      icon: Radio,
      to: `${base}/live`,
      status: slotCount > 0 && activeActorCount > 0 ? "done" : "warning",
      primaryCta: slotCount > 0 && activeActorCount > 0 ? "Åpne live" : "Klargjør gjennomføring",
      secondary: slotCount > 0 && activeActorCount > 0 ? "Klar for gjennomføring" : "Krever program + aktører",
    },
  ];

  const canSeeModule = (key: ModuleKey) => {
    if (key === "details" || key === "program" || key === "actors") return canEdit;
    if (key === "production" || key === "live") return canEdit || canViewRunsheet;
    return false;
  };

  // Build stages with visible modules only
  const visibleStages = STAGES
    .map((stage) => ({
      ...stage,
      modules: stage.moduleKeys
        .map((k) => moduleHealth.find((m) => m.key === k)!)
        .filter((m) => m && canSeeModule(m.key)),
    }))
    .filter((stage) => stage.modules.length > 0);

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

      {/* Main content — timeline journey */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10">

        {/* Intro block */}
        {showIntro && (
          <div className="mb-8 lg:mb-10 flex items-start gap-3 max-w-2xl">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sett opp program og folk først — så er du klar til å kjøre live.
            </p>
            <button
              onClick={() => setShowIntro(false)}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 mt-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Desktop: horizontal timeline (lg+) ── */}
        <div className="hidden lg:block">
          {/* Timeline rail */}
          <div className="relative">
            {/* Horizontal connector line */}
            <div className="absolute top-[18px] left-0 right-0 h-px bg-border/20" />

            <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleStages.length}, 1fr)` }}>
              {visibleStages.map((stage, stageIdx) => {
                const isLast = stageIdx === visibleStages.length - 1;
                const isGrunnlag = stage.key === "grunnlag";

                return (
                  <div key={stage.key} className="relative">
                    {/* Stage dot + connector */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`relative z-10 h-[10px] w-[10px] rounded-full border-2 shrink-0 ${
                        isGrunnlag
                          ? "border-muted-foreground/30 bg-muted"
                          : "border-accent/60 bg-accent/20"
                      }`} />
                      {!isLast && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground/20 shrink-0" />
                      )}
                    </div>

                    {/* Stage heading */}
                    <div className="mb-5 pr-6">
                      <h2 className={`text-lg font-semibold tracking-tight ${
                        isGrunnlag ? "text-muted-foreground/70" : "text-foreground"
                      }`}>
                        {stage.title}
                      </h2>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {stage.description}
                      </p>
                    </div>

                    {/* Module items */}
                    <div className="space-y-2 pr-6">
                      {stage.modules.map((mod) => (
                        <TimelineModuleItem key={mod.key} mod={mod} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Mobile: vertical timeline (< lg) ── */}
        <div className="lg:hidden space-y-0">
          {visibleStages.map((stage, stageIdx) => {
            const isLast = stageIdx === visibleStages.length - 1;
            const isGrunnlag = stage.key === "grunnlag";

            return (
              <div key={stage.key} className="relative flex gap-4">
                {/* Vertical rail */}
                <div className="flex flex-col items-center shrink-0 w-5">
                  <div className={`h-[10px] w-[10px] rounded-full border-2 shrink-0 mt-1 ${
                    isGrunnlag
                      ? "border-muted-foreground/30 bg-muted"
                      : "border-accent/60 bg-accent/20"
                  }`} />
                  {!isLast && (
                    <div className="flex-1 w-px bg-border/15 mt-2 mb-2" />
                  )}
                </div>

                {/* Stage content */}
                <div className={`flex-1 ${isLast ? "pb-0" : "pb-8"}`}>
                  <div className="mb-3">
                    <h2 className={`text-base font-semibold tracking-tight ${
                      isGrunnlag ? "text-muted-foreground/70" : "text-foreground"
                    }`}>
                      {stage.title}
                    </h2>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {stage.description}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {stage.modules.map((mod) => (
                      <TimelineModuleItem key={mod.key} mod={mod} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ─── Module item (shared between desktop + mobile) ───

function TimelineModuleItem({ mod }: { mod: ModuleHealth }) {
  const badge = statusPresentation(mod.status);
  const StatusIcon = badge.icon;
  const Icon = mod.icon;

  return (
    <Link
      to={mod.to}
      className="group flex items-center gap-4 rounded-lg border border-border/10 bg-card/20 hover:bg-card/50 hover:border-border/25 px-4 py-3.5 transition-all duration-200"
    >
      {/* Icon */}
      <div className="h-8 w-8 rounded-md bg-secondary/60 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground/70" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{mod.title}</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${badge.className}`}>
            <StatusIcon className="h-3 w-3" />
            {badge.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{mod.primaryCta}</p>
      </div>

      {/* Action hint */}
      <span className="text-[11px] text-muted-foreground/40 group-hover:text-accent transition-colors shrink-0 hidden sm:inline">
        Åpne
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-accent/60 transition-colors shrink-0" />
    </Link>
  );
}
