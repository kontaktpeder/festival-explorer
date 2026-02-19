import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Music, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/LoadingState";
import gIcon from "@/assets/giggen-g-icon-red.png";

export default function FestivalEventsRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: festival, isLoading } = useQuery({
    queryKey: ["festival-room", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug")
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
        .select("event_id, sort_order, event:events(id, title, slug, status, start_at)")
        .eq("festival_id", id!)
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: canEdit } = useQuery({
    queryKey: ["can-edit-events", id],
    queryFn: async () => {
      const { data } = await supabase.rpc("can_edit_events", { p_festival_id: id });
      return data ?? false;
    },
    enabled: !!id,
  });

  if (isLoading) return <LoadingState message="Laster..." />;
  if (!festival || !id) return <p className="p-8 text-muted-foreground">Festival ikke funnet.</p>;

  return (
    <div className="min-h-[100svh] bg-background">
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/dashboard/festival/${id}`)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              BACKSTAGE · Events
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button asChild size="sm" variant="outline">
                <Link to={`/event-room/new?festival_id=${id}`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ny event
                </Link>
              </Button>
            )}
            <img src={gIcon} alt="" className="h-8 w-8 object-contain" />
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Events i {festival.name}
        </h2>

        {festivalEvents && festivalEvents.length > 0 ? (
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
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Ingen events ennå.
          </p>
        )}
      </main>
    </div>
  );
}