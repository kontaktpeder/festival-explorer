import { useState, useEffect } from "react";
import { Link, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyEntities, useMyEntitiesFilteredByPersona } from "@/hooks/useEntity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector, useSelectedPersonaId } from "@/components/dashboard/PersonaSelector";
import { PersonaModusBar } from "@/components/dashboard/PersonaModusBar";
import { USE_PERSONA_MODUS_BAR, USE_SIMPLE_ONBOARDING } from "@/lib/ui-features";
import { useMyPersonas } from "@/hooks/usePersona";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings, type ImageSettings } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, Building2, Pencil, ExternalLink, User, ArrowRight, Eye, Sparkles, Plus, ChevronRight, ChevronDown, QrCode, Info, MapPin, Settings, Shield, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CroppedImage } from "@/components/ui/CroppedImage";
import type { EntityType, AccessLevel } from "@/types/database";
import { inferEntityKind } from "@/lib/role-model-helpers";
import type { Json } from "@/integrations/supabase/types";
import { ActivePersonaCard } from "@/components/dashboard/ActivePersonaCard";
import { LockedModules } from "@/components/dashboard/LockedModules";
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
  return <CroppedImage src={signedUrl} alt={name} imageSettings={imageSettings as Json | null} aspect="hero" className="w-full h-full object-cover" />;
}

const TYPE_CONFIG: Record<EntityType, {
  label: string;
  icon: React.ReactNode;
  route: string;
}> = {
  venue: { label: "🏛️ Scene", icon: <Building2 className="h-5 w-5" />, route: "/project" },
  solo: { label: "🎤 Artistprosjekt", icon: <User className="h-5 w-5" />, route: "/project" },
  band: { label: "🎸 Band", icon: <Users className="h-5 w-5" />, route: "/project" },
};

