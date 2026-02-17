import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, Clock, MapPin, Music } from "lucide-react";
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
import { EventZoneTabs } from "@/components/festival/EventZoneTabs";
import { USE_ZONE_TABS_ON_EVENT } from "@/lib/ui-features";

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = useEvent(slug || "");
  
  // Signed URL for public viewing
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

  // Parse hero image settings for focal point positioning
  const heroImageSettings = parseImageSettings(event.hero_image_settings);

  // Format time range
  const timeRange = endDate 
    ? `${format(startDate, "HH:mm")} – ${format(endDate, "HH:mm")}`
    : format(startDate, "HH:mm");

  return (
    <PageLayout>
      {/* Static logo in header */}
      <StaticLogo />

      {/* HERO – same layout as ProjectPage */}
      <div className="relative w-full md:h-[580px] bg-background md:bg-black overflow-hidden">
        {heroImageUrl ? (
          <>
            {/* Mobile: cropped cover */}
            <div className="block md:hidden h-[300px]">
              <CroppedImage
                src={heroImageUrl}
                alt={event.title}
                imageSettings={heroImageSettings}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Desktop: contain with blurred bg fill */}
            <div className="hidden md:block relative h-full">
              <img
                src={heroImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110"
                style={{ filter: "blur(44px)", opacity: 0.18 }}
              />
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative flex items-center justify-center h-full z-[1]">
                <img
                  src={heroImageUrl}
                  alt={event.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-[300px] md:h-full bg-gradient-to-br from-card to-muted" />
        )}
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none hidden md:block" />
      </div>

      {/* Title + date below hero */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-6 relative z-10">
        <div className="text-mono text-accent/70 mb-2 text-xs uppercase tracking-[0.3em]">
          {format(startDate, "EEEE", { locale: nb })}
        </div>
        <h1 className="font-black text-3xl md:text-5xl lg:text-6xl uppercase tracking-tight leading-[0.9]">
          {event.title}
        </h1>
        <div className="border-b border-border/20 mt-6 mb-0" />
      </div>

      {/* 2. KVELDENS RAMMER – Orientering, trygghet */}
      <section className="py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-8">
            Kvelden
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-lg md:text-xl">
              <Calendar className="w-5 h-5 text-accent/60 flex-shrink-0" />
              <span className="font-light">
                {format(startDate, "EEEE d. MMMM", { locale: nb })}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-lg md:text-xl">
              <Clock className="w-5 h-5 text-accent/60 flex-shrink-0" />
              <span className="font-light">{timeRange}</span>
            </div>
            
            {event.venue && (
              <Link
                to={`/venue/${event.venue.slug}`}
                className="flex items-center gap-4 text-lg md:text-xl group"
              >
                <MapPin className="w-5 h-5 text-accent/60 flex-shrink-0" />
                <span className="font-light group-hover:text-accent transition-colors">
                  {event.venue.name}
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 3. HVA SLAGS KVELD ER DETTE – Stemningsforankring */}
      {event.description && (
        <section className="py-16 md:py-24 border-t border-border/20">
          <div className="max-w-2xl mx-auto px-6">
            <p className="text-xl md:text-2xl font-light leading-relaxed text-foreground/90">
              {event.description}
            </p>
          </div>
        </section>
      )}


      {/* 5. LINEUP / ZONE TABS */}
      {USE_ZONE_TABS_ON_EVENT ? (
        <EventZoneTabs
          lineup={event.lineup || []}
          backstage={(event as any).backstage || []}
          hostRoles={(event as any).hostRoles || []}
        />
      ) : (
        <>
          {/* Legacy: separate sections */}
          {event.lineup && event.lineup.length > 0 && (
            <section className="py-20 md:py-32 border-t border-border/20">
              <div className="max-w-3xl mx-auto px-6">
                <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-12 md:mb-16">
                  På scenen
                </h2>
                <div className="space-y-8 md:space-y-12">
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
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* 6. PRAKTISK – fra event (aldersgrense, garderobe) + adresse fra venue */}
          {(() => {
            const ageLimit = (event as any).age_limit?.trim();
            const cloakroom = (event as any).cloakroom_available === true;
            const address = event.venue?.address || event.venue?.name;
            if (!ageLimit && !cloakroom && !address) return null;
            return (
              <section className="py-16 md:py-24 border-t border-border/20">
                <div className="max-w-2xl mx-auto px-6">
                  <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-8">
                    Praktisk
                  </h2>
                  <div className="space-y-3 text-foreground/70">
                    {ageLimit && <p className="font-light">Aldersgrense: {ageLimit}</p>}
                    {cloakroom && <p className="font-light">Garderobe tilgjengelig</p>}
                    {address && <p className="font-light">{address}</p>}
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Festival-team: backstage + arrangør samlet, flat liste */}
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
            return <TeamCreditsSection title="Festival-team" members={allMembers} />;
          })()}
        </>
      )}

      {/* 7. STILLE AVSLUTNING – La kvelden henge */}
      <section className="py-24 md:py-40">
        <div className="flex justify-center">
          <Music className="w-8 h-8 text-accent/20" />
        </div>
      </section>
    </PageLayout>
  );
}
