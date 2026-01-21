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
  Plus
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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome section */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Hei, {userName}!
          </h1>
          <p className="text-muted-foreground">
            {showOnboarding 
              ? "Velkommen til backstage på GIGGEN." 
              : "Her finner du alt som er ditt."
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

        {/* My personas section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Mine offentlige profiler
            </h2>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/personas">
                  Administrer
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/personas/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Ny profil
                </Link>
              </Button>
            </div>
          </div>

          {!isLoadingPersonas && personas && personas.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {personas.map((persona) => (
                <Link
                  key={persona.id}
                  to={`/dashboard/personas/${persona.id}`}
                  className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 hover:border-accent/50 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={persona.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
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
                    <Badge variant="outline" className="text-[10px] ml-1">Skjult</Badge>
                  )}
                </Link>
              ))}
              <Link
                to="/dashboard/personas"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
              >
                Se alle →
              </Link>
            </div>
          ) : !isLoadingPersonas ? (
            <Card className="border-dashed bg-accent/5">
              <CardContent className="py-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Opprett din første profil</p>
                    <p className="text-sm text-muted-foreground">
                      Vis deg frem som musiker, fotograf, DJ eller hva du vil
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link to="/dashboard/personas/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Opprett
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* My projects section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedPersonaId ? "Prosjekter for denne profilen" : "Mine prosjekter & scener"}
            </h2>
          </div>

          {entities && entities.length > 0 ? (
            <div className="space-y-3">
              {entities.map((entity) => {
                const typeConfig = TYPE_CONFIG[entity.type as EntityType];
                const userCanEdit = canEdit(entity.access);
                
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
                      Du har ikke tilgang til noen prosjekter eller scener ennå.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vil du starte et nytt prosjekt eller venue?{" "}
                      <a href="mailto:hei@giggen.no" className="underline text-foreground hover:text-accent">
                        Send oss en e-post
                      </a>
                      .
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

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
