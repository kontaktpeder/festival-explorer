import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { Plus, Trash2, Eye, EyeOff, Star } from "lucide-react";
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Program</h1>
        <p className="text-sm text-muted-foreground">{festival?.name}</p>
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

      {/* Festival events list - public accordion style */}
      {festivalEvents && festivalEvents.length > 0 ? (
        (() => {
          // Group by day
          const eventsByDay = festivalEvents.reduce((acc, fe) => {
            if (!fe.event) return acc;
            const day = format(new Date(fe.event.start_at), "EEEE d. MMM", { locale: nb });
            if (!acc[day]) acc[day] = [];
            acc[day].push(fe);
            return acc;
          }, {} as Record<string, typeof festivalEvents>);

          return (
            <div className="space-y-10">
              {Object.entries(eventsByDay).map(([day, dayEvents], dayIndex) => (
                <div key={day}>
                  <div className="text-mono text-[10px] uppercase tracking-[0.2em] text-accent/60 mb-6">
                    {day}
                  </div>
                  <div className="space-y-0">
                    {dayEvents.map((fe) => {
                      const ev = fe.event;
                      if (!ev) return null;
                      const startTime = new Date(ev.start_at);
                      return (
                        <div
                          key={fe.event_id}
                          className={cn(
                            "py-5 border-b border-foreground/5 last:border-0 flex items-start gap-4",
                            !fe.show_in_program && "opacity-40"
                          )}
                        >
                          {/* Time */}
                          <div className="flex-shrink-0 w-14 pt-1">
                            <span className="text-mono text-xs text-foreground/40">
                              {format(startTime, "HH:mm")}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <Link to={`/event/${ev.slug}`} className="block group">
                              <h3 className="text-display text-lg md:text-xl text-foreground/90 group-hover:text-accent transition-colors duration-300 leading-tight">
                                {ev.title}
                              </h3>
                            </Link>
                            {(ev as any).venue && (
                              <p className="mt-1 text-xs text-foreground/30">
                                {(ev as any).venue.name}
                              </p>
                            )}
                          </div>

                          {/* Admin actions */}
                          {canEditProgram && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleIsFeatured.mutate({ eventId: fe.event_id, isFeatured: !fe.is_featured })}
                                title={fe.is_featured ? "Fjern fra featured" : "Sett som featured"}
                              >
                                <Star className={cn("h-3.5 w-3.5 text-foreground/30", fe.is_featured && "fill-current text-accent")} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleShowInProgram.mutate({ eventId: fe.event_id, showInProgram: !fe.show_in_program })}
                                title={fe.show_in_program ? "Skjul fra program" : "Vis i program"}
                              >
                                {fe.show_in_program
                                  ? <Eye className="h-3.5 w-3.5 text-foreground/30" />
                                  : <EyeOff className="h-3.5 w-3.5 text-foreground/20" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => { if (confirm("Fjern fra festival?")) removeEvent.mutate(fe.event_id); }}
                                title="Fjern fra festival"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        <div className="text-center py-8 md:py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          <p className="text-sm">Ingen events i programmet ennå.</p>
          <p className="text-xs mt-2">Velg en event fra listen over.</p>
        </div>
      )}
    </div>
  );
}
