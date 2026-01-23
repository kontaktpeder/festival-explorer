import { useParams, Link } from "react-router-dom";
import { Music } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { parseImageSettings } from "@/types/database";

import { usePublicEntityTimelineEvents } from "@/hooks/useEntityTimeline";

type EntityType = Database["public"]["Enums"]["entity_type"];

function getPersonasSectionTitle(entityType: EntityType): string {
  switch (entityType) {
    case 'solo':
      return 'Med på scenen';
    case 'band':
      return 'Bak prosjektet';
    case 'venue':
      return 'Team';
    default:
      return 'Bak prosjektet';
  }
}
import { useEntity } from "@/hooks/useEntity";
import { useEntityPersonaBindings } from "@/hooks/usePersonaBindings";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { EntityTimeline } from "@/components/ui/EntityTimeline";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading, error } = useEntity(slug || "");
  const { data: personaBindings } = useEntityPersonaBindings(entity?.id);
  const { data: timelineEvents } = usePublicEntityTimelineEvents(entity?.id);
  
  // Signed URL for public viewing
  const heroImageUrl = useSignedMediaUrl(entity?.hero_image_url, 'public');

  // Filter to only show public bindings with public personas
  const publicBindings = (personaBindings || []).filter(
    (binding) => binding.is_public && binding.persona?.is_public
  );

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Laster..." />
      </PageLayout>
    );
  }

  if (error || !entity) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Music className="w-12 h-12" />}
          title="Ikke funnet"
          description="Det du leter etter finnes ikke eller er ikke publisert ennå."
        />
      </PageLayout>
    );
  }

  // Parse hero image settings for focal point positioning
  const heroImageSettings = parseImageSettings(entity.hero_image_settings);

  return (
    <PageLayout>
      {/* Static logo in header */}
      <StaticLogo />

      {/* HERO – Full screen identity */}
      <HeroSection 
        imageUrl={heroImageUrl || undefined} 
        imageSettings={heroImageSettings}
        fullScreen
        scrollExpand
        useNaturalAspect
      >
        <div className="space-y-3">
          {entity.tagline && (
            <div className="text-mono text-accent/70 text-xs uppercase tracking-[0.2em]">
              {entity.tagline}
            </div>
          )}
          <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl uppercase tracking-tight leading-[0.9]">
            {entity.name}
          </h1>
        </div>
      </HeroSection>

      {/* OM PROSJEKTET – The voice */}
      {entity.description && (
        <section className="py-20 md:py-32 px-6 md:px-12">
          <div className="max-w-2xl">
            <p className="text-lg md:text-xl text-foreground/85 leading-relaxed whitespace-pre-line font-light">
              {entity.description}
            </p>
          </div>
        </section>
      )}

      {/* MED PÅ SCENEN – The people */}
      {publicBindings.length > 0 && (
        <section className="py-16 md:py-28 px-6 md:px-12 border-t border-border/20">
          <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground/60 mb-12 md:mb-16">
            {getPersonasSectionTitle(entity.type)}
          </h2>

          <div className="space-y-10 md:space-y-14">
            {publicBindings.map((binding) => {
              const persona = binding.persona;
              if (!persona) return null;

              return (
                <Link 
                  key={binding.id} 
                  to={`/p/${persona.slug}`}
                  className="group flex items-center gap-6 md:gap-8"
                >
                  {/* Large avatar */}
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden bg-secondary/50 flex-shrink-0 ring-1 ring-border/10">
                    {persona.avatar_url ? (
                      <img
                        src={persona.avatar_url}
                        alt={persona.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/30">
                        <span className="text-2xl md:text-3xl font-display font-bold text-muted-foreground/30">
                          {persona.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Name and role */}
                  <div className="space-y-1">
                    <div className="text-xl md:text-2xl font-medium text-foreground group-hover:text-primary transition-colors">
                      {persona.name}
                    </div>
                    {binding.role_label && (
                      <div className="text-sm md:text-base text-muted-foreground/70 font-light">
                        {binding.role_label}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* HISTORIEN – The journey - only show if events exist */}
      {timelineEvents && timelineEvents.length > 0 && (
        <section className="py-16 md:py-28 px-6 md:px-12 border-t border-border/20">
          <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground/60 mb-12 md:mb-20">
            Historien
          </h2>
          <EntityTimeline entityId={entity.id} viewerRole="fan" />
        </section>
      )}
    </PageLayout>
  );
}
