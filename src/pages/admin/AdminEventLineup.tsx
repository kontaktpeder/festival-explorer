import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, Plus, Trash2, ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/LoadingState";
import { useState } from "react";

export default function AdminEventLineup() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState("");

  // Fetch event info
  const { data: event } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, slug")
        .eq("id", id)
        .single();
      return data;
    },
  });

  // Fetch lineup
  const { data: lineup, isLoading } = useQuery({
    queryKey: ["admin-event-lineup", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_projects")
        .select("*, project:projects(*)")
        .eq("event_id", id)
        .order("billing_order", { ascending: true });
      return data || [];
    },
  });

  // Fetch all projects for adding
  const { data: allProjects } = useQuery({
    queryKey: ["admin-all-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  // Add to lineup mutation
  const addToLineup = useMutation({
    mutationFn: async (projectId: string) => {
      const maxOrder = lineup?.length || 0;
      const { error } = await supabase.from("event_projects").insert({
        event_id: id,
        project_id: projectId,
        billing_order: maxOrder,
        is_featured: false,
        feature_order: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-lineup", id] });
      setSelectedProject("");
      toast({ title: "Artist lagt til" });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Remove from lineup mutation
  const removeFromLineup = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("event_projects")
        .delete()
        .eq("event_id", id)
        .eq("project_id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-lineup", id] });
      toast({ title: "Artist fjernet" });
    },
  });

  // Toggle featured mutation
  const toggleFeatured = useMutation({
    mutationFn: async ({ projectId, isFeatured }: { projectId: string; isFeatured: boolean }) => {
      const featuredCount = lineup?.filter((l) => l.is_featured).length || 0;
      const { error } = await supabase
        .from("event_projects")
        .update({
          is_featured: isFeatured,
          feature_order: isFeatured ? featuredCount : 0,
        })
        .eq("event_id", id)
        .eq("project_id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-lineup", id] });
    },
  });

  // Move in lineup mutation
  const moveInLineup = useMutation({
    mutationFn: async ({ projectId, direction }: { projectId: string; direction: "up" | "down" }) => {
      const currentItem = lineup?.find((l) => l.project_id === projectId);
      if (!currentItem || !lineup) return;

      const currentOrder = currentItem.billing_order;
      const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
      const swapItem = lineup.find((l) => l.billing_order === newOrder);

      if (!swapItem) return;

      await supabase
        .from("event_projects")
        .update({ billing_order: newOrder })
        .eq("event_id", id)
        .eq("project_id", projectId);

      await supabase
        .from("event_projects")
        .update({ billing_order: currentOrder })
        .eq("event_id", id)
        .eq("project_id", swapItem.project_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-lineup", id] });
    },
  });

  // Available projects (not in lineup)
  const availableProjects = allProjects?.filter(
    (p) => !lineup?.some((l) => l.project_id === p.id)
  ) || [];

  if (isLoading) {
    return <LoadingState message="Laster lineup..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/admin/events/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lineup</h1>
          <p className="text-muted-foreground">{event?.title}</p>
        </div>
      </div>

      {/* Add to lineup */}
      <div className="flex gap-3">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Velg artist..." />
          </SelectTrigger>
          <SelectContent>
            {availableProjects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => selectedProject && addToLineup.mutate(selectedProject)}
          disabled={!selectedProject}
        >
          <Plus className="h-4 w-4 mr-2" />
          Legg til
        </Button>
      </div>

      {/* Lineup list */}
      <div className="space-y-2">
        {lineup?.map((item, index) => (
          <div
            key={item.project_id}
            className="bg-card border border-border rounded-lg p-4 flex items-center gap-4"
          >
            <span className="text-muted-foreground w-8 text-center">{index + 1}</span>
            
            <div className="flex-1">
              <p className="font-medium text-foreground">{item.project?.name}</p>
              {item.project?.tagline && (
                <p className="text-sm text-muted-foreground">{item.project.tagline}</p>
              )}
            </div>

            {/* Featured toggle */}
            <Button
              variant={item.is_featured ? "default" : "ghost"}
              size="sm"
              onClick={() => toggleFeatured.mutate({
                projectId: item.project_id,
                isFeatured: !item.is_featured,
              })}
            >
              <Star className={`h-4 w-4 ${item.is_featured ? "fill-current" : ""}`} />
            </Button>

            {/* Move buttons */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveInLineup.mutate({ projectId: item.project_id, direction: "up" })}
                disabled={index === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveInLineup.mutate({ projectId: item.project_id, direction: "down" })}
                disabled={index === lineup.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Remove button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Fjern fra lineup?")) {
                  removeFromLineup.mutate(item.project_id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        {lineup?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <p>Ingen artister i lineup ennå.</p>
            <p className="text-sm mt-2">Velg en artist fra listen over for å legge til.</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          <Star className="h-4 w-4 inline mr-1" /> = Featured artist (vises i festival-artister-seksjonen)
        </p>
      </div>
    </div>
  );
}
