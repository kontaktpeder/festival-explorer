import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, Settings, Music, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFestivalShell, useFestivalDetails } from "@/hooks/useFestival";
import { useFestivalPageSeo } from "@/hooks/useFestivalPageSeo";
import type { FestivalSeoParams } from "@/lib/festival-seo";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { ProgramView } from "@/components/program/ProgramView";
import { mapFestivalToProgramCategories } from "@/lib/program-mappers";
import { SectionRenderer } from "@/components/festival/SectionRenderer";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { DualLineupSection } from "@/components/festival/DualLineupSection";
import { LineupPostersSection } from "@/components/festival/LineupPostersSection";
import { LineupWithTimeSection } from "@/components/festival/LineupWithTimeSection";
import lineupCtaBg from "@/assets/lineup-cta-bg.jpg";
import lineupCtaBgWarm from "@/assets/lineup-cta-bg-warm.jpg";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { PraktiskSection } from "@/components/festival/PraktiskSection";
import { UtforskMerSection } from "@/components/festival/UtforskMerSection";
import { SocialSection } from "@/components/festival/SocialSection";
import { EventParticipantItem } from "@/components/ui/EventParticipantItem";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { TICKET_SALES_ENABLED } from "@/lib/ticket-config";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// ─── Slot system ────────────────────────────────────────────────
const SLOT_ORDER = [
  { slot: "hero", sectionType: "hero" },
  { slot: "facts_bar", sectionType: null },
  { slot: "poster_body", sectionType: "poster_body" },
  { slot: "praktisk", sectionType: "praktisk" },
  { slot: "cta", sectionType: "cta" },
  { slot: "venue", sectionType: "venue-plakat" },
  { slot: "utforsk", sectionType: "utforsk" },
  { slot: "faq", sectionType: "faq" },
  { slot: "team", sectionType: "team" },
  { slot: "footer", sectionType: "footer" },
] as const;

function getSectionByType(
  sections: Array<{ type: string; [k: string]: unknown }>,
  type: string
) {
  return sections?.find((s) => s.type === type) ?? null;
}

// ─── Slot components ────────────────────────────────────────────

// (SEOIntroSlot removed – merged into poster_body slot)

const DEFAULT_FAQ = [
  { q: "Når er festivalen?", a: "Se dato under hero og i program." },
  {
    q: "Hvor er festivalen?",
    a: "Festivalen er på spillestedet som er oppgitt over.",
  },
  { q: "Hva slags musikk er det?", a: "Live musikk – ulike artister og sjangre." },
  {
    q: "Kan jeg kjøpe billett i døra?",
    a: "Ja, hvis det er ledige plasser. Vi anbefaler forhåndskjøp.",
  },
  {
    q: "Aldersgrense?",
    a: "18 år, med mindre annet er oppgitt under praktisk info.",
  },
  {
    q: "Hvordan kommer jeg meg dit?",
    a: "Se praktisk info og venue-siden for adresse og kollektiv.",
  },
];

