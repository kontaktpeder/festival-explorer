import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Calendar, Music, Users, MapPin, QrCode, FolderOpen, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeGenerator } from "@/components/admin/QRCodeGenerator";
import { getPublicUrl } from "@/lib/utils";

export default function AdminDashboard() {
  const [previewAsTeam, setPreviewAsTeam] = useState(false);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data || false;
    },
  });

  const showAsAdmin = isAdmin && !previewAsTeam;

  const { data: myFestivals } = useQuery({
    queryKey: ["admin-my-festivals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug, status, start_at, end_at")
        .order("start_at", { ascending: false });
      return data || [];
    },
  });

  const { data: myFestivalsAsTeam } = useQuery({
    queryKey: ["admin-my-festivals-as-team"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_festivals_as_team");
      return data || [];
    },
    enabled: !!isAdmin && !!previewAsTeam,
  });

  const festivalsToShow =
    isAdmin && previewAsTeam ? (myFestivalsAsTeam ?? []) : (myFestivals ?? []);

  const publishedFestival = myFestivals?.find((f) => f.status === "published") ?? myFestivals?.[0] ?? null;

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [festivals, events, projects, venues] = await Promise.all([
        supabase.from("festivals").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("venues").select("id", { count: "exact", head: true }),
      ]);
      return {
        festivals: festivals.count || 0,
        events: events.count || 0,
        projects: projects.count || 0,
        venues: venues.count || 0,
      };
    },
    enabled: !!isAdmin,
  });

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-3xl font-bold text-foreground">
          {showAsAdmin ? "Dashboard" : "Mine festivaler"}
        </h1>
        {isAdmin && (
          <Button
            variant={previewAsTeam ? "default" : "outline"}
            size="sm"
            onClick={() => setPreviewAsTeam(!previewAsTeam)}
            className="shrink-0"
          >
            <Eye className="h-4 w-4 mr-1.5" />
            {previewAsTeam ? "Tilbake til admin" : "Vis som festivalsjef"}
          </Button>
        )}
      </div>

      {previewAsTeam && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 text-xs text-accent">
          Forhåndsvisning: Du ser dashboardet slik en festivalsjef ville sett det.
        </div>
      )}

      {/* Festival team view */}
      {!showAsAdmin && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Oversikt over festivalene du har tilgang til. Her kan du redigere innhold, program og team.
          </p>

          {festivalsToShow.length > 0 ? (
            <div className="space-y-3">
              {festivalsToShow.map((festival) => (
                <div key={festival.id} className="bg-card border border-border rounded-lg p-3 md:p-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-foreground">{festival.name}</h2>
                      {festival.start_at && (
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                          {new Date(festival.start_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}
                          {festival.end_at && ` – ${new Date(festival.end_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}`}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${festival.status === "published" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {festival.status === "published" ? "Publisert" : "Utkast"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="default" size="sm">
                      <Link to={`/admin/festivals/${festival.id}`}>Rediger</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/admin/festivals/${festival.id}/program`}>Program</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/festival/${festival.slug}`} target="_blank">Se live →</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <p className="text-sm font-medium text-foreground">Du har ikke tilgang til noen festivaler ennå.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {previewAsTeam
                  ? "Forhåndsvisning: En festivalsjef uten tilgang ville sett dette."
                  : "Be admin om å legge deg til i festival-teamet."}
              </p>
            </div>
          )}

          {/* Quick links for festival team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-3 md:p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <QrCode className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                <h3 className="text-sm md:text-base font-semibold text-foreground">Scan billetter</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Valider billetter på arrangementet.</p>
              <Button asChild size="sm">
                <Link to="/crew/checkin">Åpne scanner</Link>
              </Button>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 md:p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <FolderOpen className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                <h3 className="text-sm md:text-base font-semibold text-foreground">Filbank</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Last opp og organiser mediefiler og bilder.</p>
              <Button asChild size="sm">
                <Link to="/admin/media">Åpne filbank</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin view */}
      {showAsAdmin && (
        <>
          {publishedFestival ? (
            <div className="bg-card border border-border rounded-lg p-3 md:p-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs md:text-sm text-muted-foreground">Festival aktiv nå</span>
              </div>
              <h2 className="text-lg md:text-2xl font-bold text-foreground mb-3">{publishedFestival.name}</h2>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="default" size="sm">
                  <Link to={`/admin/festivals/${publishedFestival.id}`}>Rediger</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/festival/${publishedFestival.slug}`} target="_blank">Se live →</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-3 md:p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-xs md:text-sm text-muted-foreground">Ingen aktiv festival</span>
              </div>
              <Button asChild size="sm">
                <Link to="/admin/festivals/new">Opprett festival</Link>
              </Button>
            </div>
          )}

          <QRCodeGenerator
            defaultUrl={publishedFestival ? `${getPublicUrl()}/festival/${publishedFestival.slug}` : undefined}
          />

          <div className="bg-card border border-border rounded-lg p-3 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="h-4 w-4 md:h-5 md:w-5 text-accent" />
              <h3 className="text-base md:text-lg font-semibold text-foreground">Scan billetter</h3>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mb-3">
              Skriv inn billettkode eller scan QR-kode for å validere billetter.
            </p>
            <Button asChild size="sm">
              <Link to="/crew/checkin">Åpne scanner</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 md:gap-4">
            <Link to="/admin/festivals" className="bg-card border border-border rounded-lg p-3 md:p-6 active:bg-muted hover:border-accent transition-colors">
              <Calendar className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground mb-1.5" />
              <p className="text-xl md:text-3xl font-bold text-foreground">{stats?.festivals || 0}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Festivaler</p>
            </Link>
            <Link to="/admin/events" className="bg-card border border-border rounded-lg p-3 md:p-6 active:bg-muted hover:border-accent transition-colors">
              <Music className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground mb-1.5" />
              <p className="text-xl md:text-3xl font-bold text-foreground">{stats?.events || 0}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Events</p>
            </Link>
            <Link to="/admin/projects" className="bg-card border border-border rounded-lg p-3 md:p-6 active:bg-muted hover:border-accent transition-colors">
              <Users className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground mb-1.5" />
              <p className="text-xl md:text-3xl font-bold text-foreground">{stats?.projects || 0}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Artister</p>
            </Link>
            <Link to="/admin/venues" className="bg-card border border-border rounded-lg p-3 md:p-6 active:bg-muted hover:border-accent transition-colors">
              <MapPin className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground mb-1.5" />
              <p className="text-xl md:text-3xl font-bold text-foreground">{stats?.venues || 0}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Venues</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
