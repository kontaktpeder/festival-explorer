import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  Users,
  Mic2,
  Briefcase,
  Calendar,
  MapPin,
  Building2,
  User,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { EventCard } from "@/components/ui/EventCard";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { CroppedImage } from "@/components/ui/CroppedImage";
import { getEntityPublicRoute } from "@/lib/entity-types";
import {
  useUtforskEntities,
  useUtforskEvents,
  useAutoMode,
  type UtforskMode,
} from "@/hooks/useUtforsk";
import type { Entity, Event } from "@/types/database";

/* ── Mode config ────────────────────────────────── */
const MODES: { key: UtforskMode; label: string; icon: React.ReactNode; description: string }[] = [
  { key: "publikum", label: "Publikum", icon: <Users className="w-4 h-4" />, description: "Events, artister og spillesteder" },
  { key: "musiker", label: "Musikere", icon: <Mic2 className="w-4 h-4" />, description: "Finn spillesteder og samarbeidspartnere" },
  { key: "arrangor", label: "Arrangører", icon: <Briefcase className="w-4 h-4" />, description: "Finn artister og crew" },
];

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  solo: { label: "Soloartist", icon: <User className="w-3.5 h-3.5" /> },
  band: { label: "Band", icon: <Users className="w-3.5 h-3.5" /> },
  venue: { label: "Spillested", icon: <Building2 className="w-3.5 h-3.5" /> },
};