const ACCESS_DESCRIPTIONS: Record<AccessLevel, string> = {
  owner: "Du styrer dette",
  admin: "Full tilgang",
  editor: "Kan redigere",
  viewer: "Kan se",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get("from") === "onboarding";
  const selectedPersonaId = useSelectedPersonaId();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    avatarImageSettings?: ImageSettings | null;
  } | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);
  const [previewAsTeam, setPreviewAsTeam] = useState(false);

  const { data: personas, isLoading: isLoadingPersonas } = useMyPersonas();
  const { data: allEntities, isLoading: isLoadingAll } = useMyEntities();

  const { data: hasBackstageAccess } = useQuery({
    queryKey: ["has-backstage-access"],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_backstage_access");
      return data || false;
    },
    enabled: !!currentUser?.id,
  });

  const { data: myFestivals } = useQuery({
    queryKey: ["dashboard-my-festivals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug, status, start_at, end_at")
        .order("start_at", { ascending: false });
      return data || [];
    },
    enabled: !!hasBackstageAccess,
  });
  const { data: filteredEntities, isLoading: isLoadingFiltered } = useMyEntitiesFilteredByPersona(selectedPersonaId);
  const entities = selectedPersonaId ? filteredEntities : allEntities;
  const isLoading = selectedPersonaId ? isLoadingFiltered : isLoadingAll;

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async (userId: string, email: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, avatar_image_settings")
        .eq("id", userId)
        .single();

      if (!isMounted) return;

      setCurrentUser({
        id: userId,
        email,
        displayName: profile?.display_name || undefined,
        avatarUrl: profile?.avatar_url || undefined,
        avatarImageSettings: parseImageSettings(profile?.avatar_image_settings),
      });

      const { data: staffRole } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("user_id", userId)
        .single();
      if (!isMounted) return;
      setIsStaff(!!staffRole);

      const { data: adminCheck } = await supabase.rpc("is_admin");
      if (!isMounted) return;
      setIsAdmin(!!adminCheck);
    };

    // Listen for auth changes FIRST (handles login/logout while on page)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        if (!session) {
          setCurrentUser(null);
          navigate("/admin/login");
          return;
        }
        // Defer data fetch to avoid Supabase deadlock
        setTimeout(() => {
          if (isMounted) {
            loadUserData(session.user.id, session.user.email || "");
          }
        }, 0);
      }
    );

    // THEN check for existing session (initial load)
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (!session) {
        navigate("/admin/login");
        return;
      }
      await loadUserData(session.user.id, session.user.email || "");
    };

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const clearPersonaFilter = () => {
    localStorage.removeItem("selectedPersonaId");
    window.dispatchEvent(new Event("personaChanged"));
  };

  const userName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "der";
  const profileAvatarUrl = useSignedMediaUrl(currentUser?.avatarUrl || null, "private");
  const profileAvatarStyles = getCroppedImageStyles(currentUser?.avatarImageSettings);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  // Simple onboarding: redirect new users (0 personas) to wizard
  if (USE_SIMPLE_ONBOARDING && !isLoadingPersonas && personas && personas.length === 0) {
    return <Navigate to="/onboarding/create-profile" replace />;
  }

  // Simple onboarding layout for users with personas
  if (USE_SIMPLE_ONBOARDING && personas && personas.length > 0) {
    const activePersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];
    const hostEntities = entities?.filter((e) => inferEntityKind(e) === "host") || [];
    const projectEntities = entities?.filter((e) => inferEntityKind(e) === "project") || [];
    const hasProjectAccess = hostEntities.length > 0 || projectEntities.length > 0;
    const hasFestivalAccess = !!(hasBackstageAccess && myFestivals && myFestivals.length > 0);
    const hasAnyAccess = hasProjectAccess || hasFestivalAccess;

    return (
      <div className="min-h-[100svh] pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between">
            <Link to="/" className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
              GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px] sm:text-base">BACKSTAGE</span>
            </Link>
            {!USE_PERSONA_MODUS_BAR && <PersonaSelector />}
          </div>
        </header>

        {USE_PERSONA_MODUS_BAR && <PersonaModusBar />}

        <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-10 space-y-5 sm:space-y-8">
          <ActivePersonaCard persona={activePersona} />

          {/* Onboarding confirmation */}
          {fromOnboarding && (
            <section className="p-4 sm:p-6 rounded-lg bg-accent/5 border border-accent/20 space-y-3 sm:space-y-4">
              <h3 className="text-sm sm:text-base font-semibold text-accent">✓ Profil opprettet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dette er din profesjonelle profil på GIGGEN. Du kan når som helst endre den fra dashbordet.
              </p>

              {activePersona.type === "musician" && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Neste steg:</strong> Vent på invitasjon fra festival eller arrangør – eller be om tilgang til et prosjekt.
                  </p>
                  <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 sm:h-10 sm:px-5 sm:text-sm font-semibold">
                    <Link to="/request-access">Be om tilgang</Link>
                  </Button>
                </div>
              )}

              {activePersona.type === "photographer" && (
                <p className="text-xs text-muted-foreground">
                  Arrangører bruker profiler som din når de setter sammen team for foto og video.
                </p>
              )}

              {activePersona.type === "technician" && (
                <p className="text-xs text-muted-foreground">
                  Arrangører ser på tekniske profiler når de bygger crew til festivaler og events.
                </p>
              )}

              {activePersona.type === "organizer" && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    For å lage events må du ha en scene tilknyttet GIGGEN.
                  </p>
                  <a
                    href="mailto:giggen.main@gmail.com"
                    className="inline-flex items-center justify-center rounded-md border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
                  >
                    Ta kontakt
                  </a>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground/50 pt-2">
                Du kan redigere profilen din og be om tilgang, men det er festivalen og arrangørene som oppretter prosjekter og program.
              </p>
            </section>
          )}

          {/* Prosjekter du er med i */}
          {hasProjectAccess && (
            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-xl font-semibold text-foreground">Prosjekter du er med i</h2>
              <div className="space-y-4">
                {hostEntities.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] sm:text-sm text-muted-foreground font-medium">Dine scener</p>
                    {hostEntities.map((entity) => (
                      <Link
                        key={entity.id}
                        to={`/dashboard/entities/${entity.id}/edit`}
                        className="group flex items-center justify-between p-3 sm:p-4 rounded-lg bg-card/60 hover:bg-card/80 border border-border/30 hover:border-border/50 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">{entity.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground/70">{ACCESS_DESCRIPTIONS[entity.access]}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
                {projectEntities.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] sm:text-sm text-muted-foreground font-medium">Dine prosjekter</p>
                    {projectEntities.map((entity) => (
                      <Link
                        key={entity.id}
                        to={`/dashboard/entities/${entity.id}/edit`}
                        className="group flex items-center justify-between p-3 sm:p-4 rounded-lg bg-card/60 hover:bg-card/80 border border-border/30 hover:border-border/50 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">{entity.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground/70">{ACCESS_DESCRIPTIONS[entity.access]}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Festival-team du er med i */}
          {hasFestivalAccess && (
            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-xl font-semibold text-foreground">Festival-team du er med i</h2>
              <div className="space-y-3">
                {myFestivals!.map((festival) => (
                  <div
                    key={festival.id}
                    className="rounded-lg border border-border/30 bg-card/60 p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-foreground">{festival.name}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                          festival.status === "published" ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {festival.status === "published" ? "Publisert" : "Utkast"}
                      </span>
                    </div>
                    {festival.start_at && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">
                        {new Date(festival.start_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}
                        {festival.end_at &&
                          ` – ${new Date(festival.end_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}`}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="default" size="sm" className="h-8 text-xs">
                        <Link to={`/admin/festivals/${festival.id}`}>Rediger</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                        <Link to={`/admin/festivals/${festival.id}/program`}>Program</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                        <Link to={`/festival/${festival.slug}`} target="_blank">
                          Se live →
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tom tilstand */}
          {!hasAnyAccess && (
            <section className="space-y-3">
              <div className="p-4 sm:p-6 rounded-lg bg-card/60 border border-border/30 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Du har ingen tilgang ennå.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/request-access">Be om tilgang</Link>
                </Button>
                <p className="text-[11px] text-muted-foreground/50">
                  Du kan redigere profilen din og be om tilgang. Festivalen og arrangørene oppretter prosjekter og program.
                </p>
              </div>
            </section>
          )}

          <LockedModules
            projectEntities={projectEntities}
            hostEntities={hostEntities}
            selectedPersona={activePersona}
          />

          {/* Preview as team toggle (admin only) */}
          {isAdmin && (
            <div className="space-y-2">
              <Button
                variant={previewAsTeam ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewAsTeam(!previewAsTeam)}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-1.5" />
                {previewAsTeam ? "Tilbake til admin-visning" : "Vis som festivalsjef"}
              </Button>
              {previewAsTeam && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 text-xs text-accent">
                  Forhåndsvisning: Du ser dashboardet slik en festivalsjef ville sett det.
                </div>
              )}
            </div>
          )}

          {/* Admin/Crew */}
          {!previewAsTeam && (isAdmin || isStaff) && (
            <Collapsible open={adminSectionOpen} onOpenChange={setAdminSectionOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-card/40 hover:bg-card/60 border border-border/20 transition-all">
                  <div className="flex items-center gap-2.5">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium text-foreground">
                      {isAdmin ? "Admin & Crew" : "Crew-verktøy"}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${adminSectionOpen ? "rotate-180" : ""}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-3 p-3 rounded-lg bg-card/60 hover:bg-card/80 border border-border/30 transition-all group">
                      <Settings className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-foreground">Admin Panel</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground/30 group-hover:text-accent transition-colors" />
                    </Link>
                  )}
                  {isStaff && (
                    <Link to="/crew/checkin" className="flex items-center gap-3 p-3 rounded-lg bg-card/60 hover:bg-card/80 border border-border/30 transition-all group">
                      <QrCode className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-foreground">Check-in billetter</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground/30 group-hover:text-accent transition-colors" />
                    </Link>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </main>
      </div>
    );
  }

  const canEdit = (access: AccessLevel) => ["editor", "admin", "owner"].includes(access);

  return (
    <div className="min-h-[100svh] pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between">
          <Link to="/" className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px] sm:text-base">BACKSTAGE</span>
          </Link>
          {!USE_PERSONA_MODUS_BAR && <PersonaSelector />}
        </div>
      </header>

      {/* Persona modus bar (below header) */}
      {USE_PERSONA_MODUS_BAR && <PersonaModusBar />}

      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-10 space-y-5 sm:space-y-12">
        {/* Welcome */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Avatar className="h-11 w-11 sm:h-16 sm:w-16 md:h-20 md:w-20 border-2 border-border/50 shrink-0">
            <AvatarImage src={profileAvatarUrl || undefined} style={profileAvatarStyles} className="object-cover" />
            <AvatarFallback className="text-base sm:text-xl md:text-2xl bg-muted text-muted-foreground">
              {(currentUser?.displayName || currentUser?.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight truncate">
              Hei, {userName}
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground">Ditt rom før scenen.</p>
          </div>
        </div>

        {/* Info alert */}
        <Alert className="bg-accent/5 border-accent/20 rounded-lg">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
          <AlertDescription className="text-xs sm:text-sm text-muted-foreground">
            <strong className="text-foreground">Du trenger ikke lage events.</strong>{" "}
            Festivalen setter sammen programmet. Du fyller inn hvem du er og hva du jobber med.
          </AlertDescription>
        </Alert>

        {/* Hint for connecting persona to projects */}
        {personas && personas.length > 0 && allEntities && allEntities.length > 0 && (
          <Alert className="bg-secondary/50 border-border/30 rounded-lg">
            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            <AlertDescription className="text-xs sm:text-sm">
              <span className="font-medium text-foreground">Koble deg selv til prosjektene dine.</span>{" "}
              Bruk seksjonen <span className="font-mono text-accent text-[11px] sm:text-sm">Personer bak prosjektet</span> for å legge deg til.
            </AlertDescription>
          </Alert>
        )}

        {/* Filter indicator */}
        {selectedPersonaId && (
          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
            <span className="opacity-70">Filtrert etter profil</span>
            <button onClick={clearPersonaFilter} className="text-foreground/70 hover:text-foreground transition-colors underline underline-offset-2">
              Vis alt
            </button>
          </div>
        )}

        {/* Persona section */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-xl font-semibold text-foreground">Din profil</h2>
              <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5">
                Hvem du er som musiker, fotograf eller arrangør
              </p>
            </div>
            {personas && personas.length > 0 && (
              <Link to="/dashboard/personas" className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
                Se alle →
              </Link>
            )}
          </div>

          {!isLoadingPersonas && personas && personas.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {personas.map((persona) => (
                <Link
                  key={persona.id}
                  to={`/dashboard/personas/${persona.id}`}
                  className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-card/60 hover:bg-card/80 active:bg-card border border-border/30 hover:border-border/50 transition-all"
                >
                  <Avatar className="h-11 w-11 sm:h-14 sm:w-14 ring-2 ring-border/50 shrink-0">
                    <AvatarImage src={persona.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="text-sm sm:text-base bg-muted text-muted-foreground font-medium">
                      {persona.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                      {persona.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {persona.is_public ? (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal px-1.5 py-0">Offentlig</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-normal text-warning border-warning/30 px-1.5 py-0">Privat</Badge>
                      )}
                    </div>
                  </div>
                  {/* Always visible on mobile, hover on desktop */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-accent transition-colors shrink-0" />
                </Link>
              ))}
              <Link
                to="/dashboard/personas/new"
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 border-dashed border-border/20 hover:border-accent/40 active:border-accent/50 text-muted-foreground hover:text-accent transition-all"
              >
                <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-full border-2 border-dashed border-current flex items-center justify-center shrink-0">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium">Legg til ny profil</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">For en annen rolle eller alias</p>
                </div>
              </Link>
            </div>
          ) : !isLoadingPersonas ? (
            <Link
              to="/dashboard/personas/new"
              className="block p-4 sm:p-5 rounded-lg bg-card/60 hover:bg-card/80 active:bg-card border border-border/30 hover:border-border/50 transition-all group"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-11 w-11 sm:h-14 sm:w-14 ring-2 ring-accent/20 shrink-0">
                  <AvatarFallback className="bg-accent/10 text-accent">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm sm:text-base">Lag din profil</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Vis deg frem som musiker, fotograf eller DJ</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0" />
              </div>
            </Link>
          ) : null}
        </section>

        {/* NEW ROLE MODEL STEP 1.1: Split entities into hosts and projects */}
        {(() => {
          const hostEntities = entities?.filter((e) => inferEntityKind(e) === "host") || [];
          const projectEntities = entities?.filter((e) => inferEntityKind(e) === "project") || [];
          
          return (
            <>
              {/* Host entities section (venues/organizers) */}
              {hostEntities.length > 0 && (
                <section className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base sm:text-xl font-semibold text-foreground">
                        {selectedPersonaId ? "Scener" : "Dine scener"}
                      </h2>
                      <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5">
                        Spillested og arrangør
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {hostEntities.map((entity) => {
                      const typeConfig = TYPE_CONFIG[entity.type as EntityType];
                      return (
                        <Link
                          key={entity.id}
                          to={`/dashboard/entities/${entity.id}/edit`}
                          className="group rounded-lg bg-card/60 hover:bg-card/80 active:bg-card border border-border/30 hover:border-border/50 transition-all overflow-hidden block"
                        >
                          <div className="flex">
                            <div className="relative w-16 sm:w-28 shrink-0 bg-secondary">
                              {entity.hero_image_url ? (
                                <EntityHeroImage imageUrl={entity.hero_image_url} imageSettings={entity.hero_image_settings} name={entity.name} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-xl sm:text-2xl font-bold text-muted-foreground/20">
                                    {entity.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-center">
                              <div className="space-y-0.5 sm:space-y-1">
                                <h3 className="text-sm sm:text-base font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                                  {entity.name}
                                </h3>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal px-1.5 py-0">
                                    {typeConfig.label}
                                  </Badge>
                                  {entity.city && (
                                    <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-muted-foreground/70">
                                      <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                      {entity.city}
                                    </span>
                                  )}
                                  {!entity.is_published && (
                                    <Badge variant="outline" className="text-[10px] sm:text-xs font-normal text-warning border-warning/30 px-1.5 py-0">
                                      Utkast
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground/70">
                                  {ACCESS_DESCRIPTIONS[entity.access]}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center pr-2 sm:pr-3 shrink-0">
                              {entity.is_published && (
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link to={`${typeConfig.route}/${entity.slug}`} target="_blank" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  </Link>
                                </Button>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Project entities section (artists/bands) */}
              <section className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-foreground">
                      {selectedPersonaId ? "Prosjekter" : "Dine prosjekter"}
                    </h2>
                    <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5">
                      Artistprosjekt eller band
                    </p>
                  </div>
                </div>

          {projectEntities.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {projectEntities.map((entity) => {
                const typeConfig = TYPE_CONFIG[entity.type as EntityType];
                return (
                  <Link
                    key={entity.id}
                    to={`/dashboard/entities/${entity.id}/edit`}
                    className="group rounded-lg bg-card/60 hover:bg-card/80 active:bg-card border border-border/30 hover:border-border/50 transition-all overflow-hidden block"
                  >
                    <div className="flex">
                      <div className="relative w-16 sm:w-28 shrink-0 bg-secondary">
                        {entity.hero_image_url ? (
                          <EntityHeroImage imageUrl={entity.hero_image_url} imageSettings={entity.hero_image_settings} name={entity.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xl sm:text-2xl font-bold text-muted-foreground/20">
                              {entity.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-center">
                        <div className="space-y-0.5 sm:space-y-1">
                          <h3 className="text-sm sm:text-base font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                            {entity.name}
                          </h3>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal px-1.5 py-0">
                              {typeConfig.label}
                            </Badge>
                            {entity.city && (
                              <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-muted-foreground/70">
                                <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {entity.city}
                              </span>
                            )}
                            {!entity.is_published && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs font-normal text-warning border-warning/30 px-1.5 py-0">
                                Utkast
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground/70">
                            {ACCESS_DESCRIPTIONS[entity.access]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center pr-2 sm:pr-3 shrink-0">
                        {entity.is_published && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link to={`${typeConfig.route}/${entity.slug}`} target="_blank" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Link>
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-4 sm:p-6 rounded-lg bg-card/60 border border-border/30 text-center space-y-2 sm:space-y-3">
              {selectedPersonaId ? (
                <>
                  <p className="text-sm text-muted-foreground">Ingen prosjekter for denne profilen ennå.</p>
                  <button onClick={clearPersonaFilter} className="text-xs sm:text-sm text-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors">
                    Se alle prosjekter
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Du er ikke med i noen prosjekter ennå.</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Vil du starte noe?{" "}
                    <a href="mailto:giggen.main@gmail.com" className="text-foreground/80 hover:text-foreground underline underline-offset-2 transition-colors">
                      Ta kontakt
                    </a>
                  </p>
                </>
              )}
            </div>
          )}
        </section>
            </>
          );
        })()}

        {/* Admin/Crew Section */}
        {(isAdmin || isStaff) && (
          <Collapsible open={adminSectionOpen} onOpenChange={setAdminSectionOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-card/40 hover:bg-card/60 active:bg-card/70 border border-border/20 transition-all">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-md bg-muted/50">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      {isAdmin ? "Admin & Crew" : "Crew-verktøy"}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {isAdmin ? "Administrasjon og billettskanning" : "Scan billetter på event"}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${adminSectionOpen ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 sm:mt-3 space-y-2">
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-card/60 hover:bg-card/80 active:bg-card border border-border/30 hover:border-border/50 transition-all group">
                    <div className="p-2 sm:p-2.5 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground">Admin Panel</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Administrer festival, artister og innhold</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                )}
                {isStaff && (
                  <Link to="/crew/checkin" className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-card/60 hover:bg-card/80 active:bg-card border border-border/30 hover:border-border/50 transition-all group">
                    <div className="p-2 sm:p-2.5 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground">Check-in billetter</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Scan QR-kode eller søk etter billetter</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0" />
                  </Link>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Passive CTA */}
        {entities && entities.length > 0 && (
          <div className="text-center pt-1 pb-4">
            <p className="text-xs sm:text-sm text-muted-foreground/70">
              Vil du starte noe nytt?{" "}
              <a className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors" href="mailto:giggen.main@gmail.com">
                Ta kontakt
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
