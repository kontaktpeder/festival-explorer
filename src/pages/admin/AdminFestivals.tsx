import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, ExternalLink, Settings, Calendar, Archive, ArchiveRestore, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";

export default function AdminFestivals() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(() => {
    try { return localStorage.getItem("showArchivedFestivals") === "true"; } catch { return false; }
  });
  const toggleShowArchived = (v: boolean) => {
    setShowArchived(v);
    try { localStorage.setItem("showArchivedFestivals", String(v)); } catch {}
  };

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data || false;
    },
  });

  const { data: festivals, isLoading } = useQuery({
    queryKey: ["admin-festivals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("festivals")
        .select("*, theme:themes(*)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: canEditMap } = useQuery({
    queryKey: ["can-edit-festivals", festivals?.map((f) => f.id)],
    queryFn: async () => {
      const map: Record<string, boolean> = {};
      for (const f of festivals || []) {
        const { data } = await supabase.rpc("can_edit_festival", { p_festival_id: f.id });
        map[f.id] = !!data;
      }
      return map;
    },
    enabled: !!festivals && festivals.length > 0 && !isAdmin,
  });

  const canEdit = (festivalId: string) => isAdmin || canEditMap?.[festivalId];

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" }) => {
      await supabase.from("festivals").update({ status }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festivals"] });
    },
  });

  const archiveFestival = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase.rpc("archive_festival_with_events", {
        p_festival_id: id,
        p_archive: archive,
      });
      if (error) throw error;
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-festivals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success(archive ? "Festival og tilknyttede events arkivert" : "Festival og events gjenopprettet");
    },
    onError: (err: Error) => {
      toast.error("Feil: " + err.message);
    },
  });

  const activeList = (festivals ?? []).filter((f) => !(f as any).archived_at);
  const archivedList = (festivals ?? []).filter((f) => !!(f as any).archived_at);

  if (isLoading) {
    return <div className="text-muted-foreground">Laster festivaler...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {isAdmin ? "Festivaler" : "Mine festivaler"}
        </h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} className="scale-75" />
            Vis arkiverte
          </label>
          {isAdmin && (
            <Button asChild size="sm" className="md:size-default">
              <Link to="/admin/festivals/new">
                <Plus className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Ny festival</span>
                <span className="sm:hidden">Ny</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((festival) => {
          const isArchived = !!(festival as any).archived_at;
          return (
            <div
              key={festival.id}
              className={`bg-card border border-border rounded-lg p-3 md:p-6 ${isArchived ? "opacity-60" : ""}`}
            >
              <div className="flex flex-col gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-base md:text-xl font-semibold text-foreground truncate">
                        {festival.name}
                      </h2>
                      <Badge variant={festival.status === "published" ? "default" : "secondary"} className="text-[10px] md:text-xs shrink-0">
                        {festival.status === "published" ? "Publisert" : "Utkast"}
                      </Badge>
                      {isArchived && (
                        <Badge variant="outline" className="text-[10px] md:text-xs shrink-0 text-muted-foreground">
                          Arkivert
                        </Badge>
                      )}
                    </div>
                    <Button asChild variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                      <Link to={`/festival/${festival.slug}`} target="_blank">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                  
                  {festival.start_at && (
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {format(new Date(festival.start_at), "d. MMM yyyy", { locale: nb })}
                      {festival.end_at && ` – ${format(new Date(festival.end_at), "d. MMM yyyy", { locale: nb })}`}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs md:text-sm">
                    <Link to={`/admin/festivals/${festival.id}/program`}>
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Program
                    </Link>
                  </Button>
                  {canEdit(festival.id) && (
                    <Button asChild size="sm" className="h-auto px-3 py-1.5 text-xs md:text-sm bg-accent hover:bg-accent/90 text-accent-foreground border-accent">
                      <Link to={`/admin/festivals/${festival.id}/workspace`}>
                        <Settings className="h-3.5 w-3.5 mr-1" />
                        Åpne festivalrom
                      </Link>
                    </Button>
                  )}
                  {canEdit(festival.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs md:text-sm"
                      onClick={() => archiveFestival.mutate({ id: festival.id, archive: !isArchived })}
                    >
                      {isArchived ? (
                        <><ArchiveRestore className="h-3.5 w-3.5 mr-1" />Gjenopprett</>
                      ) : (
                        <><Archive className="h-3.5 w-3.5 mr-1" />Arkiver</>
                      )}
                    </Button>
                  )}
                </div>

                <div className="pt-2 border-t border-border">
                  <Button
                    variant={festival.status === "published" ? "outline" : "default"}
                    size="sm"
                    className="h-8 text-xs md:text-sm"
                    onClick={() => toggleStatus.mutate({
                      id: festival.id,
                      status: festival.status === "published" ? "draft" : "published"
                    })}
                  >
                    {festival.status === "published" ? "Gjør til utkast" : "Publiser"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{showArchived ? "Ingen festivaler funnet." : "Ingen aktive festivaler."}</p>
            {!showArchived && isAdmin && (
              <Button asChild className="mt-4">
                <Link to="/admin/festivals/new">Opprett din første festival</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
