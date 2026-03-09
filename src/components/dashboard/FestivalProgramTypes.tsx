import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProgramSlotType, ProgramSlotTypeCategory } from "@/types/program-slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LoadingState } from "@/components/ui/LoadingState";
import { Plus, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_OPTIONS: { value: ProgramSlotTypeCategory; label: string }[] = [
  { value: "concert", label: "Konsert" },
  { value: "break", label: "Pause" },
  { value: "doors", label: "Dører" },
  { value: "intro", label: "Intro" },
  { value: "technical", label: "Teknisk" },
  { value: "other", label: "Annet" },
];

interface FestivalProgramTypesProps {
  festivalId: string;
}

export function FestivalProgramTypes({ festivalId }: FestivalProgramTypesProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState({
    code: "",
    label: "",
    category: "concert" as ProgramSlotTypeCategory,
  });

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["program-slot-types", festivalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_slot_types" as any)
        .select("*")
        .eq("festival_id", festivalId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ProgramSlotType[];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["program-slot-types", festivalId] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const code = newType.code.trim();
      const label = newType.label.trim();
      if (!code || !label) throw new Error("Code og label må fylles ut");
      const { error } = await supabase
        .from("program_slot_types" as any)
        .insert({
          festival_id: festivalId,
          code,
          label,
          category: newType.category,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setCreating(false);
      setNewType({ code: "", label: "", category: "concert" });
      toast({ title: "Type opprettet" });
    },
    onError: (e: Error) =>
      toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (partial: Partial<ProgramSlotType> & { id: string }) => {
      const { id, ...updates } = partial;
      const { error } = await supabase
        .from("program_slot_types" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Oppdatert" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("program_slot_types" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Type slettet" });
    },
  });

  if (isLoading) return <LoadingState message="Laster programtyper..." />;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Tag className="h-4 w-4 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Programtyper
          </h3>
        </div>
        <p className="text-xs text-muted-foreground/60">
          Definer hvilke typer slots du vil bruke (konsert, pause, dører, osv.)
          og om de skal være synlige for publikum.
        </p>
      </div>

      {/* Existing types */}
      <div className="space-y-2">
        {types.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 p-2 rounded-md border border-border/20 bg-muted/10"
          >
            <Input
              className="h-8 w-24 text-xs"
              defaultValue={t.code}
              placeholder="kode"
              onBlur={(e) =>
                e.target.value.trim() !== t.code &&
                updateMutation.mutate({ id: t.id, code: e.target.value.trim() })
              }
            />
            <Input
              className="h-8 flex-1 text-xs"
              defaultValue={t.label}
              placeholder="Label"
              onBlur={(e) =>
                e.target.value !== t.label &&
                updateMutation.mutate({ id: t.id, label: e.target.value })
              }
            />
            <Select
              value={t.category}
              onValueChange={(v) =>
                updateMutation.mutate({
                  id: t.id,
                  category: v as ProgramSlotTypeCategory,
                })
              }
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}</SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 shrink-0">
              <Label className="text-[10px] text-muted-foreground/60">Pub</Label>
              <Switch
                className="scale-75"
                checked={t.is_public_visible}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({ id: t.id, is_public_visible: checked })
                }
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive shrink-0"
              onClick={() => {
                if (confirm("Slette denne programtypen?"))
                  deleteMutation.mutate(t.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Create new */}
      {!creating ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 border-border/30"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-3 w-3" />
          Ny programtype
        </Button>
      ) : (
        <div className="flex items-center gap-2 p-2 rounded-md border border-accent/30 bg-accent/5">
          <Input
            className="h-8 w-24 text-xs"
            placeholder="kode"
            value={newType.code}
            onChange={(e) => setNewType((t) => ({ ...t, code: e.target.value }))}
          />
          <Input
            className="h-8 flex-1 text-xs"
            placeholder="Label"
            value={newType.label}
            onChange={(e) => setNewType((t) => ({ ...t, label: e.target.value }))}
          />
          <Select
            value={newType.category}
            onValueChange={(v) =>
              setNewType((t) => ({ ...t, category: v as ProgramSlotTypeCategory }))
            }
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}</SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            Lagre
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setCreating(false)}
          >
            Avbryt
          </Button>
        </div>
      )}
    </div>
  );
}
