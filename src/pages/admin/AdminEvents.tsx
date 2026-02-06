import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, ExternalLink, Settings, Music, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminEvents() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string>("");

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, venue:venues(id, name)")
        .order("start_at", { ascending: true });
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

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      // Delete related data first
      await supabase.from("event_entities").delete().eq("event_id", id);
      await supabase.from("event_projects").delete().eq("event_id", id);
      await supabase.from("festival_events").delete().eq("event_id", id);
      
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      setDeleteId(null);
      setDeleteTitle("");
      toast.success("Event slettet");
    },
    onError: (error: Error) => {
      toast.error("Kunne ikke slette: " + error.message);
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Laster events...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Events</h1>
        <Button asChild size="sm" className="md:size-default">
          <Link to="/admin/events/new">
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Ny event</span>
            <span className="sm:hidden">Ny</span>
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {events?.map((event) => (
          <div
            key={event.id}
            className="bg-card border border-border rounded-lg p-3 md:p-6"
          >
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Music className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                    <h2 className="text-base md:text-xl font-semibold text-foreground truncate">
                      {event.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={event.status === "published" ? "default" : "secondary"} className="text-[10px] md:text-xs">
                      {event.status === "published" ? "Publisert" : "Utkast"}
                    </Badge>
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link to={`/event/${event.slug}`} target="_blank">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs md:text-sm text-muted-foreground">
                  {format(new Date(event.start_at), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })}
                  {event.venue && ` · ${event.venue.name}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 md:gap-2">
                <Button asChild variant="outline" size="sm" className="h-8 text-xs md:text-sm">
                  <Link to={`/admin/events/${event.id}/lineup`}>
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Lineup
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8 text-xs md:text-sm">
                  <Link to={`/admin/events/${event.id}`}>
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    Rediger
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs md:text-sm text-destructive hover:text-destructive border-destructive/30"
                  onClick={() => {
                    setDeleteId(event.id);
                    setDeleteTitle(event.title);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Slett
                </Button>
              </div>

              <div className="pt-2 border-t border-border">
                <Button
                  variant={event.status === "published" ? "outline" : "default"}
                  size="sm"
                  className="h-8 text-xs md:text-sm"
                  onClick={() => toggleStatus.mutate({
                    id: event.id,
                    status: event.status === "published" ? "draft" : "published"
                  })}
                >
                  {event.status === "published" ? "Gjør til utkast" : "Publiser"}
                </Button>
              </div>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett event?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette "{deleteTitle}"?
              <br /><br />
              Dette vil permanent slette eventet og all tilknyttet data (lineup, festival-koblinger).
              <br /><br />
              <strong>Handlingen kan ikke angres.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteEvent.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slett permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
