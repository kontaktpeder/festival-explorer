import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { PageLayout } from "@/components/layout/PageLayout";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { useFestivalShell, useFestivalDetails } from "@/hooks/useFestival";
import { useFestivalPageSeo } from "@/hooks/useFestivalPageSeo";
import type { FestivalSeoParams } from "@/lib/festival-seo";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { HeroSection } from "@/components/ui/HeroSection";
import { ProgramView } from "@/components/program/ProgramView";
import { mapFestivalToProgramCategories } from "@/lib/program-mappers";
import { SectionRenderer } from "@/components/festival/SectionRenderer";
import { LineupPostersSection } from "@/components/festival/LineupPostersSection";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { EventParticipantItem } from "@/components/ui/EventParticipantItem";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { TICKET_SALES_ENABLED } from "@/lib/ticket-config";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// ─── Slot system ────────────────────────────────────────────────
const SLOT_ORDER = [
  { slot: "hero", sectionType: "hero" },
  { slot: "facts_bar", sectionType: null },
  { slot: "poster_body", sectionType: "poster_body" },
  { slot: "praktisk", sectionType: "praktisk" },
  { slot: "cta", sectionType: "cta" },
  { slot: "venue", sectionType: "venue-plakat" },
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

// ─── Practical info (data-driven) ───────────────────────────────
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
    /* fallthrough */
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

// ─── Slot components ────────────────────────────────────────────

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
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {label}
              </span>
              <p className="text-foreground/70 text-base">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSlot({
  faqItems,
}: {
  faqItems?: Array<{ q: string; a: string }> | null;
}) {
  if (!faqItems || faqItems.length === 0) return null;
  return (
    <section className="relative bg-background py-16 md:py-24 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-display text-xl md:text-2xl font-bold tracking-tight">
          Ofte stilte spørsmål
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map(({ q, a }, i) => (
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

function CtaSlot({
  festivalName,
  city,
  year,
  slug,
}: {
  festivalName: string;
  city: string;
  year: string;
  slug: string;
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
            to={`/festival/${slug}/program`}
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

export default function FestivalTemplatePage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="Festival ikke valgt"
          description="Denne siden krever en festival-slug."
        />
      </PageLayout>
    );
  }

  return <FestivalTemplateInner slug={slug} />;
}

function FestivalTemplateInner({ slug }: { slug: string }) {
  const {
    data: shell,
    isLoading: shellLoading,
    error: shellError,
  } = useFestivalShell(slug);
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

  const themeHeroUrl = useSignedMediaUrl(
    shell?.theme?.hero_image_url,
    "public"
  );

  // ─── Derived data ───────────────────────────────────────────
  const city =
    (venue?.city as string) ?? (shell as any)?.city ?? "—";
  const year = shell?.start_at
    ? String(new Date(shell.start_at).getFullYear())
    : shell?.end_at
      ? String(new Date(shell.end_at).getFullYear())
      : String(new Date().getFullYear());
  const venueName = venue?.name ?? (shell as any)?.venue_name ?? "—";
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
        slug,
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
    (fe: any) => fe.event && fe.event.status === "published"
  );
  const allArtistsWithEventSlug = details?.allArtistsWithEventSlug || [];
  const festivalTeam = details?.festivalTeam;
  const festivalProgramSlots = details?.festivalProgramSlots || [];
  const festivalOnlySlots = details?.festivalOnlySlots || [];

  const eventIdToSlug = useMemo(() => {
    const m: Record<string, string> = {};
    (validEvents ?? []).forEach((fe: any) => {
      if (fe?.event?.id) m[fe.event.id] = fe.event.slug;
    });
    return m;
  }, [validEvents]);

  const zoneEventSlugs = useMemo(() => {
    const m: Record<string, string> = {};
    (validEvents ?? []).forEach((fe: any) => {
      const s = fe?.event?.slug;
      if (s) m[s] = s;
    });
    return m;
  }, [validEvents]);

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
  const hasArtists = (allArtistsWithEventSlug?.length ?? 0) > 0;

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
                      {showName} {city !== "—" ? city : ""} {year}
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
              imageSettings={parseImageSettings(
                shell?.theme?.hero_image_settings
              )}
              fullScreen
              backgroundFixed
            >
              <div className="animate-slide-up pb-8">
                {dateRange && (
                  <div className="text-mono text-accent mb-3">{dateRange}</div>
                )}
                <h1 className="text-display text-5xl md:text-7xl mb-4 leading-none">
                  {shell.name} {city !== "—" ? city : ""} {year}
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

        // ── FACTS BAR (data-driven) ──
        if (slot === "facts_bar") {
          const venueSlug = venue?.slug;
          const factsParts: React.ReactNode[] = [
            shell?.start_at
              ? format(new Date(shell.start_at), "d. MMMM yyyy", {
                  locale: nb,
                })
              : null,
            venueSlug ? (
              <Link
                key="venue"
                to={`/venue/${venueSlug}`}
                className="underline decoration-foreground/30 hover:decoration-accent hover:text-accent transition-colors"
              >
                {venueName}
              </Link>
            ) : venueName !== "—" ? (
              venueName
            ) : null,
          ].filter(Boolean);

          if (factsParts.length === 0) return null;

          return (
            <div
              key={slot}
              className="w-screen relative left-1/2 -translate-x-1/2 bg-background py-4 px-4 text-center border-b border-foreground/5"
            >
              <p className="flex items-center justify-center gap-0 text-base font-bold text-foreground/80 tracking-wide">
                {factsParts.reduce<React.ReactNode[]>((acc, part, i) => {
                  if (i > 0)
                    acc.push(
                      <span key={`dot-${i}`} className="mx-2">
                        ·
                      </span>
                    );
                  acc.push(<span key={`part-${i}`}>{part}</span>);
                  return acc;
                }, [])}
              </p>
            </div>
          );
        }

        // ── POSTER BODY (lineup — data only, no hardcoded copy) ──
        if (slot === "poster_body") {
          return (
            <section
              key={slot}
              className="relative bg-background py-10 md:py-16 px-4 md:px-6"
              id="lineup"
            >
              <div className="mx-auto w-full max-w-3xl text-center space-y-5 lg:space-y-6">
                {/* Festival description from CMS */}
                {shell.description && (
                  <div className="space-y-3">
                    <h2 className="text-display text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight leading-tight">
                      {shell.name} {city !== "—" ? city : ""} {year}
                    </h2>
                    <p className="mx-auto max-w-xl text-sm md:text-base text-muted-foreground leading-relaxed">
                      {shell.description}
                    </p>
                  </div>
                )}

                {/* LINEUP toggle */}
                {hasArtists && (
                  <div className="mx-auto w-full max-w-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setLineupOpen((o) => !o);
                        if (!lineupOpen) {
                          requestAnimationFrame(() => {
                            document
                              .getElementById("lineup")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                          });
                        }
                      }}
                      className={cn(
                        "group relative w-full overflow-hidden rounded-2xl",
                        "border border-accent/20 bg-card/60",
                        "shadow-lg hover:shadow-xl",
                        "transition-all duration-500 hover:scale-[1.015]",
                        "px-6 md:px-10 py-8 md:py-10",
                        "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background"
                      )}
                      aria-expanded={lineupOpen}
                      aria-controls="lineup-collapsible"
                    >
                      <div className="relative z-10 flex items-center justify-center gap-3">
                        <span
                          className="text-2xl md:text-4xl font-black tracking-[0.4em] text-foreground"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          LINEUP
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-foreground/60 transition-transform duration-300",
                            lineupOpen && "rotate-180"
                          )}
                          aria-hidden
                        />
                      </div>

                      {!lineupOpen && (
                        <>
                          <div className="w-12 h-px bg-accent/50 mx-auto mt-3" />
                          <div
                            className="mt-3 text-xs md:text-sm text-foreground/50 font-medium tracking-[0.2em] uppercase"
                            style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                            }}
                          >
                            {(allArtistsWithEventSlug ?? [])
                              .slice(0, 5)
                              .map((a) => a.name.toUpperCase())
                              .join("  ·  ")}
                            {(allArtistsWithEventSlug?.length ?? 0) > 5
                              ? `  +${(allArtistsWithEventSlug?.length ?? 0) - 5}`
                              : ""}
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible lineup posters */}
              {lineupOpen && hasArtists && (
                <div className="mt-5 w-full">
                  <LineupPostersSection
                    artists={allArtistsWithEventSlug}
                    programSlots={festivalProgramSlots}
                    festivalSlots={festivalOnlySlots}
                    eventIdToSlug={eventIdToSlug}
                    zoneEventSlugs={zoneEventSlugs}
                  />
                </div>
              )}

              {!hasArtists && (
                <div className="py-16 text-center text-muted-foreground">
                  Lineup kommer snart.
                </div>
              )}
            </section>
          );
        }

        // ── PRAKTISK (data-driven) ──
        if (slot === "praktisk") {
          return (
            <PracticalInfoSlot
              key={slot}
              festival={shell as any}
              venue={venue as any}
            />
          );
        }

        // ── FAQ (CMS only) ──
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
              slug={slug}
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
          return null;
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
                <Accordion
                  type="single"
                  collapsible
                  className="max-w-3xl mx-auto"
                >
                  <AccordionItem
                    value="team"
                    className="border-foreground/10"
                  >
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
    </PageLayout>
  );
}
