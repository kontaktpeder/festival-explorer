import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMyEntities, useMyEntitiesFilteredByPersona } from "@/hooks/useEntity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector, useSelectedPersonaId } from "@/components/dashboard/PersonaSelector";
import { useMyPersonas } from "@/hooks/usePersona";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Building2, 
  Camera, 
  Compass, 
  Pencil, 
  ExternalLink,
  User,
  ArrowRight,
  Eye,
  Sparkles,
  Filter,
  X,
  Plus,
  Music,
  CircleUser
} from "lucide-react";
import type { EntityType, AccessLevel } from "@/types/database";

const TYPE_CONFIG: Record<EntityType, { label: string; icon: React.ReactNode; route: string }> = {
  venue: { label: "Scene", icon: <Building2 className="h-4 w-4" />, route: "/project" },
  solo: { label: "Soloartist", icon: <User className="h-4 w-4" />, route: "/project" },
  band: { label: "Band", icon: <Users className="h-4 w-4" />, route: "/project" },
};

const ACCESS_LABELS: Record<AccessLevel, string> = {
  owner: "Eier",
  admin: "Administrer",
  editor: "Rediger",
  viewer: "Se",
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
  const selectedPersonaId = useSelectedPersonaId();
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; displayName?: string } | null>(null);
  const [hasExplored, setHasExplored] = useState(false);

  // Fetch personas
  const { data: personas, isLoading: isLoadingPersonas } = useMyPersonas();

  // Use filtered entities based on selected persona
  const { data: allEntities, isLoading: isLoadingAll } = useMyEntities();
  const { data: filteredEntities, isLoading: isLoadingFiltered } = useMyEntitiesFilteredByPersona(selectedPersonaId);
  
  const entities = selectedPersonaId ? filteredEntities : allEntities;
  const isLoading = selectedPersonaId ? isLoadingFiltered : isLoadingAll;

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

  const clearPersonaFilter = () => {
    localStorage.removeItem("selectedPersonaId");
    window.dispatchEvent(new Event("personaChanged"));
  };

  const showOnboarding = !isLoading && allEntities?.length === 0 && !hasExplored;
  const userName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "der";

  // Onboarding choices - no entity creation, only explore options
  const onboardingChoices: OnboardingChoice[] = [
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
      title: "Utforske",
      description: "Se deg rundt og oppdage artister og scener",
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

  // Helper to check if user can edit this entity
  const canEdit = (access: AccessLevel) => ["editor", "admin", "owner"].includes(access);

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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Welcome section */}
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Hei, {userName}!
          </h1>
          <p className="text-muted-foreground">
            {showOnboarding 
              ? "Velkommen til backstage på GIGGEN." 
              : "På GIGGEN har du to ting: profiler (deg) og prosjekter (det du lager sammen med andre)."
            }
          </p>
        </div>

        {/* Filter indicator when persona is selected */}
        {selectedPersonaId && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
            <Filter className="h-4 w-4" />
            <span>Viser prosjekter for den valgte profilen</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-xs"
              onClick={clearPersonaFilter}
            >
              <X className="h-3 w-3 mr-1" />
              Vis alle
            </Button>
          </div>
        )}

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

        {/* Persona section - identity */}
        <section className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CircleUser className="h-5 w-5 text-accent" />
                Hvem du er på GIGGEN
              </h2>
              <div className="flex gap-2">
                {personas && personas.length > 0 && (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/dashboard/personas">
                      Alle profiler
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard/personas/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Ny profil
                  </Link>
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Profilene dine representerer deg som person – musiker, DJ, fotograf eller andre roller.
            </p>
          </div>

          {!isLoadingPersonas && personas && personas.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {personas.map((persona) => (
                <Link
                  key={persona.id}
                  to={`/dashboard/personas/${persona.id}`}
                  className="flex items-center gap-3 bg-card border border-border rounded-full pl-1 pr-4 py-1 hover:border-accent/50 hover:bg-accent/5 transition-all"
                >
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarImage src={persona.avatar_url || undefined} />
                    <AvatarFallback className="text-sm bg-accent/10 text-accent">
                      {persona.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{persona.name}</span>
                    {persona.category_tags && persona.category_tags.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {persona.category_tags.slice(0, 2).join(", ")}
                      </span>
                    )}
                  </div>
                  {!persona.is_public && (
                    <Badge variant="outline" className="text-[10px]">Skjult</Badge>
                  )}
                </Link>
              ))}
            </div>
          ) : !isLoadingPersonas ? (
            <Card className="border-dashed border-accent/30 bg-accent/5">
              <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-accent/10">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Opprett din profil</p>
                    <p className="text-sm text-muted-foreground">
                      Vis deg frem som musiker, fotograf, DJ eller hva du vil
                    </p>
                  </div>
                </div>
                <Button asChild className="shrink-0">
                  <Link to="/dashboard/personas/new">
                    Lag min profil
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </section>

        {/* Projects section - workspaces */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              {selectedPersonaId ? "Prosjekter for denne profilen" : "Det du jobber med"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Prosjekter er band, soloartister og scener du er en del av.
            </p>
          </div>

          {entities && entities.length > 0 ? (
            <div className="space-y-3">
              {entities.map((entity) => {
                const typeConfig = TYPE_CONFIG[entity.type as EntityType];
                const userCanEdit = canEdit(entity.access);
                
                return (
                  <div
                    key={entity.id}
                    className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-md bg-primary/10 text-primary flex-shrink-0">
                          {typeConfig.icon}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">
                              {entity.name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                            {!entity.is_published && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Utkast
                              </Badge>
                            )}
                          </div>
                          {entity.tagline && (
                            <p className="text-sm text-muted-foreground truncate">
                              {entity.tagline}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Din rolle: <span className="text-foreground font-medium">{ACCESS_LABELS[entity.access]}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        {/* View/Edit button - viewers get view, editors get edit */}
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link to={`/dashboard/entities/${entity.id}/edit`}>
                            {userCanEdit ? (
                              <Pencil className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Link>
                        </Button>
                        {/* View public page - for all who have access, only if published */}
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
              <CardContent className="py-8 text-center space-y-4">
                {selectedPersonaId ? (
                  <>
                    <p className="text-muted-foreground">
                      Denne profilen er ikke knyttet til noen prosjekter ennå.
                    </p>
                    <Button variant="outline" onClick={clearPersonaFilter}>
                      Se alle prosjekter
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Du er ikke med i noen prosjekter eller scener ennå.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vil du starte noe nytt eller kobles på en scene?{" "}
                      <a href="mailto:hei@giggen.no" className="underline text-foreground hover:text-accent">
                        Ta kontakt
                      </a>
                      .
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Passive CTA for new projects */}
        {entities && entities.length > 0 && (
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Vil du starte et nytt prosjekt eller knyttes til en scene?{" "}
              <a href="mailto:hei@giggen.no" className="underline text-foreground hover:text-accent">
                Ta kontakt
              </a>
              .
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
