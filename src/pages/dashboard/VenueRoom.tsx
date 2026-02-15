import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  QrCode,
  FolderOpen,
  Settings,
  Music,
  ChevronRight,
  Users,
  ExternalLink,
  Building2,
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

export default function VenueRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue-room", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("venues")
        .select("id, name, slug, is_published, address, city")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: permissions } = useQuery({
    queryKey: ["venue-room-permissions", id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if admin
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin) {
        return {
          isOwner: true,
          can_edit_venue: true,
          can_manage_staff: true,
          can_manage_events: true,
          can_scan_tickets: true,
          can_access_media: true,
          can_view_ticket_stats: true,
        };
      }

      // Check if venue owner
      const { data: venueData } = await supabase
        .from("venues")
        .select("created_by")
        .eq("id", id!)
        .single();

      if (venueData?.created_by === user.id) {
        return {
          isOwner: true,
          can_edit_venue: true,
          can_manage_staff: true,
          can_manage_events: true,
          can_scan_tickets: true,
          can_access_media: true,
          can_view_ticket_stats: true,
        };
      }

      // Check venue_staff via persona
      const { data: personas } = await supabase
        .from("personas")
        .select("id")
        .eq("user_id", user.id);

      if (!personas?.length) return null;

      const { data: staff } = await supabase
        .from("venue_staff")
        .select("can_edit_venue, can_manage_staff, can_manage_events, can_scan_tickets, can_access_media, can_view_ticket_stats")
        .eq("venue_id", id!)
        .in("persona_id", personas.map((p) => p.id));

      if (!staff?.length) return null;

      return {
        isOwner: false,
        can_edit_venue: staff.some((s) => s.can_edit_venue),
        can_manage_staff: staff.some((s) => s.can_manage_staff),
        can_manage_events: staff.some((s) => s.can_manage_events),
        can_scan_tickets: staff.some((s) => s.can_scan_tickets),
        can_access_media: staff.some((s) => s.can_access_media),
        can_view_ticket_stats: staff.some((s) => s.can_view_ticket_stats),
      };
    },
    enabled: !!id,
  });

  const { data: venueEvents } = useQuery({
    queryKey: ["venue-room-events", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, slug, status, start_at")
        .eq("venue_id", id!)
        .order("start_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster venue..." />
      </div>
    );
  }

  if (!venue || !id) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Venue ikke funnet.</p>
      </div>
    );
  }

  const p = permissions;
  const canAccessEvents = p?.can_edit_venue || p?.can_manage_events;

  const modules: ModuleCard[] = [
    {
      title: "Events",
      description: "Arrangementer på scenen",
      icon: Music,
      to: `/dashboard/venue/${id}/events`,
      hidden: !canAccessEvents,
    },
    {
      title: "Team",
      description: "Inviter og administrer team",
      icon: Users,
      to: `/dashboard/venue/${id}/team`,
      hidden: !(p?.can_manage_staff || p?.can_edit_venue),
    },
    {
      title: "Scan billetter",
      description: "Innsjekk og billettkontroll",
      icon: QrCode,
      to: `/crew/checkin?venue=${id}`,
      hidden: !p?.can_scan_tickets,
    },
    {
      title: "Innstillinger",
      description: "Grunninfo og publisering",
      icon: Settings,
      to: `/dashboard/venue/${id}/settings`,
      hidden: !p?.can_edit_venue,
    },
  ];

  const visibleModules = modules.filter((m) => !m.hidden);

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
            <Link to={`/project/${venue.slug}`} target="_blank">
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
                variant={venue.is_published ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-widest"
              >
                {venue.is_published ? "Publisert" : "Utkast"}
              </Badge>
              {venue.city && (
                <span className="text-xs text-muted-foreground">{venue.city}</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
              {venue.name}
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
                Du har ingen aktive verktøy for denne scenen ennå.
              </p>
              <p className="text-[11px] text-muted-foreground/50">
                Kontakt venue-eieren for å få tilgang til flere funksjoner.
              </p>
            </div>
          </section>
        )}

        {/* Events */}
        {canAccessEvents && venueEvents && venueEvents.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Events
              </h2>
              <span className="text-[11px] text-muted-foreground/50">
                {venueEvents.length} event{venueEvents.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {venueEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/event-room/${event.id}`}
                  className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                        <Music className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">
                        {event.title}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300 shrink-0 ml-2" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
