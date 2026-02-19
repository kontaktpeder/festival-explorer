import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { VenueStaffEditor } from "@/components/venues/VenueStaffEditor";
import gIcon from "@/assets/giggen-g-icon-red.png";
import { useSelectedPersonaId } from "@/components/dashboard/PersonaSelector";

export default function VenueTeamRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const selectedPersonaId = useSelectedPersonaId();

  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue-room", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("venues")
        .select("id, name, slug, created_by")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // Check if user can manage staff
  const { data: canEdit } = useQuery({
    queryKey: ["venue-team-can-edit", id, venue?.created_by, selectedPersonaId],
    queryFn: async () => {
      if (!venue) return false;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      if (venue.created_by === user.id) return true;

      const personaIds = selectedPersonaId ? [selectedPersonaId] : [];
      if (personaIds.length === 0) return false;

      const { data: staff } = await supabase
        .from("venue_staff")
        .select("can_manage_staff, can_edit_venue")
        .eq("venue_id", id!)
        .in("persona_id", personaIds);

      return staff?.some((s) => s.can_manage_staff || s.can_edit_venue) ?? false;
    },
    enabled: !!id && !!venue,
  });

  if (isLoading) return <LoadingState message="Laster..." />;
  if (!venue || !id)
    return <p className="p-8 text-muted-foreground">Scene ikke funnet.</p>;

  return (
    <div className="min-h-[100svh] bg-background">
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/dashboard/venue/${id}`)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              BACKSTAGE · Team
            </span>
          </div>
          <img src={gIcon} alt="" className="h-8 w-8 object-contain" />
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 max-w-2xl">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">
          Team for {venue.name}
        </h2>
        <VenueStaffEditor venueId={id} canEdit={canEdit ?? false} />
      </main>
    </div>
  );
}
