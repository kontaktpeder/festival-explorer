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
    return <div className="text-muted-foreground p-4">Laster venues...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Venues</h1>
        <Button asChild size="sm">
          <Link to="/admin/venues/new">
            <Plus className="h-4 w-4 mr-2" />
            Nytt venue
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {venues?.map((venue) => (
          <div
            key={venue.id}
            className="bg-card border border-border rounded-lg p-4 md:p-6"
          >
            {/* Mobile layout */}
            <div className="flex flex-col gap-3 md:hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <h2 className="text-base font-semibold text-foreground truncate">
                    {venue.name}
                  </h2>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link to={`/admin/venues/${venue.id}`}>
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link to={`/venue/${venue.slug}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={venue.is_published ? "default" : "outline"} className="text-xs">
                  {venue.is_published ? "Publisert" : "Utkast"}
                </Badge>
                {venue.city && (
                  <span className="text-sm text-muted-foreground">{venue.city}</span>
                )}
              </div>

              <Button
                variant={venue.is_published ? "outline" : "default"}
                size="sm"
                onClick={() => togglePublished.mutate({
                  id: venue.id,
                  is_published: !venue.is_published
                })}
                className="w-full"
              >
                {venue.is_published ? "Gjør til utkast" : "Publiser"}
              </Button>
            </div>

            {/* Desktop layout */}
            <div className="hidden md:block">
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
          </div>
        ))}

        {venues?.length === 0 && (
          <div className="text-center py-8 md:py-12 text-muted-foreground">
            <p className="text-sm">Ingen venues ennå.</p>
            <Button asChild className="mt-4" size="sm">
              <Link to="/admin/venues/new">Opprett ditt første venue</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
