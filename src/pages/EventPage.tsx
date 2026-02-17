import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, Clock, MapPin, Music, ShieldCheck, Shirt } from "lucide-react";
import { useEvent } from "@/hooks/useFestival";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { PageLayout } from "@/components/layout/PageLayout";
import { CroppedImage } from "@/components/ui/CroppedImage";
import { LineupItem } from "@/components/ui/LineupItem";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { EventParticipantItem } from "@/components/ui/EventParticipantItem";
import { TeamCreditsSection } from "@/components/ui/TeamCreditsSection";
import { WhatIsGiggenFooter } from "@/components/ui/WhatIsGiggenFooter";
import { ShareImageSection } from "@/components/share/ShareImageSection";
import { EventProgramSlots } from "@/components/festival/EventProgramSlots";
import { EventZoneTabs } from "@/components/festival/EventZoneTabs";
import { EventHeroCollage } from "@/components/festival/EventHeroCollage";
import { USE_ZONE_TABS_ON_EVENT } from "@/lib/ui-features";
import { shareModelFromEvent } from "@/lib/share-model";
import { getEntityPublicRoute } from "@/lib/entity-types";
import { useEntityTypes } from "@/hooks/useEntityTypes";

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = useEvent(slug || "");
  const { data: entityTypes } = useEntityTypes();
  
  const heroImageUrl = useSignedMediaUrl(event?.hero_image_url, 'public');

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Laster event..." />
      </PageLayout>
    );
  }

  if (error || !event) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="Event ikke funnet"
          description="Eventet du leter etter finnes ikke eller er ikke publisert ennå."
        />
      </PageLayout>
    );
  }

  const startDate = new Date(event.start_at);
  const endDate = event.end_at ? new Date(event.end_at) : null;
  const heroImageSettings = parseImageSettings(event.hero_image_settings);
  const timeRange = endDate 
    ? `${format(startDate, "HH:mm")} – ${format(endDate, "HH:mm")}`
    : format(startDate, "HH:mm");

  return (
    <PageLayout>
      <StaticLogo />

      {/* HERO – Artist collage or fallback */}
      {(() => {
        // Extract collage artists from lineup
        const collageArtists = (event.lineup || []).map((item: any) => {
          if (item.participant_kind === "persona" && item.persona) {
            return {
              name: item.persona.name,
              imageUrl: item.persona.avatar_url || null,
              imageSettings: item.persona.avatar_image_settings || null,
              route: `/p/${item.persona.slug}`,
              isHeadliner: item.is_featured,
            };
          }
          if (item.entity) {
            return {
              name: item.entity.name,
              imageUrl: item.entity.hero_image_url || null,
              imageSettings: item.entity.hero_image_settings || null,
              route: getEntityPublicRoute(item.entity.type, item.entity.slug, entityTypes || []),
              isHeadliner: item.is_featured,
            };
          }
          return null;
        }).filter(Boolean);

        // Put featured/headliner first
        const headlinerIdx = collageArtists.findIndex((a: any) => a.isHeadliner);
        if (headlinerIdx > 0) {
          const [headliner] = collageArtists.splice(headlinerIdx, 1);
          collageArtists.unshift(headliner);
        }

        return (
          <EventHeroCollage
            artists={collageArtists}
            eventTitle={event.title}
            fallbackImageUrl={event.hero_image_url}
            fallbackImageSettings={heroImageSettings}
          />
        );
      })()}

      {/* Title + microcopy */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-6 relative z-10">
        <div className="text-mono text-accent/70 mb-2 text-xs uppercase tracking-[0.3em] text-right">
          {format(startDate, "EEEE", { locale: nb })}
        </div>
        <h1 className="font-black text-3xl md:text-5xl lg:text-6xl uppercase tracking-tight leading-[0.9] text-right">
          {event.title}
        </h1>
        <p className="text-muted-foreground/60 text-sm mt-3 max-w-lg">
          Billetter kjøpes som festivalpass. Festivalpass + BOILER ROOM gir full tilgang til alle etasjer hele kvelden.
        </p>

        {/* Praktisk – compact inline */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-4 text-sm text-foreground/70">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
            {format(startDate, "d. MMM", { locale: nb })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
            {timeRange}
          </span>
          {event.venue && (
            <Link to={`/venue/${event.venue.slug}`} className="flex items-center gap-1.5 hover:text-accent transition-colors">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
              {event.venue.name}
            </Link>
          )}
          {(() => {
            const ageLimit = (event as any).age_limit?.trim();
            if (!ageLimit) return null;
            return (
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
                {ageLimit}
              </span>
            );
          })()}
          {(event as any).cloakroom_available === true && (
            <span className="flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
              Garderobe
            </span>
          )}
        </div>

        <div className="border-b border-border/20 mt-6 mb-0" />
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">

          {/* LEFT – Primary: Lineup FIRST, then description, then team */}
            <div className="space-y-8">

            {/* Beskrivelse – above program */}
            {event.description && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
                  Om
                </h2>
                <p className="text-base md:text-lg font-light leading-relaxed text-foreground/85 whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}

              {/* PROGRAM SLOTS or LINEUP / ZONE TABS */}
              {(event as any).programSlots && (event as any).programSlots.length > 0 ? (
                <>
                  <EventProgramSlots
                    slots={(event as any).programSlots}
                    headlinerEntityIds={
                      (event.lineup || [])
                        .filter((i: any) => i.is_featured)
                        .map((i: any) => i.entity_id || i.participant_id)
                        .filter(Boolean)
                    }
                  />
                </>
              ) : USE_ZONE_TABS_ON_EVENT ? (
                <EventZoneTabs
                  lineup={event.lineup || []}
                  backstage={(event as any).backstage || []}
                  hostRoles={(event as any).hostRoles || []}
                />
              ) : (
                <>
                  {event.lineup && event.lineup.length > 0 && (
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
                        Program
                      </h2>
                      <p className="text-muted-foreground/60 text-sm mb-5">
                        Billetten gjelder alle konserter på denne scenen – og flere opplevelser i festivalen.
                      </p>
                      <div className="space-y-4 md:space-y-5">
                        {event.lineup.map((item: any, index: number) => {
                          const headlinerIndex = event.lineup.some((i: any) => i.is_featured)
                            ? event.lineup.findIndex((i: any) => i.is_featured)
                            : 0;
                          return (
                            <LineupItem
                              key={item.entity_id || item.participant_id || index}
                              item={item}
                              showBilling
                              isFirst={index === 0}
                              isHeadliner={index === headlinerIndex}
                              large
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
          </div>

          {/* RIGHT – Sidebar */}
          <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start">

            {/* Share */}
            <ShareImageSection
              slug={event.slug}
              shareModel={shareModelFromEvent({
                slug: event.slug,
                title: event.title,
                venueName: event.venue?.name ?? null,
                heroImageUrl: heroImageUrl ?? null,
              })}
              compact
            />

            {/* Team */}
            {(() => {
              const bs = (event as any).backstage || { festival: [], event: [] };
              const bsEventKeys = new Set((bs.event || []).map((p: any) => `${p.participant_kind}:${p.participant_id}`));
              const bsFiltered = (bs.festival || []).filter((p: any) => !bsEventKeys.has(`${p.participant_kind}:${p.participant_id}`));
              const bsAll = [...bsFiltered, ...(bs.event || [])];
              const hr = (event as any).hostRoles || { festival: [], event: [] };
              const hrEventKeys = new Set((hr.event || []).map((p: any) => `${p.participant_kind}:${p.participant_id}`));
              const hrFiltered = (hr.festival || []).filter((p: any) => !hrEventKeys.has(`${p.participant_kind}:${p.participant_id}`));
              const hrAll = [...hrFiltered, ...(hr.event || [])];
              const allMembers = [...hrAll, ...bsAll];
              return <TeamCreditsSection title="Team" members={allMembers} />;
            })()}
          </aside>
        </div>
      </div>

      <WhatIsGiggenFooter />
    </PageLayout>
  );
}
