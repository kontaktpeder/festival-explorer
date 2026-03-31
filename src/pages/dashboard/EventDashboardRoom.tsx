import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FocusThemeProvider } from "@/contexts/FocusThemeContext";
import {
  FileText, ClipboardList, ChevronRight, ExternalLink, ArrowLeft, Radio, Wrench, UserCheck,
  Archive, ArchiveRestore, CheckCircle2, CircleDot, Lock, X,
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
  /** Micro-direction hint shown on hover */
  hint?: string;
}

type StageKey = "forbered" | "gjennomfor" | "grunnlag";

interface Stage {
  key: StageKey;
  title: string;
  description: string;
  moduleKeys: ModuleKey[];
}

const STAGES: Stage[] = [
  { key: "forbered", title: "Forbered", description: "Før eventet — få alt klart", moduleKeys: ["program", "production"] },
  { key: "gjennomfor", title: "Gjennomfør", description: "Under eventet — styr det live", moduleKeys: ["live"] },
  { key: "grunnlag", title: "Grunnlag", description: "Grunnlag og tilgang", moduleKeys: ["details", "actors"] },
];

function hasCoreDetails(event: any): boolean {
  return !!event?.title && !!event?.start_at && (!!event?.venue_id || !!event?.city);
}

function stageProgress(modules: ModuleHealth[]): "done" | "active" | "pending" {
  if (modules.every((m) => m.status === "done")) return "done";
  if (modules.some((m) => m.status === "done" || m.status === "warning")) return "active";
  return "pending";
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
    ? new Date(event.start_at).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const detailsDone = hasCoreDetails(event);
  const activeActorCount = participants.filter((p) => p.participant_kind !== "offline").length;
  const invitationPendingCount = invitations.filter((i) => i.status === "pending").length;
  const invitationTotalCount = invitationPendingCount + invitations.filter((i) => i.status === "declined").length;

  const productionStatus: ModuleStatus = canEdit || canViewRunsheet ? "warning" : "locked";
  const productionSecondary = canEdit || canViewRunsheet ? "Sjekk status og mangler" : "Ingen tilgang";

  // ─── Module health ───
  const moduleHealth: ModuleHealth[] = [
    {
      key: "details", title: "Detaljer", icon: FileText, to: `${base}/details`,
      status: detailsDone ? "done" : "warning",
      primaryCta: "Rediger info, tid, sted",
      secondary: detailsDone ? "Grunninfo er satt" : "Mangler tittel/tid/sted",
    },
    {
      key: "program", title: "Program", icon: ClipboardList, to: `${base}/plan`,
      status: slotCount === 0 ? "empty" : slotsWithStartCount > 0 ? "done" : "warning",
      primaryCta: `${slotCount} poster`,
      secondary: slotCount === 0 ? "Ingen poster ennå" : `${slotsWithStartCount} med tidspunkt`,
      hint: slotCount === 0 ? "Fortsett her" : undefined,
    },
    {
      key: "actors", title: "Aktører", icon: UserCheck, to: `${base}/actors`,
      status: activeActorCount === 0 && invitationTotalCount === 0 ? "empty" : activeActorCount === 0 ? "warning" : "done",
      primaryCta: "Administrer deltakere og invitasjoner",
      secondary: activeActorCount > 0 || invitationPendingCount > 0 ? `${activeActorCount} aktive · ${invitationPendingCount} invitert` : "Ingen aktører ennå",
    },
    {
      key: "production", title: "Produksjon", icon: Wrench, to: `${base}/run-sheet`,
      status: productionStatus, primaryCta: "Gå gjennom", secondary: productionSecondary,
      hint: productionStatus === "warning" ? "Neste steg" : undefined,
    },
    {
      key: "live", title: "Live-visning", icon: Radio, to: `${base}/live`,
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

  const visibleStages = STAGES
    .map((stage) => ({
      ...stage,
      modules: stage.moduleKeys.map((k) => moduleHealth.find((m) => m.key === k)!).filter((m) => m && canSeeModule(m.key)),
    }))
    .filter((stage) => stage.modules.length > 0);

  return (
    <FocusThemeProvider value="light">
    <div className="finance-theme min-h-[100svh]">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground shrink-0 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-foreground truncate">{event.title}</h1>
                {isArchived && <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">Arkivert</Badge>}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {[dateStr, event.city].filter(Boolean).join(" · ")}
                {festivalContext?.festival && <span> · {(festivalContext.festival as { name?: string }).name}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && (
              <Button variant="outline" size="sm" className="text-xs border-border/30" onClick={() => archiveEvent.mutate({ archive: !isArchived })}>
                {isArchived ? <><ArchiveRestore className="h-3.5 w-3.5 mr-1" />Gjenopprett</> : <><Archive className="h-3.5 w-3.5 mr-1" />Arkiver</>}
              </Button>
            )}
            {event.slug && (
              <Button asChild variant="outline" size="sm" className="text-xs border-border/30 hover:border-accent/40">
                <Link to={`/event/${event.slug}`} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Se live</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10">

        {/* Intro */}
        {showIntro && (
          <div className="mb-8 lg:mb-12 flex items-start gap-3 max-w-xl">
            <p className="text-sm text-muted-foreground/70 leading-relaxed">
              Sett opp program og folk først — så er du klar til å kjøre live.
            </p>
            <button onClick={() => setShowIntro(false)} className="text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0 mt-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Progress rail ── */}
        <div className="mb-10 lg:mb-14">
          <div className="flex items-center gap-0">
            {visibleStages.map((stage, i) => {
              const progress = stageProgress(stage.modules);
              const isLast = i === visibleStages.length - 1;
              return (
                <React.Fragment key={stage.key}>
                  {/* Dot */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className={`h-3 w-3 rounded-full border-2 transition-colors ${
                      progress === "done"
                        ? "border-emerald-400 bg-emerald-400/30"
                        : progress === "active"
                        ? "border-accent bg-accent/20"
                        : "border-muted-foreground/25 bg-muted"
                    }`} />
                    <span className={`text-[10px] font-medium tracking-wide uppercase whitespace-nowrap ${
                      progress === "active" ? "text-accent" : progress === "done" ? "text-emerald-400/80" : "text-muted-foreground/40"
                    }`}>
                      {stage.title}
                    </span>
                  </div>
                  {/* Connector */}
                  {!isLast && (
                    <div className="flex-1 mx-2 mt-[-18px]">
                      <div className={`h-px w-full ${
                        progress === "done" ? "bg-emerald-400/30" : "bg-border/15"
                      }`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Desktop horizontal layout (lg+) ── */}
        <div className="hidden lg:grid gap-12" style={{ gridTemplateColumns: `repeat(${visibleStages.length}, 1fr)` }}>
          {visibleStages.map((stage) => {
            const isGjennomfor = stage.key === "gjennomfor";
            const isGrunnlag = stage.key === "grunnlag";

            return (
              <div key={stage.key}>
                {/* Stage heading */}
                <div className="mb-5">
                  <h2 className={`font-semibold tracking-tight ${
                    isGjennomfor ? "text-xl text-foreground" : isGrunnlag ? "text-base text-muted-foreground/60" : "text-base text-foreground"
                  }`}>
                    {stage.title}
                  </h2>
                  <p className={`text-xs mt-0.5 ${isGrunnlag ? "text-muted-foreground/40" : "text-muted-foreground/60"}`}>
                    {stage.description}
                  </p>
                </div>

                {/* Module items */}
                <div className="space-y-1">
                  {stage.modules.map((mod) => (
                    <ModuleRow key={mod.key} mod={mod} hero={isGjennomfor} subdued={isGrunnlag} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Mobile vertical layout (< lg) ── */}
        <div className="lg:hidden space-y-8">
          {visibleStages.map((stage) => {
            const isGjennomfor = stage.key === "gjennomfor";
            const isGrunnlag = stage.key === "grunnlag";

            return (
              <div key={stage.key}>
                {/* Separator between stages */}
                <div className="border-t border-border/10 mb-5" />
                <div className="mb-4">
                  <h2 className={`font-semibold tracking-tight ${
                    isGjennomfor ? "text-lg text-foreground" : isGrunnlag ? "text-sm text-muted-foreground/60" : "text-sm text-foreground"
                  }`}>
                    {stage.title}
                  </h2>
                  <p className={`text-xs mt-0.5 ${isGrunnlag ? "text-muted-foreground/40" : "text-muted-foreground/60"}`}>
                    {stage.description}
                  </p>
                </div>
                <div className="space-y-1">
                  {stage.modules.map((mod) => (
                    <ModuleRow key={mod.key} mod={mod} hero={isGjennomfor} subdued={isGrunnlag} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ─── Module row ───

function ModuleRow({ mod, hero, subdued }: { mod: ModuleHealth; hero?: boolean; subdued?: boolean }) {
  const Icon = mod.icon;
  const statusIcon = mod.status === "done"
    ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
    : mod.status === "locked"
    ? <Lock className="h-3 w-3 text-muted-foreground/30" />
    : <CircleDot className="h-3 w-3 text-muted-foreground/40" />;

  const statusLabel = mod.status === "done" ? "Klar" : mod.status === "empty" ? "Ikke startet" : mod.status === "locked" ? "Låst" : "Pågår";

  if (hero) {
    return (
      <Link
        to={mod.to}
        className="group relative block rounded-lg py-6 px-5 -mx-1 transition-all duration-300 hover:bg-accent/5"
        style={{ boxShadow: "0 0 40px hsl(24 100% 55% / 0.06)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-5 w-5 text-accent/70" />
          <span className="text-lg font-semibold text-foreground">{mod.title}</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 ml-auto">
            {statusIcon}
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground/70 mb-4">{mod.secondary}</p>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent group-hover:underline underline-offset-2">
          {mod.primaryCta}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
        {/* Subtle left accent bar */}
        <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-accent/30" />
      </Link>
    );
  }

  return (
    <Link
      to={mod.to}
      className={`group flex items-center gap-3 py-3 px-1 -mx-1 transition-colors duration-200 hover:bg-card/30 rounded ${
        subdued ? "opacity-70 hover:opacity-100" : ""
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${subdued ? "text-muted-foreground/30" : "text-muted-foreground/50"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${subdued ? "text-muted-foreground/70" : "text-foreground"}`}>{mod.title}</span>
          <span className="text-[10px] text-muted-foreground/40">—</span>
          <span className="text-xs text-muted-foreground/50 truncate">{mod.primaryCta}</span>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 shrink-0">
        {statusIcon}
        <span className="text-[10px] text-muted-foreground/40">{statusLabel}</span>
      </span>
      {mod.hint && (
        <span className="text-[10px] text-accent/60 font-medium shrink-0 hidden sm:inline">{mod.hint} →</span>
      )}
      <ChevronRight className="h-3 w-3 text-muted-foreground/15 group-hover:text-accent/50 transition-colors shrink-0" />
    </Link>
  );
}
