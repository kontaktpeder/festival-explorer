import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMyEntities, useMyEntitiesFilteredByPersona } from "@/hooks/useEntity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector, useSelectedPersonaId } from "@/components/dashboard/PersonaSelector";
import { useMyPersonas } from "@/hooks/usePersona";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings, type ImageSettings } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
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
  X,
  Plus,
  ChevronRight
} from "lucide-react";
import type { EntityType, AccessLevel } from "@/types/database";

const TYPE_CONFIG: Record<EntityType, { label: string; icon: React.ReactNode; route: string }> = {
  venue: { label: "Scene", icon: <Building2 className="h-5 w-5" />, route: "/project" },
  solo: { label: "Soloartist", icon: <User className="h-5 w-5" />, route: "/project" },
  band: { label: "Band", icon: <Users className="h-5 w-5" />, route: "/project" },
};

// More human-centric role descriptions
const ACCESS_DESCRIPTIONS: Record<AccessLevel, string> = {
  owner: "Du styrer dette",
  admin: "Full tilgang",
  editor: "Kan redigere",
  viewer: "Kan se",
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
  const [currentUser, setCurrentUser] = useState<{ 
    id: string; 
    email: string; 
    displayName?: string;
    avatarUrl?: string;
    avatarImageSettings?: ImageSettings | null;
  } | null>(null);
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
      
      // Get profile info including avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, avatar_image_settings")
        .eq("id", session.user.id)
        .single();
      
      setCurrentUser({
        id: session.user.id,
        email: session.user.email || "",
        displayName: profile?.display_name || undefined,
        avatarUrl: profile?.avatar_url || undefined,
        avatarImageSettings: parseImageSettings(profile?.avatar_image_settings),
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
  
  // Profile avatar with signed URL and crop styles
  const profileAvatarUrl = useSignedMediaUrl(currentUser?.avatarUrl || null, "private");
  const profileAvatarStyles = getCroppedImageStyles(currentUser?.avatarImageSettings);

  // Onboarding choices - no entity creation, only explore options
  const onboardingChoices: OnboardingChoice[] = [
    {
      id: "profile",
      icon: <Camera className="h-6 w-6" />,
      title: "Lag en profil",
      description: "Vis deg frem på GIGGEN",
      link: "/dashboard/personas/new",
    },
    {
      id: "explore",
      icon: <Compass className="h-6 w-6" />,
      title: "Utforsk",
      description: "Se hva som skjer",
      action: handleExplore,
    },
  ];

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  // Helper to check if user can edit this entity
  const canEdit = (access: AccessLevel) => ["editor", "admin", "owner"].includes(access);

  return (
    <div className="min-h-screen bg-background">
      {/* Header - cleaner, less admin-like */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/70 font-normal">BACKSTAGE</span>
          </Link>
          <PersonaSelector />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        {/* Welcome - with profile avatar */}
        <div className="flex items-start gap-5">
          <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-border/50 flex-shrink-0">
            <AvatarImage 
              src={profileAvatarUrl || undefined} 
              style={profileAvatarStyles}
              className="object-cover"
            />
            <AvatarFallback className="text-xl md:text-2xl bg-muted text-muted-foreground">
              {(currentUser?.displayName || currentUser?.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 pt-1">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Hei, {userName}
            </h1>
            {showOnboarding ? (
              <p className="text-lg text-muted-foreground">
                Velkommen backstage.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Ditt rom før scenen.
              </p>
            )}
          </div>
        </div>

        {/* Filter indicator - softer */}
        {selectedPersonaId && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="opacity-70">Filtrert etter profil</span>
            <button
              onClick={clearPersonaFilter}
              className="text-foreground/70 hover:text-foreground transition-colors underline underline-offset-2"
            >
              Vis alt
            </button>
          </div>
        )}

        {/* Onboarding - more inviting, less boxy */}
        {showOnboarding && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {onboardingChoices.map((choice) => (
              <button
                key={choice.id}
                className={`text-left p-6 rounded-2xl bg-card/50 hover:bg-card border border-border/50 hover:border-border transition-all group ${
                  choice.disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => {
                  if (choice.disabled) return;
                  if (choice.action) {
                    choice.action();
                  } else if (choice.link) {
                    navigate(choice.link);
                  }
                }}
                disabled={choice.disabled}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                    {choice.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg">
                      {choice.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {choice.description}
                    </p>
                  </div>
                  {!choice.disabled && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Persona section - soft, identity-focused, lower visual weight */}
        <section className="space-y-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Din profil
              </h2>
            </div>
            <div className="flex gap-2">
              {personas && personas.length > 0 && (
                <Link 
                  to="/dashboard/personas"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Se alle
                </Link>
              )}
            </div>
          </div>

          {!isLoadingPersonas && personas && personas.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {personas.map((persona) => (
                <Link
                  key={persona.id}
                  to={`/dashboard/personas/${persona.id}`}
                  className="group flex items-center gap-3 px-1 py-1 pr-4 rounded-full bg-muted/30 hover:bg-muted/60 transition-all"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={persona.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-accent/10 text-accent">
                      {persona.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors">
                    {persona.name}
                  </span>
                  {!persona.is_public && (
                    <span className="text-[10px] text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                      Privat
                    </span>
                  )}
                </Link>
              ))}
              <Link
                to="/dashboard/personas/new"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              >
                <Plus className="h-4 w-4" />
                Ny profil
              </Link>
            </div>
          ) : !isLoadingPersonas ? (
            <Link
              to="/dashboard/personas/new"
              className="block p-6 rounded-2xl bg-accent/5 hover:bg-accent/10 border border-accent/20 hover:border-accent/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Lag din profil</p>
                  <p className="text-sm text-muted-foreground">
                    Vis deg frem som musiker, fotograf eller DJ
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-accent/70 transition-colors" />
              </div>
            </Link>
          ) : null}
        </section>

        {/* Projects section - the main focus, larger and more prominent */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {selectedPersonaId ? "Prosjekter" : "Dine prosjekter"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Band, artister og scener du er med på.
            </p>
          </div>

          {entities && entities.length > 0 ? (
            <div className="space-y-4">
              {entities.map((entity) => {
                const typeConfig = TYPE_CONFIG[entity.type as EntityType];
                const userCanEdit = canEdit(entity.access);
                
                return (
                  <div
                    key={entity.id}
                    className="group p-5 rounded-2xl bg-card hover:bg-card/80 border border-border/50 hover:border-border transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon - larger, more presence */}
                      <div className="p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        {typeConfig.icon}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                              {entity.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-sm text-muted-foreground">
                                {typeConfig.label}
                              </span>
                              {!entity.is_published && (
                              <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                                  Utkast
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions - cleaner */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button asChild variant="ghost" size="sm" className="h-8 px-3">
                              <Link to={`/dashboard/entities/${entity.id}/edit`}>
                                {userCanEdit ? (
                                  <>
                                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                    Rediger
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                                    Se
                                  </>
                                )}
                              </Link>
                            </Button>
                            {entity.is_published && (
                              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                <Link to={`${typeConfig.route}/${entity.slug}`} target="_blank">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {entity.tagline && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {entity.tagline}
                          </p>
                        )}
                        
                        {/* Role - human language, subtle */}
                        <p className="text-xs text-muted-foreground/70">
                          {ACCESS_DESCRIPTIONS[entity.access]}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              {selectedPersonaId ? (
                <>
                  <p className="text-muted-foreground">
                    Ingen prosjekter for denne profilen ennå.
                  </p>
                  <button
                    onClick={clearPersonaFilter}
                    className="text-sm text-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    Se alle prosjekter
                  </button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Du er ikke med i noen prosjekter ennå.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vil du starte noe?{" "}
                    <a 
                      href="mailto:hei@giggen.no" 
                      className="text-foreground/80 hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Ta kontakt
                    </a>
                  </p>
                </>
              )}
            </div>
          )}
        </section>

        {/* Passive CTA - softer, less prominent */}
        {entities && entities.length > 0 && (
          <div className="text-center pt-6">
            <p className="text-sm text-muted-foreground/70">
              Vil du starte noe nytt?{" "}
              <a 
                href="mailto:hei@giggen.no" 
                className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Ta kontakt
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
