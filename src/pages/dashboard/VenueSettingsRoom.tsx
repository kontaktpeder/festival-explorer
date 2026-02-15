import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

export default function VenueSettingsRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue-room", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("venues")
        .select("id, name, slug")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <LoadingState message="Laster..." />;
  if (!venue || !id) return <p className="p-8 text-muted-foreground">Venue ikke funnet.</p>;

  return (
    <div className="min-h-[100svh] bg-background">
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/venue/${id}`)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            BACKSTAGE · Innstillinger
          </span>
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">
          Innstillinger for {venue.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Innstillinger kommer snart.
        </p>
      </main>
    </div>
  );
}
