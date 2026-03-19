import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, User, Building2, Music2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCreditsSearch, type CreditCandidate } from "@/hooks/useCreditsSearch";
import { usePublicPageCredits, type CreditScope } from "@/hooks/usePublicPageCredits";
import { useResolvedCredits } from "@/hooks/useResolvedCredits";

type Props = {
  scope: CreditScope;
  festivalId?: string;
  title?: string;
};

const kindIcon = {
  persona: User,
  entity: Music2,
  venue: Building2,
} as const;

const kindLabel = {
  persona: "Persona",
  entity: "Prosjekt",
  venue: "Venue",
} as const;

function slugPreview(c: CreditCandidate): string {
  if (c.kind === "persona") return c.slug ? `/p/${c.slug}` : "";
  if (c.kind === "venue") return c.slug ? `/venue/${c.slug}` : "";
  return c.slug ? `/project/${c.slug}` : "";
}

export function CreditsPickerEditor({ scope, festivalId, title = "Credits" }: Props) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [roleInput, setRoleInput] = useState("");

  const { data: credits = [] } = usePublicPageCredits(scope, festivalId);
  const { data: resolved = [] } = useResolvedCredits(credits);
  const { data: candidates = [], isLoading: searching } = useCreditsSearch(query);

  const addMutation = useMutation({
    mutationFn: async (payload: { participant_kind: string; participant_id: string; role_label: string }) => {
      const nextSort = credits.length ? Math.max(...credits.map((c) => c.sort_order || 0)) + 1 : 1;
      const { error } = await (supabase as any).from("public_page_credits").insert({
        scope,
        festival_id: scope === "festival_case" ? festivalId : null,
        participant_kind: payload.participant_kind,
        participant_id: payload.participant_id,
        role_label: payload.role_label.trim(),
        sort_order: nextSort,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["public-page-credits", scope, festivalId || null] });
      setRoleInput("");
      setQuery("");
      toast({ title: "Credit lagt til" });
    },
    onError: (e: any) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("public_page_credits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["public-page-credits", scope, festivalId || null] });
      toast({ title: "Credit fjernet" });
    },
  });

  const shownCandidates = useMemo(() => candidates.slice(0, 8), [candidates]);
  const canAdd = roleInput.trim().length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Søk opp persona, prosjekt eller venue og legg til med rolle.
        </p>
      </div>

      {/* Search + role inputs */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-sm">Søk</Label>
          <Input
            value={query}
            placeholder="Navn…"
            onChange={(e) => setQuery(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm">Rolle</Label>
          <Input
            value={roleInput}
            placeholder="F.eks. Foto, Lyd, Venue…"
            onChange={(e) => setRoleInput(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Candidate results */}
      {query.trim().length >= 2 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 max-h-64 overflow-y-auto">
          {searching ? (
            <p className="text-xs text-muted-foreground py-2">Søker…</p>
          ) : shownCandidates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Ingen treff.</p>
          ) : (
            shownCandidates.map((c) => {
              const Icon = kindIcon[c.kind];
              return (
                <div key={`${c.kind}-${c.id}`} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{kindLabel[c.kind]}</span>
                    {c.slug && (
                      <span className="text-[10px] text-muted-foreground/50 truncate hidden sm:inline">
                        {slugPreview(c)}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!canAdd || addMutation.isPending}
                    className="h-7 text-xs gap-1"
                    onClick={() =>
                      addMutation.mutate({
                        participant_kind: c.kind,
                        participant_id: c.id,
                        role_label: roleInput,
                      })
                    }
                  >
                    <Plus className="h-3 w-3" /> Legg til
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Current credits */}
      {credits.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium mb-1">Lagt til ({credits.length})</p>
          {credits.map((credit, i) => {
            const r = resolved[i];
            const name = r?.persona?.name || r?.entity?.name || credit.participant_id.slice(0, 8);
            const slug = r?.persona?.slug
              ? `/p/${r.persona.slug}`
              : r?.entity?.slug && r?.entity?.type
              ? r.entity.type === "venue"
                ? `/venue/${r.entity.slug}`
                : `/project/${r.entity.slug}`
              : null;

            return (
              <div key={credit.id} className="flex items-center justify-between py-1.5 px-2 rounded border border-border/40 bg-background">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{credit.role_label}</span>
                  {slug && (
                    <span className="text-[10px] text-muted-foreground/50 ml-2 hidden sm:inline">{slug}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(credit.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
