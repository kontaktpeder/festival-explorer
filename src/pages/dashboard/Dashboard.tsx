import { useState, useEffect } from "react";
import { Link, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyEntities, useMyEntitiesFilteredByPersona } from "@/hooks/useEntity";
import { useFestivalIdsForPersona } from "@/hooks/useFestival";
import { useSetEntityTeamPersona } from "@/hooks/useEntityMutations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Users, Building2, ExternalLink, User, Eye, Sparkles, Plus, ChevronRight, ChevronDown, QrCode, Info, MapPin, Settings, Shield, Calendar } from "lucide-react";
import gIcon from "@/assets/giggen-g-icon-red.png";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CroppedImage } from "@/components/ui/CroppedImage";
import type { EntityType, AccessLevel } from "@/types/database";
import { inferEntityKind } from "@/lib/role-model-helpers";
import type { Json } from "@/integrations/supabase/types";
import { ActivePersonaCard } from "@/components/dashboard/ActivePersonaCard";
// LockedModules removed
import { PendingInvitations } from "@/components/dashboard/PendingInvitations";
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
  venue: { label: "Scene", icon: <Building2 className="h-5 w-5" />, route: "/project" },
  solo: { label: "Artistprosjekt", icon: <User className="h-5 w-5" />, route: "/project" },
  band: { label: "Band", icon: <Users className="h-5 w-5" />, route: "/project" },
};