/* ── Entity card ─────────────────────────────────── */
function EntityGridCard({ entity }: { entity: Entity }) {
  const imageUrl = useSignedMediaUrl(entity.hero_image_url, "public");
  const route = getEntityPublicRoute(entity.type, entity.slug);
  const typeInfo = TYPE_LABELS[entity.type];

  return (
    <Link to={route} className="cosmic-card block group overflow-hidden">
      {imageUrl ? (
        <div className="relative h-32 sm:h-40 overflow-hidden">
          <CroppedImage
            src={imageUrl}
            alt={entity.name}
            imageSettings={entity.hero_image_settings}
            aspect="hero"
            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          {typeInfo && (
            <span className="absolute top-2 left-2 cosmic-tag text-[10px] gap-1">
              {typeInfo.icon}
              {typeInfo.label}
            </span>
          )}
        </div>
      ) : (
        <div className="relative h-32 sm:h-40 bg-secondary flex items-center justify-center">
          <span className="text-3xl font-bold text-muted-foreground/20">
            {entity.name.charAt(0)}
          </span>
          {typeInfo && (
            <span className="absolute top-2 left-2 cosmic-tag text-[10px] gap-1">
              {typeInfo.icon}
              {typeInfo.label}
            </span>
          )}
        </div>
      )}
      <div className="p-3">
        <h3 className="text-sm sm:text-base text-display font-semibold group-hover:text-accent transition-colors truncate">
          {entity.name}
        </h3>
        {entity.tagline && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{entity.tagline}</p>
        )}
        {entity.city && (
          <p className="text-xs text-muted-foreground/60 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {entity.city}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ── Main page ───────────────────────────────────── */
export default function UtforskPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const autoMode = useAutoMode();

  // Read mode from URL or auto-detect or default to publikum
  const urlMode = searchParams.get("mode") as UtforskMode | null;
  const [mode, setMode] = useState<UtforskMode>(urlMode || "publikum");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(
    searchParams.get("type") || undefined
  );
  const [showFilters, setShowFilters] = useState(false);

  // Auto-set mode from persona on first load (only if no URL override)
  useEffect(() => {
    if (!urlMode && autoMode) {
      setMode(autoMode);
    }
  }, [autoMode, urlMode]);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (mode !== "publikum") params.set("mode", mode);
    if (searchQuery) params.set("q", searchQuery);
    if (typeFilter) params.set("type", typeFilter);
    setSearchParams(params, { replace: true });
  }, [mode, searchQuery, typeFilter, setSearchParams]);

  const filters = useMemo(
    () => ({ type: typeFilter, search: searchQuery || undefined }),
    [typeFilter, searchQuery]
  );

  const { data: entities, isLoading: loadingEntities } = useUtforskEntities(mode, filters);
  const { data: events, isLoading: loadingEvents } = useUtforskEvents(mode, {
    search: searchQuery || undefined,
  });

  const activeMode = MODES.find((m) => m.key === mode)!;
  const showEvents = mode === "publikum" && (events?.length ?? 0) > 0;
  const isLoading = loadingEntities || loadingEvents;

  function handleModeChange(newMode: UtforskMode) {
    setMode(newMode);
    setTypeFilter(undefined); // reset type filter on mode change
  }

  function clearFilters() {
    setSearchQuery("");
    setTypeFilter(undefined);
  }

  const hasActiveFilters = !!searchQuery || !!typeFilter;

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        {/* ── Header ─────────────────────────────── */}
        <header className="px-4 pt-10 pb-2">
          <h1 className="text-display text-2xl sm:text-3xl mb-1">Utforsk</h1>
          <p className="text-sm text-muted-foreground">{activeMode.description}</p>
        </header>

        {/* ── Mode selector ──────────────────────── */}
        <div className="px-4 py-4">
          <div className="flex gap-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => handleModeChange(m.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-medium tracking-wide uppercase transition-all duration-200 ${
                  mode === m.key
                    ? "bg-accent text-accent-foreground shadow-[0_0_20px_hsl(24_100%_55%/0.25)]"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {m.icon}
                <span className="hidden sm:inline">{m.label}</span>
                <span className="sm:hidden">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Search & filters ───────────────────── */}
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søk etter navn..."
                className="w-full bg-secondary text-foreground placeholder:text-muted-foreground pl-10 pr-4 py-2.5 rounded-sm text-sm border border-border focus:border-accent focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm border transition-colors ${
                showFilters || hasActiveFilters
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 animate-slide-up" style={{ animationDuration: "0.3s" }}>
              <button
                onClick={() => setTypeFilter(undefined)}
                className={`cosmic-tag cursor-pointer transition-colors ${
                  !typeFilter ? "bg-accent/20 text-accent" : "hover:bg-secondary/80"
                }`}
              >
                Alle
              </button>
              {Object.entries(TYPE_LABELS).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(typeFilter === key ? undefined : key)}
                  className={`cosmic-tag cursor-pointer transition-colors flex items-center gap-1.5 ${
                    typeFilter === key ? "bg-accent/20 text-accent" : "hover:bg-secondary/80"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="cosmic-tag cursor-pointer text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-3 h-3 mr-1" />
                  Nullstill
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Content ────────────────────────────── */}
        {isLoading ? (
          <LoadingState />
        ) : (
          <div className="px-4 pb-16 space-y-8">
            {/* Events section (publikum only) */}
            {showEvents && (
              <section>
                <h2 className="section-title flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Kommende events
                </h2>
                <div className="space-y-3">
                  {events!.slice(0, 6).map((event, i) => (
                    <div
                      key={event.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <EventCard event={event} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Entities grid */}
            {entities && entities.length > 0 ? (
              <section>
                {showEvents && (
                  <h2 className="section-title flex items-center gap-2 mt-4">
                    <Users className="w-4 h-4" />
                    {mode === "publikum" ? "Artister & spillesteder" : "Resultater"}
                  </h2>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {entities.map((entity, i) => (
                    <div
                      key={entity.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <EntityGridCard entity={entity} />
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              !showEvents && (
                <EmptyState
                  icon={<Search className="w-12 h-12" />}
                  title="Ingen treff"
                  description={
                    hasActiveFilters
                      ? "Prøv å endre søk eller filtre."
                      : "Det er ingen publiserte oppføringer ennå."
                  }
                />
              )
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
