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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  // Fetch user's permissions for this festival
  const { data: permissions } = useQuery({
    queryKey: ["festival-room-permissions", id],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if user is admin first
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

      // Get user's personas
      const { data: personas } = await supabase
        .from("personas")
        .select("id")
        .eq("user_id", user.id);

      if (!personas || personas.length === 0) return null;

      const personaIds = personas.map((p) => p.id);

      // Find the user's festival_participants entry
      const { data: fp } = await supabase
        .from("festival_participants")
        .select(
          "can_edit_festival, can_edit_events, can_access_media, can_scan_tickets, can_see_ticket_stats, can_create_internal_ticket, can_see_report, can_see_revenue"
        )
        .eq("festival_id", id!)
        .eq("participant_kind", "persona")
        .in("participant_id", personaIds);

      if (!fp || fp.length === 0) return null;

      // Merge permissions from all matching entries (OR logic)
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

  // Fetch events linked to this festival
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
      description: "Se festivalens program og rekkefølge",
      icon: Calendar,
      to: `/admin/festivals/${id}/program`,
      hidden: !canAccessEvents,
    },
    {
      title: "Events",
      description: `${festivalEvents?.length || 0} events i festivalen`,
      icon: Music,
      to: `/admin/festivals/${id}/program`,
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
      description: "Se billettstatus og statistikk",
      icon: Ticket,
      to: "/admin/tickets",
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
      description: "Mediefiler for festivalen",
      icon: FolderOpen,
      to: "/admin/media",
      hidden: !p?.can_access_media,
    },
    {
      title: "Rapport",
      description: "Festivalrapport og sammendrag",
      icon: BarChart3,
      disabled: true,
      hidden: !p?.can_see_report,
    },
    {
      title: "Innstillinger",
      description: "Seksjoner, tema og detaljer",
      icon: Settings,
      to: `/admin/festivals/${id}`,
      hidden: !p?.can_edit_festival,
    },
  ];

  const visibleModules = modules.filter((m) => !m.hidden);

  return (
    <div className="min-h-[100svh] pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between">
          <Link to="/" className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px] sm:text-base">BACKSTAGE</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to={`/festival/${festival.slug}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Se live
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
        {/* Back + title */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-xs text-muted-foreground -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Tilbake til dashbord
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{festival.name}</h1>
            <Badge
              variant={festival.status === "published" ? "default" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {festival.status === "published" ? "Publisert" : "Utkast"}
            </Badge>
          </div>
          {festival.start_at && (
            <p className="text-xs text-muted-foreground">
              {new Date(festival.start_at).toLocaleDateString("nb-NO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {festival.end_at &&
                ` – ${new Date(festival.end_at).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`}
            </p>
          )}
        </div>

        {/* Module cards */}
        {visibleModules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleModules.map((mod) => {
              const Icon = mod.icon;
              const content = (
                <Card
                  className={`transition-colors ${
                    mod.disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:border-accent/40 cursor-pointer"
                  }`}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold">
                          {mod.title}
                          {mod.disabled && (
                            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                              Kommer snart
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {mod.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );

              if (mod.disabled || !mod.to) return <div key={mod.title}>{content}</div>;
              return (
                <Link key={mod.title} to={mod.to}>
                  {content}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-card/60 border border-border/30 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Du har ingen aktive verktøy for denne festivalen ennå.
            </p>
            <p className="text-[11px] text-muted-foreground/50">
              Kontakt festivalsjefen for å få tilgang til flere funksjoner.
            </p>
          </div>
        )}

        {/* Events list (only if can edit) */}
        {canAccessEvents && festivalEvents && festivalEvents.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Events i festivalen
            </h2>
            <div className="space-y-1.5">
              {festivalEvents.map((fe: any) =>
                fe.event ? (
                  <Link
                    key={fe.event_id}
                    to={`/event-room/${fe.event.id}`}
                    className="flex items-center gap-3 p-3 rounded-md border border-border/30 hover:border-accent/30 transition-colors bg-card/60"
                  >
                    <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{fe.event.title}</span>
                  </Link>
                ) : null
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
