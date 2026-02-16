import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, Clock, MapPin, Music } from "lucide-react";
import { useEvent } from "@/hooks/useFestival";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LineupItem } from "@/components/ui/LineupItem";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { EventParticipantItem } from "@/components/ui/EventParticipantItem";
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

      {/* 1. HERO – Følelse og kontekst, ren stemning */}
      <HeroSection 
        imageUrl={heroImageUrl || undefined} 
        imageSettings={heroImageSettings}
        fullScreen
        scrollExpand
        useNaturalAspect
      >
        <div className="text-mono text-accent/70 mb-3 text-xs uppercase tracking-[0.3em]">
          {format(startDate, "EEEE", { locale: nb })}
        </div>
        <h1 className="font-black text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-[0.9]">
          {event.title}
        </h1>
      </HeroSection>

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

          {/* Bak scenen – festival-team + event-spesifikke (dedup: event overstyrer) */}
          {(() => {
            const bs = (event as any).backstage || { festival: [], event: [] };
            const eventKeys = new Set((bs.event || []).map((p: any) => `${p.participant_kind}:${p.participant_id}`));
            const filteredFestival = (bs.festival || []).filter((p: any) => !eventKeys.has(`${p.participant_kind}:${p.participant_id}`));
            if (filteredFestival.length === 0 && (bs.event || []).length === 0) return null;
            return (
              <section className="py-16 md:py-24 border-t border-border/20">
                <div className="max-w-2xl mx-auto px-6">
                  <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-8">
                    Bak scenen
                  </h2>
                  {filteredFestival.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Festival-team</p>
                      {filteredFestival.map((item: any, i: number) => (
                        <EventParticipantItem key={item.participant_id || i} item={item} />
                      ))}
                    </div>
                  )}
                  {(bs.event || []).length > 0 && (
                    <div className="space-y-4">
                      {filteredFestival.length > 0 && (
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Denne kvelden</p>
                      )}
                      {(bs.event as any[]).map((item: any, i: number) => (
                        <EventParticipantItem key={item.participant_id || i} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })()}
        </>
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

          {/* Arrangør – festival-team + event-spesifikke (dedup: event overstyrer) */}
          {(() => {
            const hr = (event as any).hostRoles || { festival: [], event: [] };
            const eventKeys = new Set((hr.event || []).map((p: any) => `${p.participant_kind}:${p.participant_id}`));
            const filteredFestival = (hr.festival || []).filter((p: any) => !eventKeys.has(`${p.participant_kind}:${p.participant_id}`));
            if (filteredFestival.length === 0 && (hr.event || []).length === 0) return null;
            return (
              <section className="py-16 md:py-24 border-t border-border/20">
                <div className="max-w-2xl mx-auto px-6">
                  {filteredFestival.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Festival-team</p>
                      {filteredFestival.map((item: any, i: number) => (
                        <EventParticipantItem key={item.participant_id || i} item={item} />
                      ))}
                    </div>
                  )}
                  {(hr.event || []).length > 0 && (
                    <div className="space-y-4">
                      {filteredFestival.length > 0 && (
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Denne kvelden</p>
                      )}
                      {(hr.event as any[]).map((item: any, i: number) => (
                        <EventParticipantItem key={item.participant_id || i} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

      {/* 7. STILLE AVSLUTNING – La kvelden henge */}
      <section className="py-24 md:py-40">
        <div className="flex justify-center">
          <Music className="w-8 h-8 text-accent/20" />
        </div>
      </section>
    </PageLayout>
  );
}
