import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMyEntities } from "@/hooks/useEntity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector } from "@/components/dashboard/PersonaSelector";
import { 
  Music, 
  Users, 
  Building2, 
  Camera, 
  Compass, 
  Plus, 
  Settings, 
  ExternalLink,
  User,
  ArrowRight
} from "lucide-react";
import type { EntityType, AccessLevel } from "@/types/database";

const TYPE_CONFIG: Record<EntityType, { label: string; icon: React.ReactNode; route: string }> = {
  venue: { label: "Venue", icon: <Building2 className="h-4 w-4" />, route: "/venue" },
  solo: { label: "Solo", icon: <User className="h-4 w-4" />, route: "/project" },
  band: { label: "Band", icon: <Users className="h-4 w-4" />, route: "/project" },
};

const ACCESS_LABELS: Record<AccessLevel, string> = {
  owner: "Eier",
  admin: "Admin",
  editor: "Redaktør",
  viewer: "Leser",
};

interface OnboardingChoice {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
  action?: () => void;
  disabled?: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: entities, isLoading } = useMyEntities();
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; displayName?: string } | null>(null);
  const [hasExplored, setHasExplored] = useState(false);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
        return;
      }
      
      // Get profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .single();
      
      setCurrentUser({
        id: session.user.id,
        email: session.user.email || "",
        displayName: profile?.display_name || undefined,
      });
    };
    checkAuth();
  }, [navigate]);

  // Check if user has dismissed onboarding
  useEffect(() => {
    const explored = localStorage.getItem("onboarding_explored");
    setHasExplored(explored === "true");
  }, []);

  const handleExplore = () => {
    localStorage.setItem("onboarding_explored", "true");
    setHasExplored(true);
    navigate("/");
  };

  const showOnboarding = !isLoading && entities?.length === 0 && !hasExplored;
  const userName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "der";

  const onboardingChoices: OnboardingChoice[] = [
    {
      id: "artist",
      icon: <Music className="h-6 w-6" />,
      title: "Lage artist / band",
      description: "Opprett din første artist- eller bandprofil",
      link: "/admin/entities/new?type=solo",
    },
    {
      id: "venue",
      icon: <Building2 className="h-6 w-6" />,
      title: "Knyttes til venue",
      description: "Koble deg til et spillested eller lokale",
      link: "/admin/entities/new?type=venue",
    },
    {
      id: "profile",
      icon: <Camera className="h-6 w-6" />,
      title: "Lage offentlig profil",
      description: "Vis deg frem som person på GIGGEN",
      link: "/dashboard/personas/new",
    },
    {
      id: "explore",
      icon: <Compass className="h-6 w-6" />,
      title: "Bare utforske",
      description: "Se deg rundt uten å opprette noe",
      action: handleExplore,
    },
  ];

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Laster dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with PersonaSelector */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">
            GIGGEN
          </Link>
          <PersonaSelector />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome section */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Velkommen, {userName}!
          </h1>
          <p className="text-muted-foreground">
            {showOnboarding 
              ? "Hva vil du gjøre først?" 
              : "Administrer dine entities og se hva som skjer."
            }
          </p>
        </div>

        {/* Onboarding cards - only show if no entities and not explored */}
        {showOnboarding && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onboardingChoices.map((choice) => (
              <Card
                key={choice.id}
                className={`cosmic-card cursor-pointer transition-all ${
                  choice.disabled 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:border-accent/50"
                }`}
                onClick={() => {
                  if (choice.disabled) return;
                  if (choice.action) {
                    choice.action();
                  } else if (choice.link) {
                    navigate(choice.link);
                  }
                }}
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-secondary text-foreground">
                    {choice.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {choice.title}
                      {choice.disabled && (
                        <Badge variant="outline" className="text-xs">Snart</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {choice.description}
                    </p>
                  </div>
                  {!choice.disabled && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* My entities section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Mine entities ({entities?.length || 0})
            </h2>
            <Button asChild size="sm">
              <Link to="/admin/entities/new">
                <Plus className="h-4 w-4 mr-2" />
                Ny entity
              </Link>
            </Button>
          </div>

          {entities && entities.length > 0 ? (
            <div className="space-y-3">
              {entities.map((entity) => {
                const typeConfig = TYPE_CONFIG[entity.type as EntityType];
                
                return (
                  <div
                    key={entity.id}
                    className="bg-card border border-border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-secondary flex-shrink-0">
                          {typeConfig.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">
                              {entity.name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {ACCESS_LABELS[entity.access]}
                            </Badge>
                            {!entity.is_published && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Utkast
                              </Badge>
                            )}
                          </div>
                          {entity.tagline && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {entity.tagline}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link to={`/admin/entities/${entity.id}`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                        {entity.is_published && (
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <Link to={`${typeConfig.route}/${entity.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Du har ingen entities ennå.
                </p>
                <Button asChild>
                  <Link to="/admin/entities/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Opprett din første entity
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
