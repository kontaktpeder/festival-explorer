import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, ExternalLink, Settings, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminVenues() {
  const queryClient = useQueryClient();

  const { data: venues, isLoading } = useQuery({
    queryKey: ["admin-venues"],
    queryFn: async () => {
      const { data } = await supabase
        .from("venues")
        .select("*")
        .order("name");
      return data || [];
    },
  });

  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      await supabase.from("venues").update({ is_published }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-venues"] });
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Laster venues...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Venues</h1>
        <Button asChild>
          <Link to="/admin/venues/new">
            <Plus className="h-4 w-4 mr-2" />
            Nytt venue
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {venues?.map((venue) => (
          <div
            key={venue.id}
            className="bg-card border border-border rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    {venue.name}
                  </h2>
                  <Badge variant={venue.is_published ? "default" : "outline"}>
                    {venue.is_published ? "Publisert" : "Utkast"}
                  </Badge>
                </div>
                
                {venue.city && (
                  <p className="text-muted-foreground">{venue.city}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/admin/venues/${venue.id}`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Rediger
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/venue/${venue.slug}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              <Button
                variant={venue.is_published ? "outline" : "default"}
                size="sm"
                onClick={() => togglePublished.mutate({
                  id: venue.id,
                  is_published: !venue.is_published
                })}
              >
                {venue.is_published ? "Gjør til utkast" : "Publiser"}
              </Button>
            </div>
          </div>
        ))}

        {venues?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Ingen venues ennå.</p>
            <Button asChild className="mt-4">
              <Link to="/admin/venues/new">Opprett ditt første venue</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
