import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  Users,
  Calendar,
  MapPin,
  Building2,
  User,
  X,
  ChevronRight,
  Ticket,
  SlidersHorizontal,
  Mic2,
  Briefcase,
  Eye,
  RefreshCw,
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
const MODES: { key: UtforskMode; label: string; description: string; icon: React.ReactNode }[] = [
  { key: "publikum", label: "Publikum", description: "Finn events, artister og spillesteder", icon: <Eye className="w-5 h-5" /> },
  { key: "musiker", label: "Musiker", description: "Se spillesteder og andre artister", icon: <Mic2 className="w-5 h-5" /> },
  { key: "arrangor", label: "Arrangør", description: "Finn artister og band til bookinger", icon: <Briefcase className="w-5 h-5" /> },
];

const MODE_LABEL_MAP: Record<UtforskMode, string> = {
  publikum: "Publikum",
  musiker: "Musiker",
  arrangor: "Arrangør",
};

/* ── Mode picker modal ───────────────────────────── */
function ModePickerModal({ onSelect }: { onSelect: (mode: UtforskMode) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <div className="w-full max-w-sm bg-popover border border-border p-6 space-y-5 animate-slide-up">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-foreground">Hva utforsker du som i dag?</h2>
          <p className="text-xs text-muted-foreground">Du kan bytte visning når som helst</p>
        </div>
        <div className="space-y-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-left border border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all group"
            >
              <span className="text-muted-foreground group-hover:text-accent transition-colors">
                {m.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-accent transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
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
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium bg-black/50 text-white/70 backdrop-blur-sm">
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
      className="group block mx-4 mb-6 relative overflow-hidden"
    >
      <div className="relative bg-accent/5 border-l-2 border-accent/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="w-4 h-4 text-accent/70" />
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
  const hasChosenMode = !!urlMode || !!sessionStorage.getItem("utforsk-mode");
  const [mode, setMode] = useState<UtforskMode>(urlMode || (sessionStorage.getItem("utforsk-mode") as UtforskMode) || "publikum");
  const [showModePicker, setShowModePicker] = useState(!hasChosenMode && !autoMode);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(
    searchParams.get("type") || undefined
  );

  useEffect(() => {
    if (!urlMode && autoMode) {
      setMode(autoMode);
      setShowModePicker(false);
    }
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
    sessionStorage.setItem("utforsk-mode", newMode);
  }

  function handleModalSelect(newMode: UtforskMode) {
    handleModeChange(newMode);
    setShowModePicker(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Mode picker modal ────────────────── */}
      {showModePicker && <ModePickerModal onSelect={handleModalSelect} />}
      {/* ── Header ─────────────────────────────── */}
      <header className="px-4 pt-12 pb-3 max-w-5xl mx-auto w-full">
        <h1 className="text-display text-3xl sm:text-4xl tracking-tight">Utforsk</h1>
      </header>

      {/* ── Toolbar: search + filters ────────── */}
      <div className="px-4 pb-4 max-w-5xl mx-auto w-full space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søk etter navn..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/40 pl-10 pr-10 py-2.5 text-base border-b border-border/50 focus:border-accent/50 focus:outline-none transition-all"
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

        {/* Mode + type in one row */}
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />

          <Select
            value={mode}
            onValueChange={(v) => handleModeChange(v as UtforskMode)}
          >
            <SelectTrigger className="w-auto gap-1.5 h-8 px-3 text-xs bg-transparent border-border/50">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 text-muted-foreground/60" />
                {MODE_LABEL_MAP[mode]}
              </span>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Bytt visning
              </div>
              {MODES.map((m) => (
                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter || "alle"}
            onValueChange={(v) => setTypeFilter(v === "alle" ? undefined : v)}
          >
            <SelectTrigger className="w-auto gap-1.5 h-8 px-3 text-xs bg-transparent border-border/50">
              <SelectValue />
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
              className="flex items-center gap-1 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-all"
            >
              <X className="w-3 h-3" />
              Nullstill
            </button>
          )}
        </div>
      </div>

      {/* ── Festival banner ──────────────────── */}
      {!hasActiveFilters && <FestivalBanner />}

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