const ACCESS_DESCRIPTIONS: Record<AccessLevel, string> = {
  owner: "Du styrer dette",
  admin: "Full tilgang",
  editor: "Kan redigere",
  viewer: "Kan se",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const setEntityTeamPersona = useSetEntityTeamPersona();
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

  // Venues the user owns or has staff access to (via RPC)
  const { data: myVenues } = useQuery({
    queryKey: ["dashboard-my-venues", currentUser?.id, selectedPersonaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_venues", {
        p_persona_id: selectedPersonaId ?? null,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentUser?.id,
  });
  const { data: filteredEntities, isLoading: isLoadingFiltered } = useMyEntitiesFilteredByPersona(selectedPersonaId);
  const { data: festivalIdsForPersona } = useFestivalIdsForPersona(selectedPersonaId);
  const entities = selectedPersonaId ? filteredEntities : allEntities;
  const isLoading = selectedPersonaId ? isLoadingFiltered : isLoadingAll;
  const displayedFestivals = selectedPersonaId && festivalIdsForPersona
    ? (myFestivals || []).filter((f) => festivalIdsForPersona.includes(f.id))
    : (myFestivals || []);

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

  // Simple onboarding: redirect new users (0 personas AND no display name) to wizard
  // Existing users who already completed onboarding should never be redirected here
  const isNewUser = !currentUser.displayName && personas?.length === 0;
  if (USE_SIMPLE_ONBOARDING && !isLoadingPersonas && personas && isNewUser) {
    return <Navigate to="/onboarding/create-profile" replace />;
  }

  // Simple onboarding layout for users with personas
  if (USE_SIMPLE_ONBOARDING && personas && personas.length > 0) {
    const activePersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];
    const hostEntities = entities?.filter((e) => inferEntityKind(e) === "host") || [];
    const projectEntities = entities?.filter((e) => inferEntityKind(e) === "project") || [];
    const hasProjectAccess = hostEntities.length > 0 || projectEntities.length > 0;
    const hasFestivalAccess = !!(hasBackstageAccess && displayedFestivals.length > 0);
    const hasVenueAccess = !!(myVenues && myVenues.length > 0);
    const hasAnyAccess = hasProjectAccess || hasFestivalAccess || hasVenueAccess;

    return (
      <div className="min-h-[100svh] bg-background">
        {/* Top bar */}
        <header
          className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
        >
          <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
            <Link to="/" className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
              GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px] sm:text-base">BACKSTAGE</span>
            </Link>
            <div className="flex items-center gap-2">
              <PersonaSelector />
              <img src={gIcon} alt="" className="h-8 w-8 object-contain" />
            </div>
          </div>
        </header>

        {/* Hero section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-background to-accent-warm/5" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-warm/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

          <div className="relative w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
            <div className="max-w-5xl">
              <ActivePersonaCard persona={activePersona} />
            </div>
          </div>
        </section>

        {/* Main content */}
        <main
          className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 space-y-6 sm:space-y-8"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)" }}
        >
          {/* Pending invitations */}
          <PendingInvitations />

          {/* Onboarding confirmation */}
          {fromOnboarding && (
            <section className="rounded-xl border border-accent/20 bg-accent/5 p-4 sm:p-6 space-y-3">
              <h3 className="text-sm font-semibold text-accent">Profil opprettet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dette er din profesjonelle profil på GIGGEN. Du kan når som helst endre den fra dashbordet.
              </p>

              {activePersona.type === "musician" && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Neste steg:</strong> Vent på invitasjon fra festival eller arrangør – eller be om tilgang til et prosjekt.
                  </p>
                  <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
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
            </section>
          )}

          {/* Prosjekter */}
          {hasProjectAccess && (
            <section className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Prosjekter du er med i
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {hostEntities.map((entity) => (
                  <Link
                    key={entity.id}
                    to={`/dashboard/entities/${entity.id}/edit`}
                    className="group relative rounded-xl border border-border/30 bg-card/40 overflow-hidden hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                  >
                    {entity.hero_image_url ? (
                      <div className="relative h-24 sm:h-28 w-full overflow-hidden">
                        <EntityHeroImage imageUrl={entity.hero_image_url} imageSettings={entity.hero_image_settings} name={entity.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                      </div>
                    ) : (
                      <div className="h-24 sm:h-28 w-full bg-secondary/30 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-1 truncate">{entity.name}</h3>
                      <p className="text-xs text-muted-foreground">{ACCESS_DESCRIPTIONS[entity.access]}</p>
                    </div>
                  </Link>
                ))}
                {projectEntities.map((entity) => (
                  <Link
                    key={entity.id}
                    to={`/dashboard/entities/${entity.id}/edit`}
                    className="group relative rounded-xl border border-border/30 bg-card/40 overflow-hidden hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                  >
                    {entity.hero_image_url ? (
                      <div className="relative h-24 sm:h-28 w-full overflow-hidden">
                        <EntityHeroImage imageUrl={entity.hero_image_url} imageSettings={entity.hero_image_settings} name={entity.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                      </div>
                    ) : (
                      <div className="h-24 sm:h-28 w-full bg-secondary/30 flex items-center justify-center">
                        {entity.type === "band" ? <Users className="h-8 w-8 text-muted-foreground/20" /> : <User className="h-8 w-8 text-muted-foreground/20" />}
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-1 truncate">{entity.name}</h3>
                      <p className="text-xs text-muted-foreground">{ACCESS_DESCRIPTIONS[entity.access]}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Festival-team */}
          {hasFestivalAccess && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Festival-team
                </h2>
                <span className="text-[11px] text-muted-foreground/50">
                  {displayedFestivals.length} festival{displayedFestivals.length !== 1 ? "er" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {displayedFestivals.map((festival) => (
                  <Link
                    key={festival.id}
                    to={`/dashboard/festival/${festival.id}`}
                    className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                        <Calendar className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={festival.status === "published" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {festival.status === "published" ? "Publisert" : "Utkast"}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{festival.name}</h3>
                    {festival.start_at && (
                      <p className="text-[10px] text-muted-foreground/60">
                        {new Date(festival.start_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Venues */}
          {hasVenueAccess && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Venues
                </h2>
                <span className="text-[11px] text-muted-foreground/50">
                  {myVenues!.length} venue{myVenues!.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {myVenues!.map((venue) => (
                  <Link
                    key={venue.id}
                    to={`/dashboard/venue/${venue.id}`}
                    className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                        <Building2 className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={venue.is_published ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {venue.is_published ? "Publisert" : "Utkast"}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{venue.name}</h3>
                    {venue.city && (
                      <p className="text-[10px] text-muted-foreground/60">{venue.city}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!hasAnyAccess && !fromOnboarding && (
            <section className="py-16 text-center">
              <div className="max-w-md mx-auto space-y-3">
                <p className="text-sm text-muted-foreground">Du har ingen tilgang ennå.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/request-access">Be om tilgang</Link>
                </Button>
                <p className="text-[11px] text-muted-foreground/50">
                  Festivalen og arrangørene oppretter prosjekter og program.
                </p>
              </div>
            </section>
          )}

          {/* Admin/Crew */}
          {(isAdmin || isStaff) && (
            <section className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                {isAdmin ? "Admin & Crew" : "Crew-verktøy"}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {isAdmin && (
                  <Link to="/admin">
                    <div className="group relative rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 hover:border-accent/30 hover:bg-card/80 hover:shadow-lg hover:shadow-accent/5 cursor-pointer transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                          <Settings className="h-5 w-5 text-accent" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">Admin Panel</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">Administrasjon</p>
                    </div>
                  </Link>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  const canEdit = (access: AccessLevel) => ["editor", "admin", "owner"].includes(access);

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
              GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px] sm:text-base">BACKSTAGE</span>
            </Link>
          </div>
          {!USE_PERSONA_MODUS_BAR && <PersonaSelector />}
          <img src={gIcon} alt="" className="h-8 w-8 object-contain" />
        </div>
      </header>

      {USE_PERSONA_MODUS_BAR && <PersonaModusBar />}

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-background to-accent-warm/5" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-warm/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="max-w-5xl flex items-center gap-4 sm:gap-5">
            <Avatar className="h-14 w-14 sm:h-20 sm:w-20 border-2 border-border/50 shrink-0">
              <AvatarImage src={profileAvatarUrl || undefined} style={profileAvatarStyles} className="object-cover" />
              <AvatarFallback className="text-lg sm:text-2xl bg-muted text-muted-foreground">
                {(currentUser?.displayName || currentUser?.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.1] truncate">
                Hei, {userName}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Ditt rom før scenen.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main
        className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 space-y-6 sm:space-y-8"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)" }}
      >
        {/* Filter indicator */}
        {selectedPersonaId && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="opacity-70">Filtrert etter profil</span>
            <button onClick={clearPersonaFilter} className="text-foreground/70 hover:text-foreground transition-colors underline underline-offset-2">
              Vis alt
            </button>
          </div>
        )}

        {/* Pending invitations */}
        <PendingInvitations />

        {/* Persona section */}
        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Din profil
          </h2>
          {!isLoadingPersonas && personas && personas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {personas.map((persona) => (
                <Link
                  key={persona.id}
                  to={`/dashboard/personas/${persona.id}`}
                  className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-border/50 shrink-0">
                      <AvatarImage src={persona.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback className="text-sm bg-muted text-muted-foreground font-medium">
                        {persona.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{persona.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {persona.is_public ? (
                          <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">Offentlig</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-normal text-warning border-warning/30 px-1.5 py-0">Privat</Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                  </div>
                </Link>
              ))}
              <Link
                to="/dashboard/personas/new"
                className="group relative rounded-xl border-2 border-dashed border-border/20 hover:border-accent/40 p-5 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 group-hover:border-accent flex items-center justify-center transition-colors duration-300">
                    <Plus className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Legg til ny profil</p>
                    <p className="text-[11px] text-muted-foreground/60">For en annen rolle eller alias</p>
                  </div>
                </div>
              </Link>
            </div>
          ) : !isLoadingPersonas ? (
            <Link
              to="/dashboard/personas/new"
              className="group relative rounded-xl border border-border/30 bg-card/40 p-6 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Lag din profil</p>
                  <p className="text-xs text-muted-foreground">Vis deg frem som musiker, fotograf eller DJ</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
              </div>
            </Link>
          ) : null}
        </section>

        {/* Entities sections */}
        {(() => {
          const hostEntities = entities?.filter((e) => inferEntityKind(e) === "host") || [];
          const projectEntities = entities?.filter((e) => inferEntityKind(e) === "project") || [];

          return (
            <>
              {/* Host entities (venues) */}
              {hostEntities.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                    {selectedPersonaId ? "Scener" : "Dine scener"}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                    {hostEntities.map((entity) => {
                      const typeConfig = TYPE_CONFIG[entity.type as EntityType];
                      return (
                        <Link
                          key={entity.id}
                          to={`/dashboard/entities/${entity.id}/edit`}
                          className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                              <Building2 className="h-5 w-5 text-accent" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              {entity.is_published && (
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link to={`${typeConfig.route}/${entity.slug}`} target="_blank" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                            </div>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground mb-1 truncate">{entity.name}</h3>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">{typeConfig.label}</Badge>
                            {entity.city && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
                                <MapPin className="h-2.5 w-2.5" />
                                {entity.city}
                              </span>
                            )}
                            {!entity.is_published && (
                              <Badge variant="outline" className="text-[10px] font-normal text-warning border-warning/30 px-1.5 py-0">Utkast</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{ACCESS_DESCRIPTIONS[entity.access]}</p>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Project entities (artists/bands) */}
              <section className="space-y-3">
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  {selectedPersonaId ? "Prosjekter" : "Dine prosjekter"}
                </h2>
                {projectEntities.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                    {projectEntities.map((entity) => {
                      const typeConfig = TYPE_CONFIG[entity.type as EntityType];
                      return (
                        <Link
                          key={entity.id}
                          to={`/dashboard/entities/${entity.id}/edit`}
                          className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                              {entity.type === "band" ? <Users className="h-5 w-5 text-accent" /> : <User className="h-5 w-5 text-accent" />}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {entity.is_published && (
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link to={`${typeConfig.route}/${entity.slug}`} target="_blank" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                            </div>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground mb-1 truncate">{entity.name}</h3>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">{typeConfig.label}</Badge>
                            {entity.city && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
                                <MapPin className="h-2.5 w-2.5" />
                                {entity.city}
                              </span>
                            )}
                            {!entity.is_published && (
                              <Badge variant="outline" className="text-[10px] font-normal text-warning border-warning/30 px-1.5 py-0">Utkast</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{ACCESS_DESCRIPTIONS[entity.access]}</p>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/30 bg-card/40 p-6 text-center space-y-2">
                    {selectedPersonaId ? (
                      <>
                        <p className="text-sm text-muted-foreground">Ingen prosjekter for denne profilen ennå.</p>
                        <button onClick={clearPersonaFilter} className="text-xs text-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors">
                          Se alle prosjekter
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">Du er ikke med i noen prosjekter ennå.</p>
                        <p className="text-xs text-muted-foreground">
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

        {/* Festivals */}
        {hasBackstageAccess && displayedFestivals.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Festival-team
              </h2>
              <span className="text-[11px] text-muted-foreground/50">
                {displayedFestivals.length} festival{displayedFestivals.length !== 1 ? "er" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {displayedFestivals.map((festival) => (
                <Link
                  key={festival.id}
                  to={`/dashboard/festival/${festival.id}`}
                  className="group relative rounded-xl border border-border/30 bg-card/40 p-5 hover:border-accent/30 hover:bg-card/70 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                      <Calendar className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={festival.status === "published" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {festival.status === "published" ? "Publisert" : "Utkast"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{festival.name}</h3>
                  {festival.start_at && (
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(festival.start_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Admin/Crew */}
        {(isAdmin || isStaff) && (
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              {isAdmin ? "Admin & Crew" : "Crew-verktøy"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {isAdmin && (
                <Link to="/admin">
                  <div className="group relative rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 hover:border-accent/30 hover:bg-card/80 hover:shadow-lg hover:shadow-accent/5 cursor-pointer transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                        <Settings className="h-5 w-5 text-accent" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Admin Panel</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Administrasjon og innhold</p>
                  </div>
                </Link>
              )}
              {isStaff && (
                <Link to="/crew/checkin">
                  <div className="group relative rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 hover:border-accent/30 hover:bg-card/80 hover:shadow-lg hover:shadow-accent/5 cursor-pointer transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-9 w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors duration-300">
                        <QrCode className="h-5 w-5 text-accent" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Check-in</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Scan og billettkontroll</p>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Passive CTA */}
        {entities && entities.length > 0 && (
          <div className="text-center pt-1 pb-4">
            <p className="text-xs text-muted-foreground/70">
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
