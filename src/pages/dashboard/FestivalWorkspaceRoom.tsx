import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Music, FolderOpen, Settings, QrCode, ChevronRight } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

export default function FestivalWorkspaceRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: festival, isLoading } = useQuery({
    queryKey: ["festival-room", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug, status")
        .eq("id", id!)
        .single();
      return data;
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
        .order("sort_order");
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) return <LoadingState message="Laster..." />;
  if (!festival || !id) return <p className="p-8 text-muted-foreground">Festival ikke funnet.</p>;

  const shortcuts = [
    { title: "Program", icon: Calendar, to: `/dashboard/festival/${id}/program` },
    { title: "Events", icon: Music, to: `/dashboard/festival/${id}/events` },
    { title: "Filbank", icon: FolderOpen, to: `/dashboard/festival/${id}/media` },
    { title: "Innstillinger", icon: Settings, to: `/dashboard/festival/${id}/settings` },
    { title: "Scan billetter", icon: QrCode, to: `/crew/checkin?festival=${id}` },
  ];

  return (
    <div className="min-h-[100svh] bg-background">
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/festival/${id}`)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            BACKSTAGE · Workspace
          </span>
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 space-y-6">
        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Snarveier
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {shortcuts.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.title}
                  to={s.to}
                  className="group rounded-xl border border-border/30 bg-card/60 p-4 hover:border-accent/30 hover:bg-card/80 transition-all duration-300"
                >
                  <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center mb-2 transition-colors duration-300">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{s.title}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {festivalEvents && festivalEvents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Events
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {festivalEvents.map((fe: any) =>
                fe.event ? (
                  <Link
                    key={fe.event_id}
                    to={`/event-room/${fe.event.id}`}
                    className="group rounded-xl border border-border/30 bg-card/40 p-4 hover:border-accent/30 hover:bg-card/70 transition-all duration-300 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Music className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-sm text-foreground truncate">{fe.event.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 shrink-0 ml-2" />
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
