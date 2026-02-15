import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Users, FolderOpen, QrCode, Settings, Music } from "lucide-react";
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
}

export default function AdminFestivalWorkspace() {
  const { id } = useParams<{ id: string }>();

  const { data: festival, isLoading } = useQuery({
    queryKey: ["admin-festival-workspace", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug, status, start_at, end_at")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch events linked to this festival
  const { data: festivalEvents } = useQuery({
    queryKey: ["admin-festival-events", id],
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

  // Check permissions - must be before any early returns to respect React hook rules
  const { data: canEditEvents } = useQuery({
    queryKey: ["can-edit-events", id],
    queryFn: async () => {
      const { data } = await supabase.rpc("can_edit_events", { p_festival_id: id });
      return data ?? false;
    },
    enabled: !!id,
  });

  const { data: canEditFestival } = useQuery({
    queryKey: ["can-edit-festival", id],
    queryFn: async () => {
      const { data } = await supabase.rpc("can_edit_festival", { p_festival_id: id });
      return data ?? false;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingState message="Laster festivalrom..." />;
  }

  if (!festival) {
    return <div className="text-muted-foreground">Festival ikke funnet.</div>;
  }

  const canAccessEvents = canEditFestival || canEditEvents;

  const modules: ModuleCard[] = [
    {
      title: "Program",
      description: "Administrer festivalens program og rekkefølge",
      icon: Calendar,
      to: `/admin/festivals/${id}/program`,
      disabled: !canAccessEvents,
    },
    {
      title: "Events",
      description: `${festivalEvents?.length || 0} events i festivalen`,
      icon: Music,
      to: `/admin/festivals/${id}/program`,
      disabled: !canAccessEvents,
    },
    {
      title: "Team",
      description: "Se og administrer festival-teamet",
      icon: Users,
      disabled: true,
    },
    {
      title: "Scan billetter",
      description: "Innsjekk og billettkontroll",
      icon: QrCode,
      to: "/crew/checkin",
    },
    {
      title: "Filbank",
      description: "Mediefiler for festivalen",
      icon: FolderOpen,
      to: "/admin/media",
    },
    {
      title: "Innstillinger",
      description: "Seksjoner, tema og detaljer",
      icon: Settings,
      to: `/admin/festivals/${id}`,
      disabled: !canEditFestival,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/festivals">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Festivaler
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{festival.name}</h1>
        <Badge variant={festival.status === "published" ? "default" : "secondary"}>
          {festival.status === "published" ? "Publisert" : "Utkast"}
        </Badge>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const content = (
            <Card
              className={`transition-colors ${
                mod.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-accent/40 cursor-pointer"
              }`}
            >
              <CardHeader className="p-4 md:p-5">
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

      {/* Events quick list */}
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
                  className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-accent/30 transition-colors bg-card"
                >
                  <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{fe.event.title}</span>
                  <Button variant="outline" size="sm" className="ml-auto h-7 text-xs shrink-0" asChild>
                    <Link to={`/admin/events/${fe.event.id}/lineup`}>
                      Medvirkende
                    </Link>
                  </Button>
                </Link>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
