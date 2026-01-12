import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Calendar, Music, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>

      {/* Active festival card */}
      {activeFestival ? (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-muted-foreground">Festival aktiv nå</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">{activeFestival.name}</h2>
          <div className="flex gap-3">
            <Button asChild variant="default">
              <Link to={`/admin/festivals/${activeFestival.id}`}>Rediger</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/admin/festivals/${activeFestival.id}/sections`}>Seksjoner</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to={`/festival/${activeFestival.slug}`} target="_blank">Se live →</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <span className="text-muted-foreground">Ingen aktiv festival</span>
          </div>
          <Button asChild>
            <Link to="/admin/festivals/new">Opprett festival</Link>
          </Button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link 
          to="/admin/festivals" 
          className="bg-card border border-border rounded-lg p-6 hover:border-accent transition-colors"
        >
          <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-3xl font-bold text-foreground">{stats?.festivals || 0}</p>
          <p className="text-muted-foreground">Festivaler</p>
        </Link>
        
        <Link 
          to="/admin/events" 
          className="bg-card border border-border rounded-lg p-6 hover:border-accent transition-colors"
        >
          <Music className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-3xl font-bold text-foreground">{stats?.events || 0}</p>
          <p className="text-muted-foreground">Events</p>
        </Link>
        
        <Link 
          to="/admin/projects" 
          className="bg-card border border-border rounded-lg p-6 hover:border-accent transition-colors"
        >
          <Users className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-3xl font-bold text-foreground">{stats?.projects || 0}</p>
          <p className="text-muted-foreground">Artister</p>
        </Link>
        
        <Link 
          to="/admin/venues" 
          className="bg-card border border-border rounded-lg p-6 hover:border-accent transition-colors"
        >
          <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-3xl font-bold text-foreground">{stats?.venues || 0}</p>
          <p className="text-muted-foreground">Venues</p>
        </Link>
      </div>
    </div>
  );
}
