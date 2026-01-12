import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, Plus, Trash2, ArrowLeft, Eye, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/LoadingState";
import { useState } from "react";

export default function AdminFestivalProgram() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState("");

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
        .select("*, event:events(*)")
        .eq("festival_id", id)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  // Fetch all events for adding
  const { data: allEvents } = useQuery({
    queryKey: ["admin-all-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title")
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

  // Move event mutation
  const moveEvent = useMutation({
    mutationFn: async ({ eventId, direction }: { eventId: string; direction: "up" | "down" }) => {
      const currentItem = festivalEvents?.find((fe) => fe.event_id === eventId);
      if (!currentItem || !festivalEvents) return;

      const currentOrder = currentItem.sort_order;
      const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
      const swapItem = festivalEvents.find((fe) => fe.sort_order === newOrder);

      if (!swapItem) return;

      await supabase
        .from("festival_events")
        .update({ sort_order: newOrder })
        .eq("festival_id", id)
        .eq("event_id", eventId);

      await supabase
        .from("festival_events")
        .update({ sort_order: currentOrder })
        .eq("festival_id", id)
        .eq("event_id", swapItem.event_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-events", id] });
    },
  });

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

      {/* Add event */}
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

      {/* Festival events list */}
      <div className="space-y-2">
        {festivalEvents?.map((fe, index) => (
          <div
            key={fe.event_id}
            className={`bg-card border rounded-lg p-3 md:p-4 ${
              fe.show_in_program ? "border-border" : "border-border/50 opacity-60"
            }`}
          >
            {/* Mobile layout */}
            <div className="flex flex-col gap-2 md:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-5 flex-shrink-0">{index + 1}</span>
                  <p className="font-medium text-sm text-foreground truncate">{fe.event?.title}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant={fe.is_featured ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleIsFeatured.mutate({
                      eventId: fe.event_id,
                      isFeatured: !fe.is_featured,
                    })}
                  >
                    <Star className={`h-3 w-3 ${fe.is_featured ? "fill-current" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleShowInProgram.mutate({
                      eventId: fe.event_id,
                      showInProgram: !fe.show_in_program,
                    })}
                  >
                    {fe.show_in_program ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveEvent.mutate({ eventId: fe.event_id, direction: "up" })}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveEvent.mutate({ eventId: fe.event_id, direction: "down" })}
                    disabled={index === festivalEvents.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (confirm("Fjern fra festival?")) {
                      removeEvent.mutate(fe.event_id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-muted-foreground w-8 text-center">{index + 1}</span>
              
              <div className="flex-1">
                <p className="font-medium text-foreground">{fe.event?.title}</p>
              </div>

              <Button
                variant={fe.is_featured ? "default" : "ghost"}
                size="sm"
                onClick={() => toggleIsFeatured.mutate({
                  eventId: fe.event_id,
                  isFeatured: !fe.is_featured,
                })}
                title={fe.is_featured ? "Fjern fra featured" : "Sett som featured"}
              >
                <Star className={`h-4 w-4 ${fe.is_featured ? "fill-current" : ""}`} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleShowInProgram.mutate({
                  eventId: fe.event_id,
                  showInProgram: !fe.show_in_program,
                })}
                title={fe.show_in_program ? "Skjul fra program" : "Vis i program"}
              >
                {fe.show_in_program ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveEvent.mutate({ eventId: fe.event_id, direction: "up" })}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveEvent.mutate({ eventId: fe.event_id, direction: "down" })}
                  disabled={index === festivalEvents.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Fjern fra festival?")) {
                    removeEvent.mutate(fe.event_id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

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
