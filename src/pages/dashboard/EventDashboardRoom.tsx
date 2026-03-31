import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FocusThemeProvider } from "@/contexts/FocusThemeContext";
import {
  FileText, ClipboardList, ChevronRight, ExternalLink, ArrowLeft, Radio, Wrench, UserCheck,
  Archive, ArchiveRestore, CheckCircle2, Circle, Lock, X, Play, Radio as RadioIcon,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { useEventBackstageAccess } from "@/hooks/useEventBackstageAccess";
import { useEventActors } from "@/hooks/useEventActors";
import { toast } from "sonner";
import liveIllustration from "@/assets/live-illustration.png";

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
  hint?: string;
}

type StageKey = "admin" | "forbered" | "gjennomfor";

interface Stage {
  key: StageKey;
  title: string;
  description: string;
  moduleKeys: ModuleKey[];
}

const STAGES: Stage[] = [
  { key: "admin", title: "Administrativt", description: "Grunnlag og tilgang", moduleKeys: ["details", "actors"] },
  { key: "forbered", title: "Forbered", description: "Før eventet — få alt klart", moduleKeys: ["program", "production"] },
  { key: "gjennomfor", title: "Gjennomfør", description: "Under eventet — styr det live", moduleKeys: ["live"] },
];

function hasCoreDetails(event: any): boolean {
  return !!event?.title && !!event?.start_at && (!!event?.venue_id || !!event?.city);
}

function stageProgress(modules: ModuleHealth[]): "done" | "active" | "pending" {
  if (modules.every((m) => m.status === "done")) return "done";
  if (modules.some((m) => m.status === "done" || m.status === "warning")) return "active";
  return "pending";
}

