import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, ChevronRight, ChevronDown, Archive, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

type FestivalRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  archived_at: string | null;
};

type EventRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_at: string | null;
  archived_at: string | null;
};

function FestivalCard({ festival, events }: { festival: FestivalRow; events: EventRow[] }) {
  const isArchived = !!festival.archived_at;
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border border-border/30 bg-card/40 overflow-hidden transition-all duration-300 ${isArchived ? "opacity-60" : ""}`}>
      <Link
        to={`/dashboard/festival/${festival.id}`}
        className="group flex items-center justify-between p-5 hover:bg-card/70 transition-colors duration-300"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center shrink-0 transition-colors duration-300">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-foreground block truncate">
              {festival.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {festival.start_at && (
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(festival.start_at), "d. MMM yyyy", { locale: nb })}
                  {festival.end_at && ` – ${format(new Date(festival.end_at), "d. MMM yyyy", { locale: nb })}`}
                </span>
              )}
              <Badge
                variant={festival.status === "published" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {festival.status === "published" ? "Publisert" : "Utkast"}
              </Badge>
              {isArchived && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  Arkivert
                </Badge>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300 shrink-0 ml-2" />
      </Link>

      {/* Events under this festival */}
      {events.length > 0 && (
        <div className="border-t border-border/20">
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full px-5 py-2">
              <Calendar className="h-3 w-3" />
              <span>{events.length} event{events.length !== 1 ? "s" : ""}</span>
              <ChevronDown className={`h-3 w-3 ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 pb-3 space-y-1">
                {events.map((ev) => (
                  <Link
                    key={ev.id}
                    to={`/dashboard/events/${ev.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/5 transition-colors group/ev"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-foreground block truncate">{ev.title}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {ev.start_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(ev.start_at), "d. MMM yyyy", { locale: nb })}
                          </span>
                        )}
                        <Badge
                          variant={ev.status === "published" ? "default" : "secondary"}
                          className="text-[9px] px-1 py-0"
                        >
                          {ev.status === "published" ? "Pub" : "Utkast"}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover/ev:text-accent/60 shrink-0" />
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}

export default function DashboardFestivalsRoom() {
  const [showArchived, setShowArchived] = useState(() => {
    try { return localStorage.getItem("showArchivedFestivals") === "true"; } catch { return false; }
  });

  const toggleShowArchived = (v: boolean) => {
    setShowArchived(v);
    try { localStorage.setItem("showArchivedFestivals", String(v)); } catch {}
  };

  // Festivals the user has access to
  const { data: festivals, isLoading: loadingFestivals } = useQuery({
    queryKey: ["dashboard-festivals-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festivals")
        .select("id, name, slug, status, start_at, end_at, archived_at")
        .order("start_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FestivalRow[];
    },
  });

  // All festival-event links with event data
  const festivalIds = festivals?.map((f) => f.id) ?? [];
  const { data: festivalEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ["dashboard-festival-events", festivalIds],
    queryFn: async () => {
      if (festivalIds.length === 0) return [];
      const { data, error } = await supabase
        .from("festival_events")
        .select("festival_id, event_id, events(id, title, slug, status, start_at, archived_at)")
        .in("festival_id", festivalIds)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Array<{ festival_id: string; event_id: string; events: EventRow | null }>;
    },
    enabled: festivalIds.length > 0,
  });

  const eventsForFestival = (festivalId: string): EventRow[] =>
    (festivalEvents ?? [])
      .filter((fe) => fe.festival_id === festivalId && fe.events)
      .map((fe) => fe.events!);

  const isLoading = loadingFestivals || loadingEvents;
  const activeFestivals = (festivals ?? []).filter((f) => !f.archived_at);
  const archivedFestivals = (festivals ?? []).filter((f) => !!f.archived_at);

  return (
    <BackstageShell
      title="Festivaler"
      subtitle="Alle festivaler og tilknyttede events"
      backTo="/dashboard"
    >
      {isLoading ? (
        <LoadingState message="Laster festivaler..." />
      ) : activeFestivals.length === 0 && archivedFestivals.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Ingen festivaler ennå.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active festivals */}
          {activeFestivals.length > 0 && (
            <div className="space-y-3">
              {activeFestivals.map((festival) => (
                <FestivalCard key={festival.id} festival={festival} events={eventsForFestival(festival.id)} />
              ))}
            </div>
          )}
          {activeFestivals.length === 0 && archivedFestivals.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen aktive festivaler.</p>
          )}

          {/* Archived section */}
          {archivedFestivals.length > 0 && (
            <Collapsible open={showArchived} onOpenChange={toggleShowArchived}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full">
                <Archive className="h-3.5 w-3.5" />
                <span className="font-medium">Arkiv</span>
                <span className="text-muted-foreground/50">({archivedFestivals.length})</span>
                <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform duration-200 ${showArchived ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {archivedFestivals.map((festival) => (
                  <FestivalCard key={festival.id} festival={festival} events={eventsForFestival(festival.id)} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </BackstageShell>
  );
}
