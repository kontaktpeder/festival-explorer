import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Calendar, Music, Users, MapPin, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeGenerator } from "@/components/admin/QRCodeGenerator";
import { getPublicUrl } from "@/lib/utils";

export default function AdminDashboard() {
  const { data: activeFestival } = useQuery({
    queryKey: ["admin-active-festival"],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("*")
        .eq("status", "published")
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

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
  });

  return (
    <div className="space-y-4 md:space-y-8">
      <h1 className="text-xl md:text-3xl font-bold text-foreground">Dashboard</h1>

      {/* Active festival card */}
      {activeFestival ? (
        <div className="bg-card border border-border rounded-lg p-3 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs md:text-sm text-muted-foreground">Festival aktiv nå</span>
          </div>
          <h2 className="text-lg md:text-2xl font-bold text-foreground mb-3">{activeFestival.name}</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="default" size="sm">
              <Link to={`/admin/festivals/${activeFestival.id}`}>Rediger</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/festival/${activeFestival.slug}`} target="_blank">Se live →</Link>
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

      {/* QR Code Generator */}
      <QRCodeGenerator 
        defaultUrl={activeFestival ? `${getPublicUrl()}/festival/${activeFestival.slug}` : undefined} 
      />

      {/* Scan billetter card */}
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

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-4">
        <Link 
          to="/admin/festivals" 
          className="bg-card border border-border rounded-lg p-3 md:p-6 active:bg-muted hover:border-accent transition-colors"
        >
          <Calendar className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground mb-1.5" />
          <p className="text-xl md:text-3xl font-bold text-foreground">{stats?.festivals || 0}</p>
          <p className="text-xs md:text-sm text-muted-foreground">Festivaler</p>
        </Link>
        
        <Link 
          to="/admin/events" 
          className="bg-card border border-border rounded-lg p-3 md:p-6 active:bg-muted hover:border-accent transition-colors"
        >
          <Music className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground mb-1.5" />
          <p className="text-xl md:text-3xl font-bold text-foreground">{stats?.events || 0}</p>
          <p className="text-xs md:text-sm text-muted-foreground">Events</p>
        </Link>
        
        <Link 
          to="/admin/projects" 
          className="bg-card border border-border rounded-lg p-3 md:p-6 active:bg-muted hover:border-accent transition-colors"
        >
          <Users className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground mb-1.5" />
          <p className="text-xl md:text-3xl font-bold text-foreground">{stats?.projects || 0}</p>
          <p className="text-xs md:text-sm text-muted-foreground">Artister</p>
        </Link>
        
        <Link 
          to="/admin/venues" 
          className="bg-card border border-border rounded-lg p-3 md:p-6 active:bg-muted hover:border-accent transition-colors"
        >
          <MapPin className="h-5 w-5 md:h-8 md:w-8 text-muted-foreground mb-1.5" />
          <p className="text-xl md:text-3xl font-bold text-foreground">{stats?.venues || 0}</p>
          <p className="text-xs md:text-sm text-muted-foreground">Venues</p>
        </Link>
      </div>
    </div>
  );
}