function statusPresentation(status: ModuleStatus) {
  switch (status) {
    case "done":
      return { label: "Klar", icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />, color: "text-emerald-700" };
    case "warning":
      return { label: "Pågår", icon: <Circle className="h-3.5 w-3.5 text-blue-500" />, color: "text-blue-600" };
    case "empty":
      return { label: "Ikke startet", icon: <Circle className="h-3.5 w-3.5 text-gray-400" />, color: "text-gray-500" };
    case "locked":
      return { label: "Låst", icon: <Lock className="h-3.5 w-3.5 text-gray-400" />, color: "text-gray-400" };
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
        className="sticky top-0 z-50 border-b"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 0px)",
          background: "hsl(220 14% 96% / 0.85)",
          backdropFilter: "blur(16px)",
          borderColor: "hsl(220 13% 85%)",
        }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-gray-700 shrink-0 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h1>
                {isArchived && <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-300 shrink-0">Arkivert</Badge>}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                {[dateStr, event.city].filter(Boolean).join(" · ")}
                {festivalContext?.festival && <span> · {(festivalContext.festival as { name?: string }).name}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && (
              <Button variant="outline" size="sm" className="text-xs border-gray-300 text-gray-600 hover:text-gray-900" onClick={() => archiveEvent.mutate({ archive: !isArchived })}>
                {isArchived ? <><ArchiveRestore className="h-3.5 w-3.5 mr-1" />Gjenopprett</> : <><Archive className="h-3.5 w-3.5 mr-1" />Arkiver</>}
              </Button>
            )}
            {event.slug && (
              <Button asChild variant="outline" size="sm" className="text-xs border-gray-300 text-gray-600 hover:text-gray-900">
                <Link to={`/event/${event.slug}`} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Se live</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10 max-w-[1200px] mx-auto">

        {/* Intro */}
        {showIntro && (
          <div className="mb-8 lg:mb-10 flex items-start gap-3 max-w-xl">
            <p className="text-sm text-gray-500 leading-relaxed">
              Sett opp grunnlaget først, forbered program og produksjon, og kjør live når du er klar.
            </p>
            <button onClick={() => setShowIntro(false)} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Progress rail ── */}
        <div className="mb-10 lg:mb-14">
          <div className="flex items-center gap-0">
            {visibleStages.map((stage, i) => {
              const progress = stageProgress(stage.modules);
              const isGjennomfor = stage.key === "gjennomfor";
              const isLast = i === visibleStages.length - 1;
              return (
                <React.Fragment key={stage.key}>
                  {/* Node */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className={`rounded-full transition-all ${
                      progress === "done"
                        ? "h-3.5 w-3.5 border-2 border-emerald-500 bg-emerald-500"
                        : isGjennomfor && progress === "active"
                        ? "h-4 w-4 border-2 border-blue-500 bg-blue-500 ring-4 ring-blue-100"
                        : progress === "active"
                        ? "h-3.5 w-3.5 border-2 border-blue-500 bg-blue-100"
                        : "h-3 w-3 border-2 border-gray-300 bg-white"
                    }`} />
                    <span className={`text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap ${
                      progress === "done" ? "text-emerald-600"
                        : isGjennomfor && progress === "active" ? "text-blue-600"
                        : progress === "active" ? "text-blue-500"
                        : "text-gray-400"
                    }`}>
                      {stage.title}
                    </span>
                  </div>
                  {/* Connector */}
                  {!isLast && (
                    <div className="flex-1 mx-2 mt-[-18px]">
                      <div className={`h-[2px] w-full rounded-full ${
                        progress === "done" ? "bg-emerald-400" : "bg-gray-200"
                      }`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Desktop horizontal layout (lg+) ── */}
        <div className="hidden lg:grid gap-10" style={{ gridTemplateColumns: `repeat(${visibleStages.length}, 1fr)` }}>
          {visibleStages.map((stage) => (
            <StageColumn key={stage.key} stage={stage} />
          ))}
        </div>

        {/* ── Mobile vertical layout (< lg) ── */}
        <div className="lg:hidden space-y-8">
          {visibleStages.map((stage, i) => (
            <div key={stage.key}>
              {i > 0 && <div className="border-t border-gray-200 mb-5" />}
              <StageColumn stage={stage} />
            </div>
          ))}
        </div>
      </main>
    </div>
    </FocusThemeProvider>
  );
}

// ─── Stage column ───

function StageColumn({ stage }: { stage: Stage & { modules: ModuleHealth[] } }) {
  const isAdmin = stage.key === "admin";
  const isGjennomfor = stage.key === "gjennomfor";

  return (
    <div>
      {/* Stage heading */}
      <div className="mb-4">
        <h2 className={`font-semibold tracking-tight ${
          isGjennomfor ? "text-lg text-gray-900" : isAdmin ? "text-sm text-gray-500" : "text-base text-gray-800"
        }`}>
          {stage.title}
        </h2>
        <p className={`text-xs mt-0.5 ${isAdmin ? "text-gray-400" : "text-gray-500"}`}>
          {stage.description}
        </p>
      </div>

      {/* Module items */}
      <div className={isGjennomfor ? "" : "space-y-0.5"}>
        {stage.modules.map((mod) => {
          if (isGjennomfor) return <LiveModule key={mod.key} mod={mod} />;
          return <ModuleRow key={mod.key} mod={mod} muted={isAdmin} />;
        })}
      </div>
    </div>
  );
}

// ─── Live module (hero) ───

function LiveModule({ mod }: { mod: ModuleHealth }) {
  const sp = statusPresentation(mod.status);

  return (
    <Link
      to={mod.to}
      className="group relative block rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg"
      style={{
        background: "linear-gradient(135deg, hsl(220 50% 97%) 0%, hsl(230 40% 94%) 100%)",
        border: "1px solid hsl(225 30% 88%)",
      }}
    >
      {/* Illustration background */}
      <img
        src={liveIllustration}
        alt=""
        loading="lazy"
        width={960}
        height={512}
        className="absolute inset-0 w-full h-full object-cover opacity-[0.08] pointer-events-none select-none"
      />

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-7">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(225 50% 92%)" }}>
            <Radio className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-lg font-semibold text-gray-900">{mod.title}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-medium ml-auto ${sp.color}`}>
            {sp.icon}
            {sp.label}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-5">{mod.secondary}</p>

        <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          <Play className="h-3.5 w-3.5" />
          {mod.primaryCta}
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>

      {/* Subtle left accent */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: "hsl(225 60% 70%)" }} />
    </Link>
  );
}

// ─── Module row (normal) ───

function ModuleRow({ mod, muted }: { mod: ModuleHealth; muted?: boolean }) {
  const Icon = mod.icon;
  const sp = statusPresentation(mod.status);

  return (
    <Link
      to={mod.to}
      className={`group flex items-center gap-3 py-3.5 px-2 -mx-2 transition-colors duration-200 rounded-lg hover:bg-gray-50 ${
        muted ? "opacity-80 hover:opacity-100" : ""
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${muted ? "text-gray-400" : "text-gray-500"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${muted ? "text-gray-600" : "text-gray-900"}`}>{mod.title}</span>
          <span className="text-xs text-gray-400">—</span>
          <span className="text-xs text-gray-500 truncate">{mod.primaryCta}</span>
        </div>
      </div>
      <span className={`inline-flex items-center gap-1 shrink-0 ${sp.color}`}>
        {sp.icon}
        <span className="text-[11px] font-medium">{sp.label}</span>
      </span>
      {mod.hint && (
        <span className="text-[11px] text-blue-500 font-medium shrink-0 hidden sm:inline">{mod.hint} →</span>
      )}
      <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
    </Link>
  );
}
