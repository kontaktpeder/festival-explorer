import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Calendar,
  QrCode,
  FolderOpen,
  Settings,
  Music,
  BarChart3,
  Ticket,
  ExternalLink,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ElementType;
  to?: string;
  disabled?: boolean;
  hidden?: boolean;
}

export default function FestivalRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: festival, isLoading } = useQuery({
    queryKey: ["festival-room", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug, status, start_at, end_at")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: permissions } = useQuery({
    queryKey: ["festival-room-permissions", id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin) {
        return {
          can_edit_festival: true,
          can_edit_events: true,
          can_access_media: true,
          can_scan_tickets: true,
          can_see_ticket_stats: true,
          can_create_internal_ticket: true,
          can_see_report: true,
          can_see_revenue: true,
        };
      }

      const { data: personas } = await supabase
        .from("personas")
        .select("id")
        .eq("user_id", user.id);

      if (!personas || personas.length === 0) return null;
      const personaIds = personas.map((p) => p.id);

      const { data: fp } = await supabase
        .from("festival_participants")
        .select(
          "can_edit_festival, can_edit_events, can_access_media, can_scan_tickets, can_see_ticket_stats, can_create_internal_ticket, can_see_report, can_see_revenue"
        )
        .eq("festival_id", id!)
        .eq("participant_kind", "persona")
        .in("participant_id", personaIds);

      if (!fp || fp.length === 0) return null;

      return {
        can_edit_festival: fp.some((f) => f.can_edit_festival),
        can_edit_events: fp.some((f) => f.can_edit_events),
        can_access_media: fp.some((f) => f.can_access_media),
        can_scan_tickets: fp.some((f) => f.can_scan_tickets),
        can_see_ticket_stats: fp.some((f) => f.can_see_ticket_stats),
        can_create_internal_ticket: fp.some((f) => f.can_create_internal_ticket),
        can_see_report: fp.some((f) => f.can_see_report),
        can_see_revenue: fp.some((f) => f.can_see_revenue),
      };
    },
    enabled: !!id,
  });

  const { data: festivalEvents } = useQuery({
    queryKey: ["festival-room-events", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festival_events")
        .select("event_id, event:events(id, title, slug)")
        .eq("festival_id", id!)
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster festivalrom..." />
      </div>
    );
  }

  if (!festival) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Festival ikke funnet.</p>
      </div>
    );
  }

  const p = permissions;
  const canAccessEvents = p?.can_edit_festival || p?.can_edit_events;

  const modules: ModuleCard[] = [
    {
      title: "Program",
      description: "Rekkefølge og programoversikt",
      icon: Calendar,
      to: `/dashboard/festival/${id}/program`,
      hidden: !canAccessEvents,
    },
    {
      title: "Scan billetter",
      description: "Innsjekk og billettkontroll",
      icon: QrCode,
      to: "/crew/checkin",
      hidden: !p?.can_scan_tickets,
    },
    {
      title: "Billettoversikt",
      description: "Status og statistikk",
      icon: Ticket,
      to: `/dashboard/festival/${id}/tickets`,
      hidden: !p?.can_see_ticket_stats,
    },
    {
      title: "Opprett billett",
      description: "Lag internbillett manuelt",
      icon: FileText,
      disabled: true,
      hidden: !p?.can_create_internal_ticket,
    },
    {
      title: "Filbank",
      description: "Mediefiler og bilder",
      icon: FolderOpen,
      to: `/dashboard/festival/${id}/media`,
      hidden: !p?.can_access_media,
    },
    {
      title: "Rapport",
      description: "Sammendrag og innsikt",
      icon: BarChart3,
      disabled: true,
      hidden: !p?.can_see_report,
    },
    {
      title: "Innstillinger",
      description: "Seksjoner, tema og detaljer",
      icon: Settings,
      to: `/dashboard/festival/${id}/settings`,
      hidden: !p?.can_edit_festival,
    },
  ];

  const visibleModules = modules.filter((m) => !m.hidden);

  const dateStr = festival.start_at
    ? new Date(festival.start_at).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              BACKSTAGE
            </span>
          </div>
          <Button asChild variant="outline" size="sm" className="text-xs border-border/30 hover:border-accent/40">
            <Link to={`/festival/${festival.slug}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Se live
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-background to-accent-warm/5" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-warm/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="max-w-5xl">
            <div className="flex items-center gap-3 mb-2">
              <Badge
                variant={festival.status === "published" ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-widest"
              >
                {festival.status === "published" ? "Publisert" : "Utkast"}
              </Badge>
              {dateStr && (
                <span className="text-xs text-muted-foreground">{dateStr}</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
              {festival.name}
            </h1>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main
        className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 space-y-6 sm:space-y-8"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)" }}
      >
        {/* Module grid */}
        {visibleModules.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Verktøy
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
              {visibleModules.map((mod) => {
                const Icon = mod.icon;
                const inner = (
                  <div
                    key={mod.title}
                    className={`group relative rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 transition-all duration-300 ${
                      mod.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:border-accent/30 hover:bg-card/80 hover:shadow-lg hover:shadow-accent/5 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                        mod.disabled 
                          ? "bg-muted/50" 
                          : "bg-accent/10 group-hover:bg-accent/20"
                      }`}>
                        <Icon className={`h-5 w-5 transition-colors duration-300 ${
                          mod.disabled ? "text-muted-foreground" : "text-accent"
                        }`} />
                      </div>
                      {!mod.disabled && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {mod.title}
                      {mod.disabled && (
                        <span className="ml-2 text-[10px] font-normal text-muted-foreground/60">
                          Kommer snart
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                );

                if (mod.disabled || !mod.to) return <div key={mod.title}>{inner}</div>;
                return (
                  <Link key={mod.title} to={mod.to}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="py-16 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <p className="text-sm text-muted-foreground">
                Du har ingen aktive verktøy for denne festivalen ennå.
              </p>
              <p className="text-[11px] text-muted-foreground/50">
                Kontakt festivalsjefen for å få tilgang til flere funksjoner.
              </p>
            </div>
          </section>
        )}

        {/* Events */}
        {canAccessEvents && festivalEvents && festivalEvents.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Events
              </h2>
              <span className="text-[11px] text-muted-foreground/50">
                {festivalEvents.length} event{festivalEvents.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {festivalEvents.map((fe: any) =>
                fe.event ? (
                  <Link
                    key={fe.event_id}
                    to={`/event-room/${fe.event.id}`}
                    className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                          <Music className="h-4 w-4 text-accent" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">
                          {fe.event.title}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300 shrink-0 ml-2" />
                    </div>
                  </Link>
                ) : null
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
