import { useMemo, useState } from "react";
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
import lineupCtaBg from "@/assets/lineup-cta-bg.jpg";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { EventParticipantItem } from "@/components/ui/EventParticipantItem";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { TICKET_SALES_ENABLED } from "@/lib/ticket-config";

// ─── Slot system ────────────────────────────────────────────────
const SLOT_ORDER = [
  { slot: "hero", sectionType: "hero" },
  { slot: "seo_intro", sectionType: "seo_intro" },
  { slot: "lineup_cta", sectionType: "lineup_cta" },
  { slot: "program", sectionType: "program" },
  { slot: "lineup", sectionType: "artister" },
  { slot: "venue", sectionType: "venue-plakat" },
  { slot: "praktisk", sectionType: "praktisk" },
  { slot: "faq", sectionType: "faq" },
  { slot: "cta", sectionType: "cta" },
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

function SEOIntroSlot({
  city,
  year,
  venueName,
  seoIntroText,
}: {
  city: string;
  year: string;
  venueName: string;
  seoIntroText?: string | null;
}) {
  const h2 = `Festival i ${city} ${year} på ${venueName}`;
  const templateText = `Velkommen til festivalen – en kveld med live musikk i ${city}. ${venueName} er vertskap for konserter og opplevelser. Her møtes artister og publikum for levende musikk. Sjekk program og billetter for ${year}.`;
  const body =
    seoIntroText && seoIntroText.trim() ? seoIntroText.trim() : templateText;

  const seoIntro = "GIGGEN Festival 2026 er en festival i Oslo på legendariske Josefines Vertshus. En kveld med live musikk, konserter og kunst midt i Oslo sentrum.";

  const vibes = [
    "Vi sparker i gang våren på legendariske Josefines Vertshus med live musikk, BOILER ROOM, kunst, mat og drikke 🚀",
    "Ta med deg vennene dine og bli med på en helaften der fremadstormende musikere, DJs og kunstnere fra hele Sør-Norge får fritt spillerom og fyller huset med energi.",
    "Det blir dans. Det blir stemning. Det blir en fullspekket festivalkveld du ikke vil gå glipp av. Velkommen 🪩",
  ];

  return (
    <section className="relative bg-background py-20 md:py-28 px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h2 className="text-display text-2xl md:text-4xl font-black uppercase tracking-tight leading-tight">
          {h2}
        </h2>

        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          {seoIntro}
        </p>

        <div className="space-y-4 border-l-2 border-accent/40 pl-5">
          {vibes.map((line, i) => (
            <p
              key={i}
              className="text-foreground/90 text-base md:text-lg leading-relaxed"
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

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
    faqItems && faqItems.length >= 6 ? faqItems : DEFAULT_FAQ;
  return (
    <section className="relative bg-background py-16 md:py-24 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-display text-xl md:text-2xl font-bold tracking-tight">
          Ofte stilte spørsmål
        </h2>
        <dl className="space-y-4">
          {items.map(({ q, a }) => (
            <div key={q}>
              <dt>
                <h3 className="font-semibold text-foreground text-base">{q}</h3>
              </dt>
              <dd className="text-foreground/70 text-sm mt-1">{a}</dd>
            </div>
          ))}
        </dl>
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
          <a href="#program" className="btn-ghost text-center">
            Se program
          </a>
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

        // ── SEO INTRO ──
        if (slot === "seo_intro") {
          return (
            <SEOIntroSlot
              key={slot}
              city={city}
              year={year}
              venueName={venueName}
              seoIntroText={(shell as any)?.seo_intro}
            />
          );
        }

        // ── LINEUP CTA (collapsible poster section) ──
        if (slot === "lineup_cta") {
          const hasArtists = (allArtistsWithEventSlug?.length ?? 0) > 0;
          return (
            <div key={slot} id="lineup" className="relative bg-background">
              <div className="max-w-2xl mx-auto px-6 py-10">
                <button
                  onClick={() => {
                    setLineupOpen((o) => !o);
                    if (!lineupOpen) {
                      requestAnimationFrame(() => {
                        document.getElementById("lineup")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }
                  }}
                  className={cn(
                    "group relative w-full flex items-center justify-center gap-3 py-6 px-8",
                    "rounded-2xl overflow-hidden",
                    "text-white font-black text-xl md:text-2xl uppercase tracking-wider",
                    "shadow-xl shadow-black/40 hover:shadow-black/60",
                    "transition-all duration-300 hover:scale-[1.02]",
                    "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                  )}
                  aria-expanded={lineupOpen}
                  aria-controls="lineup-collapsible"
                >
                  {/* Background image */}
                  <img
                    src={lineupCtaBg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                  {/* Overlay for text legibility */}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
                  <Music className="w-5 h-5 relative z-10 drop-shadow-md" />
                  <span className="relative z-10 drop-shadow-md">Se LINEUP</span>
                  <ChevronDown className={cn(
                    "w-5 h-5 relative z-10 drop-shadow-md transition-transform duration-300",
                    lineupOpen && "rotate-180"
                  )} />
                </button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Artister og DJs
                </p>
              </div>

              <div
                id="lineup-collapsible"
                className={cn(
                  "overflow-hidden transition-all duration-500",
                  lineupOpen ? "max-h-[99999px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                {hasArtists ? (
                  <LineupPostersSection artists={allArtistsWithEventSlug} />
                ) : (
                  <div className="py-16 text-center text-muted-foreground">
                    Lineup kommer snart.
                  </div>
                )}
              </div>
            </div>
          );
        }

        // ── PROGRAM ──
        if (slot === "program") {
          if (section) {
            const showDateRange =
              section.id === shell.date_range_section_id ? dateRange : null;
            const showDescription =
              section.id === shell.description_section_id
                ? shortDescription
                : null;
            const showName =
              section.id === shell.name_section_id ? shell.name : null;
            return (
              <SectionRenderer
                key={slot}
                section={section as any}
                validEvents={validEvents as any}
                featuredArtists={allArtistsWithEventSlug}
                venue={venue}
                dateRange={showDateRange}
                festivalDescription={showDescription}
                festivalName={showName}
                festivalTeam={festivalTeam}
              />
            );
          }
          // Fallback program
          return (
            <section
              key={slot}
              className="fullscreen-section relative"
              id="program"
            >
              <div className="relative z-10 max-w-4xl mx-auto w-full">
                <h2 className="section-title mb-2">Program</h2>

                <div className="flex justify-center mb-6">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setLineupOpen(true);
                      requestAnimationFrame(() => {
                        document.getElementById("lineup")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }}
                    className="text-xs uppercase tracking-widest text-accent/60 hover:text-accent transition-colors font-medium"
                  >
                    Se lineup ↓
                  </button>
                </div>

                {programCategories.some((c) => c.items.length > 0) ? (
                  <ProgramView
                    categories={programCategories}
                    title=""
                    showTime={false}
                    accordion
                    showEmptyState={false}
                  />
                ) : (
                  <EmptyState
                    title="Ingen events ennå"
                    description="Programmet for denne festivalen er ikke klart ennå."
                  />
                )}
              </div>
            </section>
          );
        }

        // ── LINEUP ──
        if (slot === "lineup") {
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
          return (
            <DualLineupSection
              key={slot}
              artists={allArtistsWithEventSlug}
              festivalTeam={festivalTeam}
              showPosters={false}
            />
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

        // ── PRAKTISK ──
        if (slot === "praktisk") {
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
          return <PracticalInfoSlot key={slot} festival={shell as Record<string, unknown>} venue={venue ?? undefined} />;
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
              <section key={slot} className="fullscreen-section relative bg-background">
                <div className="relative z-10 max-w-3xl mx-auto px-6 py-20 md:py-28">
                  <h2 className="section-title">
                    Bli kjent med festival-teamet
                  </h2>
                  <p className="text-foreground/70 text-base md:text-lg mb-10 max-w-xl">
                    Folkene bak scenen som får festivalen til å skje.
                  </p>
                  <div className="space-y-6">
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
                </div>
              </section>
            );
          }
          return null;
        }

        // ── FOOTER ──
        if (slot === "footer") {
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
          return <FestivalFooter key={slot} />;
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
