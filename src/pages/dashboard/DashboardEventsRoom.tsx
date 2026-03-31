import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

type StatusFilter = "all" | "draft" | "published";

export default function DashboardEventsRoom() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showArchived, setShowArchived] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["dashboard-events-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_events" as any);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; slug: string; status: string; start_at: string | null; city: string | null; can_edit: boolean; archived_at?: string | null }>;
    },
  });

  const filtered = (events ?? []).filter((e) => {
    const isArchived = !!e.archived_at;
    if (!showArchived && isArchived) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <BackstageShell
      title="Events"
      subtitle="Alle arrangementer"
      backTo="/dashboard"
      actions={
        <Button asChild size="sm">
          <Link to="/dashboard/events/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Nytt event
          </Link>
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Søk etter event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            <SelectItem value="draft">Utkast</SelectItem>
            <SelectItem value="published">Publisert</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} className="scale-75" />
          Vis arkiverte
        </label>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingState message="Laster events..." />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== "all" || showArchived
              ? "Ingen treff med gjeldende filtre."
              : "Ingen events ennå."}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/events/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Opprett event
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {filtered.map((ev) => {
            const isArchived = !!ev.archived_at;
            return (
              <Link
                key={ev.id}
                to={`/dashboard/events/${ev.id}`}
                className={`group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 ${isArchived ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                      <Calendar className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {ev.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {ev.start_at && (
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(ev.start_at), "d. MMM yyyy", { locale: nb })}
                          </span>
                        )}
                        <Badge
                          variant={ev.status === "published" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {ev.status === "published" ? "Publisert" : "Utkast"}
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
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </BackstageShell>
  );
}
