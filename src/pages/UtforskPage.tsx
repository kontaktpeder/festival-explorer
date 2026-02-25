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
  ChevronRight,
  Ticket,
} from "lucide-react";
import { EventCard } from "@/components/ui/EventCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { CroppedImage } from "@/components/ui/CroppedImage";
import { getEntityPublicRoute } from "@/lib/entity-types";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import {
  useUtforskEntities,
  useUtforskEvents,
  useAutoMode,
  type UtforskMode,
} from "@/hooks/useUtforsk";
import type { Entity, Event } from "@/types/database";

/* ── Mode config ────────────────────────────────── */
const MODES: { key: UtforskMode; label: string; icon: React.ReactNode }[] = [
  { key: "publikum", label: "Publikum", icon: <Users className="w-4 h-4" /> },
  { key: "musiker", label: "Musikere", icon: <Mic2 className="w-4 h-4" /> },
  { key: "arrangor", label: "Arrangører", icon: <Briefcase className="w-4 h-4" /> },
];

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  solo: { label: "Soloartist", icon: <User className="w-3 h-3" /> },
  band: { label: "Band", icon: <Users className="w-3 h-3" /> },
  venue: { label: "Spillested", icon: <Building2 className="w-3 h-3" /> },
};

/* ── Entity card ─────────────────────────────────── */
function EntityGridCard({ entity }: { entity: Entity }) {
  const imageUrl = useSignedMediaUrl(entity.hero_image_url, "public");
  const route = getEntityPublicRoute(entity.type, entity.slug);
  const typeInfo = TYPE_LABELS[entity.type];

  return (
    <Link to={route} className="group block">
      <div className="relative aspect-[3/4] rounded-sm overflow-hidden bg-secondary">
        {imageUrl ? (
          <>
            <CroppedImage
              src={imageUrl}
              alt={entity.name}
              imageSettings={entity.hero_image_settings}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              containerClassName="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground/15">
              {entity.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Type badge */}
        {typeInfo && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium bg-black/50 text-white/70 backdrop-blur-sm">
            {typeInfo.icon}
            {typeInfo.label}
          </span>
        )}

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-semibold text-white leading-tight truncate group-hover:text-accent transition-colors duration-300">
            {entity.name}
          </h3>
          {entity.tagline && (
            <p className="text-[11px] text-white/50 truncate mt-0.5">{entity.tagline}</p>
          )}
          {entity.city && (
            <p className="text-[11px] text-white/35 flex items-center gap-1 mt-1">
              <MapPin className="w-2.5 h-2.5" />
              {entity.city}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Festival banner ─────────────────────────────── */
function FestivalBanner() {
  return (
    <Link
      to="/festival"
      className="group block mx-4 mb-6 relative overflow-hidden rounded-sm"
    >
      <div className="relative bg-gradient-to-r from-accent/15 via-accent/5 to-transparent border border-accent/20 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">GIGGEN Festival 2026</p>
            <p className="text-xs text-muted-foreground">14. mars · Josefines Vertshus, Oslo</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-accent/60 group-hover:text-accent transition-colors" />
      </div>
    </Link>
  );
}

/* ── Main page ───────────────────────────────────── */
export default function UtforskPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const autoMode = useAutoMode();

  const urlMode = searchParams.get("mode") as UtforskMode | null;
  const [mode, setMode] = useState<UtforskMode>(urlMode || "publikum");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(
    searchParams.get("type") || undefined
  );

  useEffect(() => {
    if (!urlMode && autoMode) setMode(autoMode);
  }, [autoMode, urlMode]);

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

  const showEvents = mode === "publikum" && (events?.length ?? 0) > 0;
  const isLoading = loadingEntities || loadingEvents;
  const hasActiveFilters = !!searchQuery || !!typeFilter;

  function handleModeChange(newMode: UtforskMode) {
    setMode(newMode);
    setTypeFilter(undefined);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ─────────────────────────────── */}
      <header className="px-4 pt-12 pb-3 max-w-5xl mx-auto w-full">
        <h1 className="text-display text-3xl sm:text-4xl tracking-tight">Utforsk</h1>
      </header>

      {/* ── Mode selector – pill style ────────── */}
      <div className="px-4 pb-4 max-w-5xl mx-auto w-full flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 shrink-0">Utforsk som</span>
        <div className="inline-flex bg-secondary/60 rounded-full p-1 gap-0.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => handleModeChange(m.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === m.key
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search bar ───────────────────────── */}
      <div className="px-4 pb-3 max-w-5xl mx-auto w-full">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søk etter navn..."
            className="w-full bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 pl-10 pr-10 py-3 rounded-sm text-base border border-border/50 focus:border-accent/50 focus:bg-secondary/60 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Type filter ──────────────────────── */}
      <div className="px-4 pb-5 max-w-5xl mx-auto w-full flex items-center gap-2">
        <Select
          value={typeFilter || "alle"}
          onValueChange={(v) => setTypeFilter(v === "alle" ? undefined : v)}
        >
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <SelectValue placeholder="Filtrer på type" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="alle">Alle typer</SelectItem>
            {Object.entries(TYPE_LABELS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearchQuery(""); setTypeFilter(undefined); }}
            className="flex items-center gap-1 px-3 py-2 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-all"
          >
            <X className="w-3 h-3" />
            Nullstill
          </button>
        )}
      </div>

      {/* ── Festival banner ──────────────────── */}
      {mode === "publikum" && !hasActiveFilters && <FestivalBanner />}

      {/* ── Content ──────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full">
        {isLoading ? (
          <LoadingState />
        ) : (
          <div className="px-4 pb-12 space-y-8">
            {/* Events (publikum only) */}
            {showEvents && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 mb-4 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
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

            {/* Entities */}
            {entities && entities.length > 0 ? (
              <section>
                {showEvents && (
                  <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 mb-4 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Artister & spillesteder
                  </h2>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
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
      </main>

      {/* ── Footer ───────────────────────────── */}
      <FestivalFooter />
    </div>
  );
}
