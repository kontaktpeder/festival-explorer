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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronRight,
  ChevronDown,
  QrCode,
  Info,
  MapPin,
  Settings,
  Shield
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CroppedImage } from "@/components/ui/CroppedImage";
import type { EntityType, AccessLevel } from "@/types/database";
import type { Json } from "@/integrations/supabase/types";

// Helper component for entity hero image with signed URL
function EntityHeroImage({ 
  imageUrl, 
  imageSettings, 
  name 
}: { 
  imageUrl: string; 
  imageSettings: unknown; 
  name: string;
}) {
  const signedUrl = useSignedMediaUrl(imageUrl, 'public');
  
  if (!signedUrl) return null;
  
  return (
    <CroppedImage
      src={signedUrl}
      alt={name}
      imageSettings={imageSettings as Json | null}
      aspect="hero"
      className="w-full h-full object-cover"
    />
  );
}

// Tydeligere prosjekt-type labels med ikoner
const TYPE_CONFIG: Record<EntityType, { label: string; icon: React.ReactNode; route: string }> = {
  venue: { label: "🏛️ Scene", icon: <Building2 className="h-5 w-5" />, route: "/project" },
  solo: { label: "🎤 Artistprosjekt", icon: <User className="h-5 w-5" />, route: "/project" },
  band: { label: "🎸 Band", icon: <Users className="h-5 w-5" />, route: "/project" },
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
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);

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

      // Check if user has staff role (crew or admin)
      const { data: staffRole } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();
      
      setIsStaff(!!staffRole);

      // Check if user is admin (global platform admin)
      const { data: adminCheck } = await supabase.rpc("is_admin");
      setIsAdmin(!!adminCheck);
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
    <div className="min-h-screen">
      {/* Header - cleaner, less admin-like */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/70 font-normal text-xs sm:text-base">BACKSTAGE</span>
          </Link>
          <PersonaSelector />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Welcome - with profile avatar */}
        <div className="flex items-start gap-3 sm:gap-5">
          <Avatar className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 border-2 border-border/50 flex-shrink-0">
            <AvatarImage 
              src={profileAvatarUrl || undefined} 
              style={profileAvatarStyles}
              className="object-cover"
            />
            <AvatarFallback className="text-lg sm:text-xl md:text-2xl bg-muted text-muted-foreground">
              {(currentUser?.displayName || currentUser?.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 pt-0.5 sm:pt-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Hei, {userName}
            </h1>
            {showOnboarding ? (
              <p className="text-base sm:text-lg text-muted-foreground">
                Velkommen backstage.
              </p>
            ) : (
              <p className="text-sm sm:text-base text-muted-foreground">
                Ditt rom før scenen.
              </p>
            )}
          </div>
        </div>

        {/* Viktig info-boks om hvordan festivalen fungerer */}
        <Alert className="bg-accent/5 border-accent/20 rounded-lg">
          <Info className="h-4 w-4 text-accent" />
          <AlertDescription className="text-sm text-muted-foreground">
            <strong className="text-foreground">Du trenger ikke lage events.</strong>{" "}
            Festivalen setter sammen programmet. Du fyller inn hvem du er og hva du jobber med.
          </AlertDescription>
        </Alert>

        {/* Hint-kort for å koble persona til prosjekter */}
        {personas && personas.length > 0 && allEntities && allEntities.length > 0 && (
          <Alert className="bg-secondary/50 border-border/30 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm">
              <span className="font-medium text-foreground">Koble deg selv til prosjektene dine.</span>{" "}
              For at navnet ditt skal vises "bak prosjektet", må du legge til profilen din inne på prosjektet – 
              bruk seksjonen <span className="font-mono text-accent">Personer bak prosjektet</span> for å legge deg til.
            </AlertDescription>
          </Alert>
        )}

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
                className={`text-left p-6 rounded-xl bg-card/50 hover:bg-card border border-border/30 hover:border-border/50 transition-all group ${
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

        {/* Persona section - identity-focused with card styling */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                Din profil
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Hvem du er som musiker, fotograf eller arrangør
              </p>
            </div>
            {personas && personas.length > 0 && (
              <Link 
                to="/dashboard/personas"
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                Se alle →
              </Link>
            )}
          </div>

          {!isLoadingPersonas && personas && personas.length > 0 ? (
            <div className="space-y-3">
              {personas.map((persona) => (
                <Link
                  key={persona.id}
                  to={`/dashboard/personas/${persona.id}`}
                  className="group flex items-center gap-4 p-4 rounded-lg bg-card/60 hover:bg-card/80 border border-border/30 hover:border-border/50 transition-all"
                >
                  <Avatar className="h-14 w-14 ring-2 ring-border/50 flex-shrink-0">
                    <AvatarImage src={persona.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="text-base bg-muted text-muted-foreground font-medium">
                      {persona.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                      {persona.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {persona.is_public ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          Offentlig
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs font-normal text-warning border-warning/30">
                          Privat
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-3 w-3 mr-1" />
                    Rediger
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors flex-shrink-0" />
                </Link>
              ))}
              <Link
                to="/dashboard/personas/new"
                className="flex items-center gap-4 p-4 rounded-lg border-2 border-dashed border-border/20 hover:border-accent/40 text-muted-foreground hover:text-accent transition-all"
              >
                <div className="h-14 w-14 rounded-full border-2 border-dashed border-current flex items-center justify-center flex-shrink-0">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Legg til ny profil</p>
                  <p className="text-xs text-muted-foreground">For en annen rolle eller alias</p>
                </div>
              </Link>
            </div>
          ) : !isLoadingPersonas ? (
            <Link
              to="/dashboard/personas/new"
              className="block p-5 rounded-lg bg-card/60 hover:bg-card/80 border border-border/30 hover:border-border/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-accent/20 flex-shrink-0">
                  <AvatarFallback className="bg-accent/10 text-accent">
                    <Sparkles className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Lag din profil</p>
                  <p className="text-sm text-muted-foreground">
                    Vis deg frem som musiker, fotograf eller DJ
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-accent transition-colors" />
              </div>
            </Link>
          ) : null}
        </section>

        {/* Projects section - same styling as personas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                {selectedPersonaId ? "Prosjekter" : "Dine prosjekter"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Det du viser publikum – artistprosjekt, band, eller scene
              </p>
            </div>
          </div>

          {entities && entities.length > 0 ? (
            <div className="space-y-3">
              {entities.map((entity) => {
                const typeConfig = TYPE_CONFIG[entity.type as EntityType];
                const userCanEdit = canEdit(entity.access);
                
                return (
                  <div
                    key={entity.id}
                    className="group rounded-lg bg-card/60 hover:bg-card/80 border border-border/30 hover:border-border/50 transition-all overflow-hidden"
                  >
                    <div className="flex">
                      {/* Hero image */}
                      <div className="relative w-20 sm:w-28 flex-shrink-0 bg-secondary">
                        {entity.hero_image_url ? (
                          <EntityHeroImage 
                            imageUrl={entity.hero_image_url} 
                            imageSettings={entity.hero_image_settings}
                            name={entity.name}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-muted-foreground/20">
                              {entity.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                                {entity.name}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs font-normal">
                              {typeConfig.label}
                            </Badge>
                            {entity.city && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                                <MapPin className="h-3 w-3" />
                                {entity.city}
                              </span>
                            )}
                            {!entity.is_published && (
                              <Badge variant="outline" className="text-xs font-normal text-warning border-warning/30">
                                Utkast
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/70">
                            {ACCESS_DESCRIPTIONS[entity.access]}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 pr-3">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/dashboard/entities/${entity.id}/edit`}>
                            {userCanEdit ? (
                              <>
                                <Pencil className="h-3 w-3 mr-1" />
                                Rediger
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Se
                              </>
                            )}
                          </Link>
                        </Button>
                        {entity.is_published && (
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={`${typeConfig.route}/${entity.slug}`} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors ml-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-lg bg-card/60 border border-border/30 text-center space-y-3">
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

        {/* Admin/Crew Section - Collapsible */}
        {(isAdmin || isStaff) && (
          <Collapsible open={adminSectionOpen} onOpenChange={setAdminSectionOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 rounded-lg bg-card/40 hover:bg-card/60 border border-border/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted/50">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      {isAdmin ? "Admin & Crew" : "Crew-verktøy"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isAdmin ? "Administrasjon og billettskanning" : "Scan billetter på event"}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${adminSectionOpen ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-2">
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-4 p-4 rounded-lg bg-card/60 hover:bg-card/80 border border-border/30 hover:border-border/50 transition-all group"
                  >
                    <div className="p-2.5 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <Settings className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Admin Panel</p>
                      <p className="text-xs text-muted-foreground">
                        Administrer festival, artister og innhold
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </Link>
                )}
                {isStaff && (
                  <Link
                    to="/crew/checkin"
                    className="flex items-center gap-4 p-4 rounded-lg bg-card/60 hover:bg-card/80 border border-border/30 hover:border-border/50 transition-all group"
                  >
                    <div className="p-2.5 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <QrCode className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Check-in billetter</p>
                      <p className="text-xs text-muted-foreground">
                        Scan QR-kode eller søk etter billetter
                      </p>
                        </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors" />
                  </Link>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Passive CTA - softer, less prominent */}
        {entities && entities.length > 0 && (
          <div className="text-center pt-2">
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
