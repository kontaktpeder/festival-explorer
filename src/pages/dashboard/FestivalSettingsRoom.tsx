import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import AdminSections from "@/pages/admin/AdminSections";
import { FestivalDocuments } from "@/components/dashboard/FestivalDocuments";
import { FestivalProgramTypes } from "@/components/dashboard/FestivalProgramTypes";
import { Separator } from "@/components/ui/separator";
import { FestivalCaseEditor } from "@/components/dashboard/FestivalCaseEditor";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFinancePayers } from "@/hooks/useFinancePayers";
import { toast } from "sonner";

export default function FestivalSettingsRoom() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: festival, isLoading } = useQuery({
    queryKey: ["festival-shell", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug, finance_owner_persona_id")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: payers = [] } = useFinancePayers(id);

  const updateOwner = useMutation({
    mutationFn: async (personaId: string | null) => {
      const { error } = await supabase
        .from("festivals")
        .update({ finance_owner_persona_id: personaId } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-shell", id] });
      toast.success("Økonomiansvarlig oppdatert");
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke oppdatere"),
  });

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  return (
    <BackstageShell
      title="Innstillinger"
      subtitle={festival?.name}
      backTo={`/dashboard/festival/${id}`}
      externalLink={
        festival?.slug
          ? { to: `/festival/${festival.slug}`, label: "Se live" }
          : undefined
      }
    >
      <div className="space-y-8">
        {/* Finance owner for ENK */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Økonomiansvarlig (ENK)</h3>
          <p className="text-xs text-muted-foreground">
            Personen som brukes som «Betalt av» i ENK CSV-eksport.
          </p>
          <div className="max-w-xs">
            <Label htmlFor="finance-owner" className="sr-only">Økonomiansvarlig</Label>
            <Select
              value={(festival as any)?.finance_owner_persona_id ?? "__none__"}
              onValueChange={(v) => updateOwner.mutate(v === "__none__" ? null : v)}
            >
              <SelectTrigger id="finance-owner"><SelectValue placeholder="Velg person" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ingen valgt</SelectItem>
                {payers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator className="opacity-20" />
        <FestivalCaseEditor festivalId={id!} festivalSlug={festival?.slug} />
        <Separator className="opacity-20" />
        <FestivalDocuments festivalId={id!} />
        <Separator className="opacity-20" />
        <FestivalProgramTypes festivalId={id!} />
        <Separator className="opacity-20" />
        <AdminSections />
      </div>
    </BackstageShell>
  );
}