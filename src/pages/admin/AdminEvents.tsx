import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, ExternalLink, Settings, Music, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default function AdminEvents() {
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, venue:venues(id, name)")
        .order("start_at", { ascending: false });
      return data || [];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" }) => {
      await supabase.from("events").update({ status }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Laster events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Events</h1>
        <Button asChild>
          <Link to="/admin/events/new">
            <Plus className="h-4 w-4 mr-2" />
            Ny event
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {events?.map((event) => (
          <div
            key={event.id}
            className="bg-card border border-border rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Music className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    {event.title}
                  </h2>
                  <Badge variant={event.status === "published" ? "default" : "secondary"}>
                    {event.status === "published" ? "Publisert" : "Utkast"}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground">
                  {format(new Date(event.start_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })}
                  {event.venue && ` · ${event.venue.name}`}
                </p>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/admin/events/${event.id}/lineup`}>
                    Lineup
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/admin/events/${event.id}`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Rediger
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/event/${event.slug}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              <Button
                variant={event.status === "published" ? "outline" : "default"}
                size="sm"
                onClick={() => toggleStatus.mutate({
                  id: event.id,
                  status: event.status === "published" ? "draft" : "published"
                })}
              >
                {event.status === "published" ? "Gjør til utkast" : "Publiser"}
              </Button>
            </div>
          </div>
        ))}

        {events?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Ingen events ennå.</p>
            <Button asChild className="mt-4">
              <Link to="/admin/events/new">Opprett din første event</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
