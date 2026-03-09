import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface VenueScenesEditorProps {
  venueId: string;
}

export function VenueScenesEditor({ venueId }: VenueScenesEditorProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");

  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ["venue-scenes", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venue_scenes" as any)
        .select("id, name, sort_order")
        .eq("venue_id", venueId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; name: string; sort_order: number }[];
    },
    enabled: !!venueId,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("venue_scenes" as any)
        .insert({ venue_id: venueId, name, sort_order: scenes.length } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-scenes", venueId] });
      setNewName("");
      toast({ title: "Scene lagt til" });
    },
    onError: (e: Error) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("venue_scenes" as any)
        .update({ name } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-scenes", venueId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("venue_scenes" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-scenes", venueId] });
      toast({ title: "Scene fjernet" });
    },
    onError: (e: Error) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingState message="Laster scener..." />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Scener</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Legg inn etasjer eller scener (f.eks. 1. etasje, 2. etasje, Kjeller). Disse kan velges ved opprettelse av event.
        </p>
      </div>

      <div className="space-y-2">
        {scenes.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <Input
              defaultValue={s.name}
              className="flex-1"
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val && val !== s.name) {
                  updateMutation.mutate({ id: s.id, name: val });
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMutation.mutate(s.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) createMutation.mutate(newName.trim());
        }}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ny scene (f.eks. 1. etasje)"
          className="flex-1"
        />
        <Button type="submit" variant="outline" size="sm" disabled={!newName.trim() || createMutation.isPending}>
          <Plus className="h-4 w-4 mr-1" />
          Legg til
        </Button>
      </form>
    </div>
  );
}
