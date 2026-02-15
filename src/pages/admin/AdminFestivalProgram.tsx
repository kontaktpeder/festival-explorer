import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { Plus, Trash2, ArrowLeft, Eye, EyeOff, Star } from "lucide-react";
import { EventPosterBlock } from "@/components/festival/EventPosterBlock";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { useState } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default function AdminFestivalProgram() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState("");

  // Check edit permission
  const { data: canEditProgram } = useQuery({
    queryKey: ["can-edit-festival-program-or-events", id],
    queryFn: async () => {
      const [festival, events] = await Promise.all([
        supabase.rpc("can_edit_festival", { p_festival_id: id }),
        supabase.rpc("can_edit_events", { p_festival_id: id }),
      ]);
      return (festival.data ?? false) || (events.data ?? false);
    },
    enabled: !!id,
  });

  // Fetch festival info
  const { data: festival } = useQuery({
    queryKey: ["admin-festival", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug")
        .eq("id", id)
        .single();
      return data;
    },
  });

  // Fetch festival events
  const { data: festivalEvents, isLoading } = useQuery({
    queryKey: ["admin-festival-events", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festival_events")
        .select("*, event:events(*, venue:venues(name))")
        .eq("festival_id", id);
      
      // Sort chronologically by event start_at (earliest first)
      const sorted = (data || []).sort((a, b) => {
        if (!a.event?.start_at || !b.event?.start_at) return 0;
        return new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime();
      });
      return sorted;
    },
  });

  // Fetch all events for adding - ONLY events created by current user
  const { data: allEvents } = useQuery({
    queryKey: ["admin-all-events"],
    queryFn: async () => {
      const user = await getAuthenticatedUser();
      const { data } = await supabase
        .from("events")
        .select("id, title")
        .eq("created_by", user.id)
        .order("start_at", { ascending: false });
      return data || [];
    },
  });

  // Add event to festival mutation
  const addEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const maxOrder = festivalEvents?.length || 0;
      const { error } = await supabase.from("festival_events").insert({
        festival_id: id,
        event_id: eventId,
        sort_order: maxOrder,
        show_in_program: true,
        is_featured: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-events", id] });
      setSelectedEvent("");
      toast({ title: "Event lagt til" });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Remove event from festival mutation
  const removeEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("festival_events")
        .delete()
        .eq("festival_id", id)
        .eq("event_id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-events", id] });
      toast({ title: "Event fjernet" });
    },
  });

  // Toggle show_in_program mutation
  const toggleShowInProgram = useMutation({
    mutationFn: async ({ eventId, showInProgram }: { eventId: string; showInProgram: boolean }) => {
      const { error } = await supabase
        .from("festival_events")
        .update({ show_in_program: showInProgram })
        .eq("festival_id", id)
        .eq("event_id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-events", id] });
    },
  });

  // Toggle is_featured mutation
  const toggleIsFeatured = useMutation({
    mutationFn: async ({ eventId, isFeatured }: { eventId: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from("festival_events")
        .update({ is_featured: isFeatured })
        .eq("festival_id", id)
        .eq("event_id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-events", id] });
    },
  });

  // Note: Events are now sorted chronologically by start_at, manual reordering removed

  // Available events (not in festival)
  const availableEvents = allEvents?.filter(
    (e) => !festivalEvents?.some((fe) => fe.event_id === e.id)
  ) || [];

  if (isLoading) {
    return <LoadingState message="Laster program..." />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to={`/admin/festivals/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Program</h1>
          <p className="text-sm text-muted-foreground">{festival?.name}</p>
        </div>
      </div>

      {/* Add event - only for editors */}
      {canEditProgram && (
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Velg event..." />
            </SelectTrigger>
            <SelectContent>
              {availableEvents.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => selectedEvent && addEvent.mutate(selectedEvent)}
            disabled={!selectedEvent}
            size="sm"
            className="sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Legg til
          </Button>
        </div>
      )}

      {/* Festival events list */}
      <div className="space-y-4">
        {festivalEvents?.map((fe) => {
          const ev = fe.event;
          if (!ev) return null;
          return (
            <div
              key={fe.event_id}
              className={cn(
                "relative rounded-lg overflow-hidden",
                !fe.show_in_program && "opacity-50"
              )}
            >
              {canEditProgram && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                  <Button
                    variant={fe.is_featured ? "default" : "secondary"}
                    size="icon"
                    className="h-8 w-8 bg-black/60 hover:bg-black/80 border-0"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleIsFeatured.mutate({ eventId: fe.event_id, isFeatured: !fe.is_featured });
                    }}
                    title={fe.is_featured ? "Fjern fra featured" : "Sett som featured"}
                  >
                    <Star className={cn("h-4 w-4 text-white", fe.is_featured && "fill-current text-accent")} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/60 hover:bg-black/80 border-0"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleShowInProgram.mutate({ eventId: fe.event_id, showInProgram: !fe.show_in_program });
                    }}
                    title={fe.show_in_program ? "Skjul fra program" : "Vis i program"}
                  >
                    {fe.show_in_program
                      ? <Eye className="h-4 w-4 text-white" />
                      : <EyeOff className="h-4 w-4 text-white/60" />}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/60 hover:bg-black/80 border-0"
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm("Fjern fra festival?")) removeEvent.mutate(fe.event_id);
                    }}
                    title="Fjern fra festival"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
              <EventPosterBlock
                event={{ ...ev, venue: (ev as any).venue ?? null }}
                compact
                asDiv={canEditProgram}
              />
            </div>
          );
        })}

        {festivalEvents?.length === 0 && (
          <div className="text-center py-8 md:py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <p className="text-sm">Ingen events i programmet ennå.</p>
            <p className="text-xs mt-2">Velg en event fra listen over.</p>
          </div>
        )}
      </div>
    </div>
  );
}
