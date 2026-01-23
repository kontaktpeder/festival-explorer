import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Calendar, Music, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeGenerator } from "@/components/admin/QRCodeGenerator";

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
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>

      {/* Active festival card */}
      {activeFestival ? (
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Festival aktiv nå</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">{activeFestival.name}</h2>
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
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Ingen aktiv festival</span>
          </div>
          <Button asChild size="sm">
            <Link to="/admin/festivals/new">Opprett festival</Link>
          </Button>
        </div>
      )}

      {/* QR Code Generator */}
      <QRCodeGenerator 
        defaultUrl={activeFestival ? `${window.location.origin}/festival/${activeFestival.slug}` : undefined} 
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Link 
          to="/admin/festivals" 
          className="bg-card border border-border rounded-lg p-4 md:p-6 hover:border-accent transition-colors"
        >
          <Calendar className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground mb-2" />
          <p className="text-2xl md:text-3xl font-bold text-foreground">{stats?.festivals || 0}</p>
          <p className="text-sm text-muted-foreground">Festivaler</p>
        </Link>
        
        <Link 
          to="/admin/events" 
          className="bg-card border border-border rounded-lg p-4 md:p-6 hover:border-accent transition-colors"
        >
          <Music className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground mb-2" />
          <p className="text-2xl md:text-3xl font-bold text-foreground">{stats?.events || 0}</p>
          <p className="text-sm text-muted-foreground">Events</p>
        </Link>
        
        <Link 
          to="/admin/projects" 
          className="bg-card border border-border rounded-lg p-4 md:p-6 hover:border-accent transition-colors"
        >
          <Users className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground mb-2" />
          <p className="text-2xl md:text-3xl font-bold text-foreground">{stats?.projects || 0}</p>
          <p className="text-sm text-muted-foreground">Artister</p>
        </Link>
        
        <Link 
          to="/admin/venues" 
          className="bg-card border border-border rounded-lg p-4 md:p-6 hover:border-accent transition-colors"
        >
          <MapPin className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground mb-2" />
          <p className="text-2xl md:text-3xl font-bold text-foreground">{stats?.venues || 0}</p>
          <p className="text-sm text-muted-foreground">Venues</p>
        </Link>
      </div>
    </div>
  );
}
