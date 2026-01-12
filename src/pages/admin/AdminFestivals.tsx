import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, ExternalLink, Settings, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default function AdminFestivals() {
  const queryClient = useQueryClient();

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

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" }) => {
      await supabase.from("festivals").update({ status }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festivals"] });
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Laster festivaler...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Festivaler</h1>
        <Button asChild>
          <Link to="/admin/festivals/new">
            <Plus className="h-4 w-4 mr-2" />
            Ny festival
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {festivals?.map((festival) => (
          <div
            key={festival.id}
            className="bg-card border border-border rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    {festival.name}
                  </h2>
                  <Badge variant={festival.status === "published" ? "default" : "secondary"}>
                    {festival.status === "published" ? "Publisert" : "Utkast"}
                  </Badge>
                </div>
                
                {festival.start_at && (
                  <p className="text-muted-foreground">
                    {format(new Date(festival.start_at), "d. MMMM yyyy", { locale: nb })}
                    {festival.end_at && ` – ${format(new Date(festival.end_at), "d. MMMM yyyy", { locale: nb })}`}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/admin/festivals/${festival.id}/sections`}>
                    <Layers className="h-4 w-4 mr-2" />
                    Seksjoner
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/admin/festivals/${festival.id}`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Rediger
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/festival/${festival.slug}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              <Button
                variant={festival.status === "published" ? "outline" : "default"}
                size="sm"
                onClick={() => toggleStatus.mutate({
                  id: festival.id,
                  status: festival.status === "published" ? "draft" : "published"
                })}
              >
                {festival.status === "published" ? "Gjør til utkast" : "Publiser"}
              </Button>
            </div>
          </div>
        ))}

        {festivals?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Ingen festivaler ennå.</p>
            <Button asChild className="mt-4">
              <Link to="/admin/festivals/new">Opprett din første festival</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