function FaqSlot({
  faqItems,
}: {
  faqItems?: Array<{ q: string; a: string }> | null;
}) {
  const items =
    faqItems && faqItems.length > 0 ? faqItems : DEFAULT_FAQ;
  return (
    <section className="relative bg-background py-16 md:py-24 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-display text-xl md:text-2xl font-bold tracking-tight">
          Ofte stilte spørsmål
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {items.map(({ q, a }, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-foreground/10">
              <AccordionTrigger className="text-left text-foreground text-base hover:no-underline">
                {q || "Spørsmål"}
              </AccordionTrigger>
              <AccordionContent className="text-foreground/70 text-sm">
                {a || "Svar"}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

// ─── Practical info helpers ──────────────────────────────────────
function getFirstString(
  obj: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function formatTimeIfNeeded(value: string | null): string | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;
  try {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime()))
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    // fallthrough
  }
  return trimmed;
}

const PRACTICAL_ROW_CONFIG: Array<{
  label: string;
  festivalKeys: string[];
  venueKeys: string[];
  formatValue?: (v: string | null) => string | null;
}> = [
  { label: "Dører åpner", festivalKeys: ["doors_open_at", "doors_time", "practical_doors"], venueKeys: [], formatValue: formatTimeIfNeeded },
  { label: "Aldersgrense", festivalKeys: ["age_limit", "practical_age"], venueKeys: ["age_limit"] },
  { label: "Garderobe", festivalKeys: ["practical_wardrobe", "wardrobe_info"], venueKeys: ["wardrobe_info"] },
  { label: "Tilgjengelighet", festivalKeys: ["practical_accessibility"], venueKeys: ["accessibility"] },
  { label: "Mat og bar", festivalKeys: ["practical_food_bar"], venueKeys: [] },
  { label: "Transport", festivalKeys: ["practical_transport"], venueKeys: ["address", "transport_info"] },
  { label: "Kontakt", festivalKeys: ["practical_contact"], venueKeys: ["contact_email", "contact_phone", "website"] },
];

function buildPracticalRows({
  festival,
  venue,
}: {
  festival: Record<string, unknown> | null | undefined;
  venue: Record<string, unknown> | null | undefined;
}): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  for (const { label, festivalKeys, venueKeys, formatValue } of PRACTICAL_ROW_CONFIG) {
    let value =
      getFirstString(festival as Record<string, unknown>, festivalKeys) ??
      getFirstString(venue as Record<string, unknown>, venueKeys);
    if (value != null && formatValue) value = formatValue(value) ?? value;
    if (value != null && value !== "") rows.push({ label, value });
  }
  return rows;
}

function PracticalInfoSlot({
  festival,
  venue,
}: {
  festival: Record<string, unknown> | null | undefined;
  venue: Record<string, unknown> | null | undefined;
}) {
  const rows = buildPracticalRows({ festival, venue });
  if (rows.length === 0) return null;

  return (
    <section className="relative bg-background py-16 md:py-24 px-6">
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-display text-xl md:text-2xl font-bold tracking-tight">
          Praktisk informasjon
        </h2>
        <div className="space-y-3">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
              <p className="text-foreground/70 text-base">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSlot({
  festivalName,
  city,
  year,
}: {
  festivalName: string;
  city: string;
  year: string;
}) {
  return (
    <section className="relative bg-background py-16 md:py-24 px-6 text-center">
      <div className="max-w-xl mx-auto space-y-6">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">
          Sikre deg billett til {festivalName} {city} {year}
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/tickets"
            className={`btn-accent text-center ${
              !TICKET_SALES_ENABLED
                ? "opacity-50 cursor-not-allowed pointer-events-none"
                : ""
            }`}
            onClick={(e) => {
              if (!TICKET_SALES_ENABLED) e.preventDefault();
            }}
          >
            Kjøp billetter
          </Link>
          <Link
            to="/festival/program"
            className="border border-foreground/30 hover:border-foreground/60 text-foreground text-center text-sm font-bold uppercase tracking-wider rounded-full px-6 py-3 transition-all"
          >
            Program
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Main component ─────────────────────────────────────────────

export default function FestivalPage() {
  const { slug } = useParams<{ slug: string }>();
  const festivalSlug = slug || "giggen-festival-for-en-kveld";

  const {
    data: shell,
    isLoading: shellLoading,
    error: shellError,
  } = useFestivalShell(festivalSlug);
  const { data: details } = useFestivalDetails(shell?.id);

  const { data: venue } = useQuery({
    queryKey: ["venue", shell?.venue_id],
    queryFn: async () => {
      if (!shell?.venue_id) return null;
      const { data } = await supabase
        .from("venues")
        .select("*")
        .eq("id", shell.venue_id)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
    enabled: !!shell?.venue_id,
  });

  const themeHeroUrl = useSignedMediaUrl(shell?.theme?.hero_image_url, "public");

  // ─── Derived data ───────────────────────────────────────────
  const city =
    (venue?.city as string) ?? (shell as any)?.city ?? "Oslo";
  const year = shell?.start_at
    ? String(new Date(shell.start_at).getFullYear())
    : shell?.end_at
      ? String(new Date(shell.end_at).getFullYear())
      : String(new Date().getFullYear());
  const venueName =
    venue?.name ?? (shell as any)?.venue_name ?? "spillestedet";
  const startDateIso = shell?.start_at
    ? new Date(shell.start_at).toISOString().slice(0, 10)
    : "";
  const endDateIso = shell?.end_at
    ? new Date(shell.end_at).toISOString().slice(0, 10)
    : undefined;

  const seoIntroRaw = (shell as any)?.seo_intro?.trim();
  const eventDescriptionForSeo =
    seoIntroRaw && seoIntroRaw.length > 0
      ? seoIntroRaw.slice(0, 220).trim()
      : null;

  const seoParams: FestivalSeoParams | null = shell
    ? {
        festivalName: shell.name,
        city,
        year,
        venueName,
        startDate: startDateIso || new Date().toISOString().slice(0, 10),
        endDate: endDateIso ?? null,
        heroImageUrl: themeHeroUrl || null,
        slug: festivalSlug,
        updatedAt: (shell as any)?.updated_at ?? null,
        eventDescription: eventDescriptionForSeo,
        performers: (details?.allArtistsWithEventSlug ?? [])
          .map((a: { name?: string }) => (a?.name ? { name: a.name } : null))
          .filter(Boolean) as Array<{ name: string }>,
      }
    : null;

  useFestivalPageSeo(seoParams, (shell as any)?.seo_description);

  const dateRange =
    shell?.start_at && shell?.end_at
      ? `${format(new Date(shell.start_at), "d. MMM", { locale: nb })} – ${format(new Date(shell.end_at), "d. MMM yyyy", { locale: nb })}`
      : shell?.start_at
        ? format(new Date(shell.start_at), "d. MMMM yyyy", { locale: nb })
        : null;

  const heroImage = themeHeroUrl || undefined;

  const validEvents = (details?.festivalEvents || []).filter(
    (fe) => fe.event && fe.event.status === "published"
  );
  const allArtistsWithEventSlug = details?.allArtistsWithEventSlug || [];
  const festivalTeam = details?.festivalTeam;
  const festivalProgramSlots = details?.festivalProgramSlots || [];

  const eventIdToSlug = useMemo(() => {
    const m: Record<string, string> = {};
    (validEvents ?? []).forEach((fe: any) => {
      if (fe?.event?.id) m[fe.event.id] = fe.event.slug;
    });
    return m;
  }, [validEvents]);

  // Map zone keys to event page slugs for linking zone headers
  const zoneEventSlugs = useMemo(() => {
    const m: Record<string, string> = {};
    (validEvents ?? []).forEach((fe: any) => {
      const slug = fe?.event?.slug;
      if (slug) m[slug] = slug;
    });
    return m;
  }, [validEvents]);

  const hasProgramSlots = festivalProgramSlots.length > 0;

  const programCategories = useMemo(() => {
    const events = (validEvents ?? [])
      .filter((fe: any) => fe.event)
      .map((fe: any) => fe.event!);
    const lineup = allArtistsWithEventSlug ?? [];
    const team = [
      ...(festivalTeam?.hostRoles ?? []),
      ...(festivalTeam?.backstage ?? []),
    ];
    return mapFestivalToProgramCategories({ events, lineup, team });
  }, [validEvents, allArtistsWithEventSlug, festivalTeam]);

  const shortDescription = shell?.description
    ? shell.description.split(" ").slice(0, 15).join(" ") +
      (shell.description.split(" ").length > 15 ? "..." : "")
    : null;

  const [lineupOpen, setLineupOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Listen for "Se lineup" button from SmartBottomCta
  useEffect(() => {
    const handler = () => {
      setLineupOpen(true);
      setExpanded(true);
    };
    window.addEventListener("giggen:open-lineup", handler);
    return () => window.removeEventListener("giggen:open-lineup", handler);
  }, []);

  // ─── Loading / error states ──────────────────────────────────
  if (shellLoading) {
    return (
      <PageLayout>
        <LoadingState message="Laster festival..." />
      </PageLayout>
    );
  }

  if (shellError || !shell) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="Festival ikke funnet"
          description="Festivalen du leter etter finnes ikke eller er ikke publisert ennå."
        />
      </PageLayout>
    );
  }

  // ─── Slot-based render ────────────────────────────────────────
  const sections = shell.sections || [];

  return (
    <PageLayout>
      <StaticLogo heroMode />

      {SLOT_ORDER.map(({ slot, sectionType }) => {
        const section = getSectionByType(sections, sectionType);

        // ── HERO ──
        if (slot === "hero") {
          if (section && section.type === "hero") {
            const heroFitMode = (
              section.image_fit_mode === "contain" ? "contain" : "cover"
            ) as "cover" | "contain";
            const sectionImageSettings = parseImageSettings(
              section.bg_image_settings
            );
            const showDateRange =
              section.id === shell.date_range_section_id ? dateRange : null;
            const showDescription =
              section.id === shell.description_section_id
                ? shortDescription
                : null;
            const showName =
              section.id === shell.name_section_id ? shell.name : null;

            return (
              <HeroSection
                key={slot}
                imageUrl={
                  (section.bg_image_url_desktop as string) ||
                  (section.bg_image_url as string) ||
                  heroImage
                }
                imageUrlMobile={
                  (section.bg_image_url_mobile as string) ||
                  (section.bg_image_url as string) ||
                  heroImage
                }
                imageSettings={sectionImageSettings}
                fullScreen
                backgroundFixed={section.bg_mode === "fixed"}
                imageFitMode={heroFitMode}
                useNaturalAspect
              >
                <div>
                  {showDateRange && (
                    <div className="animate-slide-up text-mono text-[10px] md:text-xs uppercase tracking-[0.2em] text-accent/70 mb-4">
                      {showDateRange}
                    </div>
                  )}
                  {showName && (
                    <h1 className="animate-slide-up delay-100 text-display text-hero text-balance">
                      {showName} {city} {year}
                    </h1>
                  )}
                  {showDescription && (
                    <p className="animate-slide-up delay-200 text-foreground/50 text-base md:text-lg max-w-sm leading-relaxed mt-4">
                      {showDescription}
                    </p>
                  )}
                </div>
              </HeroSection>
            );
          }

          // Fallback hero
          return (
            <HeroSection
              key={slot}
              imageUrl={heroImage}
              imageSettings={parseImageSettings(shell?.theme?.hero_image_settings)}
              fullScreen
              backgroundFixed
            >
              <div className="animate-slide-up pb-8">
                {dateRange && (
                  <div className="text-mono text-accent mb-3">{dateRange}</div>
                )}
                <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">
                  {shell.name} {city} {year}
                </h1>
                {shortDescription && (
                  <p className="text-foreground/70 text-lg md:text-xl max-w-lg leading-relaxed">
                    {shortDescription}
                  </p>
                )}
              </div>
            </HeroSection>
          );
        }

        // ── FACTS BAR ──
        if (slot === "facts_bar") {
          const venueSlug = venue?.slug;
          const factsParts: React.ReactNode[] = [
            shell?.start_at
              ? format(new Date(shell.start_at), "d. MMMM yyyy", { locale: nb })
              : null,
            "17:00–01:00",
            venueSlug ? (
              <Link
                key="venue"
                to={`/venue/${venueSlug}`}
                className="underline decoration-foreground/30 hover:decoration-accent hover:text-accent transition-colors"
              >
                {venueName}
              </Link>
            ) : (
              venueName
            ),
            "18 år",
            TICKET_SALES_ENABLED ? "Billetter fra 229 kr" : null,
          ].filter(Boolean);
          return (
            <div key={slot} className="w-screen relative left-1/2 -translate-x-1/2 bg-background py-4 px-4 text-center border-b border-foreground/5">
              <p className="hidden md:flex items-center justify-center gap-0 text-base font-bold text-foreground/80 tracking-wide">
                {factsParts.reduce<React.ReactNode[]>((acc, part, i) => {
                  if (i > 0) acc.push(<span key={`dot-${i}`} className="mx-2">·</span>);
                  acc.push(<span key={`part-${i}`}>{part}</span>);
                  return acc;
                }, [])}
              </p>
              <div className="flex flex-col gap-0.5 md:hidden">
                {[
                  shell?.start_at ? format(new Date(shell.start_at), "d. MMMM yyyy", { locale: nb }) : null,
                  "17:00–01:00",
                  venueName,
                  "18 år",
                  TICKET_SALES_ENABLED ? "Billetter fra 229 kr" : null,
                ].filter(Boolean).map((item, i) => (
                  <span key={i} className="text-xs font-bold text-foreground/80 tracking-wide">
                    {String(item)}
                  </span>
                ))}
              </div>
            </div>
          );
        }

        // ── POSTER BODY (intro + lineup CTA in one centered column) ──
        if (slot === "poster_body") {
          const hasArtists = (allArtistsWithEventSlug?.length ?? 0) > 0;
          const artistCount = allArtistsWithEventSlug?.length ?? 0;
          const eventCount = validEvents?.length ?? 0;
          const previewNames = (allArtistsWithEventSlug ?? []).slice(0, 5).map(a => a.name);
          const h2 = `Festival i ${city} ${year} på ${venueName}`;
          const seoIntro = "GIGGEN Festival 2026 er en festival i Oslo på legendariske Josefines Vertshus. En kveld med live musikk, konserter og kunst midt i Oslo sentrum.";
          
          const venueSlug = venue?.slug;
          const vibesNodes: React.ReactNode[] = [
            <>Vi sparker i gang våren på legendariske{" "}
              {venueSlug ? (
                <Link to={`/venue/${venueSlug}`} className="underline hover:text-accent transition-colors font-medium">
                  {venueName}
                </Link>
              ) : (
                venueName
              )}
              {" "}med live musikk, BOILER ROOM, kunst, mat og drikke 🚀
            </>,
            <>Ta med deg vennene dine og bli med på en helaften der fremadstormende musikere, DJs og kunstnere fra hele Sør-Norge får fritt spillerom og fyller huset med energi.{" "}
              <Link to="/utforsk" className="underline hover:text-accent transition-colors font-medium">
                Oppdag artister på GIGGEN
              </Link>
              {" "}→
            </>,
            "Det blir dans. Det blir stemning. Det blir en fullspekket festivalkveld du ikke vil gå glipp av. Velkommen 🪩",
          ];

          return (
            <section key={slot} className="relative bg-background py-10 md:py-16 px-4 md:px-6" id="lineup">
              <div className="mx-auto w-full max-w-3xl text-center space-y-5 lg:space-y-6">

                {/* ── SEO Intro ── */}
                <div className="space-y-3">
                  <h2 className="text-display text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight leading-tight">
                    {h2}
                  </h2>
                  <p className="mx-auto max-w-xl text-sm md:text-base text-muted-foreground leading-relaxed">
                    Live musikk, konserter og kunst på{" "}
                    {venueSlug ? (
                      <Link to={`/venue/${venueSlug}`} className="underline hover:text-accent transition-colors">
                        {venueName}
                      </Link>
                    ) : (
                      venueName
                    )}
                    {" "}– én kveld, fullt hus.
                  </p>

                  {/* Collapsible vibes */}
                  <div className={cn(
                    "overflow-hidden transition-all duration-400",
                    lineupOpen ? "max-h-0 opacity-0" : "",
                    expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                  )}>
                    <div className="space-y-4 text-left mx-auto max-w-2xl border-l-2 border-accent/40 pl-5 pt-2">
                      {vibesNodes.map((line, i) => (
                        <p key={i} className="text-foreground/90 text-base md:text-lg leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setExpanded(!expanded)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase",
                      "border border-accent/30 text-accent/80 hover:text-accent hover:border-accent/50 transition-colors"
                    )}
                  >
                    {expanded ? "Vis mindre ↑" : "Om festivalen →"}
                  </button>
                </div>

                {/* ── LINEUP Panel (poster-style) ── */}
                <div className="mx-auto w-full max-w-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setLineupOpen((o) => !o);
                      if (!lineupOpen) {
                        requestAnimationFrame(() => {
                          document.getElementById("lineup")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                      }
                    }}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-2xl",
                      "border border-accent/20",
                      "shadow-[0_24px_80px_-20px_hsl(24_100%_50%/0.25)]",
                      "transition-all duration-500 hover:scale-[1.015] hover:shadow-[0_28px_90px_-20px_hsl(24_100%_50%/0.35)]",
                      "px-6 md:px-10 py-8 md:py-10",
                      "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background"
                    )}
                    aria-expanded={lineupOpen}
                    aria-controls="lineup-collapsible"
                  >
                    {/* Background image */}
                    <img
                      src={lineupCtaBgWarm}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      aria-hidden="true"
                    />
                    {/* Subtle dark overlay for text legibility */}
                    <div className="absolute inset-0 bg-black/30" />

                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-2xl md:text-4xl font-black tracking-[0.4em] text-white drop-shadow-lg"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          LINEUP
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-white/60 transition-transform duration-300",
                            lineupOpen && "rotate-180"
                          )}
                          aria-hidden
                        />
                      </div>

                      {/* Thin accent divider */}
                      {hasArtists && !lineupOpen && (
                        <div className="w-12 h-px bg-accent/50" />
                      )}

                      {/* Preview stripe */}
                      {hasArtists && !lineupOpen && (
                        <div
                          className="text-xs md:text-sm text-white/65 font-medium tracking-[0.2em] uppercase"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {previewNames.map(n => n.toUpperCase()).join("  ·  ")}{artistCount > 5 ? `  +${artistCount - 5}` : ""}
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {/* ── Collapsible lineup posters (full width breakout) ── */}
              </div>
              {lineupOpen && (
                <div className="mt-5 w-full">
                  {hasArtists ? (
                    <LineupPostersSection
                      artists={allArtistsWithEventSlug}
                      programSlots={festivalProgramSlots}
                      eventIdToSlug={eventIdToSlug}
                      zoneEventSlugs={zoneEventSlugs}
                    />
                  ) : (
                    <div className="py-16 text-center text-muted-foreground">
                      Lineup kommer snart.
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        }


        // ── VENUE ──
        if (slot === "venue") {
          if (section) {
            return (
              <SectionRenderer
                key={slot}
                section={section as any}
                validEvents={validEvents as any}
                featuredArtists={allArtistsWithEventSlug}
                venue={venue}
                festivalTeam={festivalTeam}
              />
            );
          }
          return null; // No fallback venue section without CMS data
        }

        // ── UTFORSK MER ──
        if (slot === "utforsk") {
          return <UtforskMerSection key={slot} />;
        }

        // ── PRAKTISK ──
        if (slot === "praktisk") {
          return <PraktiskSection key={slot} />;
        }

        // ── FAQ ──
        if (slot === "faq") {
          const rawContent = (section as any)?.content_json;
          const faqFromSection =
            rawContent?.content?.faq ?? rawContent?.faq ?? null;
          return <FaqSlot key={slot} faqItems={faqFromSection} />;
        }

        // ── CTA ──
        if (slot === "cta") {
          return (
            <CtaSlot
              key={slot}
              festivalName={shell.name}
              city={city}
              year={year}
            />
          );
        }

        // ── TEAM ──
        if (slot === "team") {
          if (
            festivalTeam &&
            ((festivalTeam.hostRoles?.length ?? 0) > 0 ||
              (festivalTeam.backstage?.length ?? 0) > 0)
          ) {
            return (
              <section key={slot} className="relative bg-background px-6">
                <Accordion type="single" collapsible className="max-w-3xl mx-auto">
                  <AccordionItem value="team" className="border-foreground/10">
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      <span className="text-display text-base md:text-lg font-bold tracking-tight">
                        Festival-teamet
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-5 pb-4">
                        {[
                          ...(festivalTeam.hostRoles || []),
                          ...(festivalTeam.backstage || []),
                        ]
                          .sort(
                            (a: any, b: any) =>
                              (a.sort_order ?? 0) - (b.sort_order ?? 0)
                          )
                          .map((item: any, i: number) => {
                            const displayRole =
                              item.role_label ||
                              getPersonaTypeLabel(item.persona?.type) ||
                              (item.persona?.category_tags &&
                                item.persona.category_tags[0]) ||
                              item.entity?.type ||
                              null;
                            return (
                              <div
                                key={item.participant_id || i}
                                className="flex flex-col gap-1"
                              >
                                {displayRole && (
                                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                    {displayRole}
                                  </p>
                                )}
                                <EventParticipantItem item={item} />
                              </div>
                            );
                          })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            );
          }
          return null;
        }

        // ── FOOTER ──
        if (slot === "footer") {
          return (
            <div key={slot}>
              <SocialSection />
              {section ? (
                <SectionRenderer
                  section={section as any}
                  validEvents={validEvents as any}
                  featuredArtists={allArtistsWithEventSlug}
                  venue={venue}
                  festivalTeam={festivalTeam}
                />
              ) : (
                <FestivalFooter />
              )}
            </div>
          );
        }

        return null;
      })}

      {/* SEO internal link */}
      <div className="bg-black/80 text-center py-6">
        <Link
          to="/festival-oslo-2026"
          className="text-xs text-white/25 hover:text-white/50 transition-colors"
        >
          Les mer: Festival i Oslo 2026
        </Link>
      </div>

      <div className="fixed bottom-4 right-4 z-40">
        <Link
          to="/admin"
          className="text-muted-foreground/20 hover:text-muted-foreground/40 transition-colors"
          title="Admin"
        >
          <Settings className="w-3 h-3" />
        </Link>
      </div>
    </PageLayout>
  );
}
