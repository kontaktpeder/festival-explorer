import { useParams, Link } from "react-router-dom";
import { MapPin, Music } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { parseImageSettings } from "@/types/database";
import type { SocialLink } from "@/types/social";
import { formatEntityLocationDisplay, type LocationType } from "@/types/location";

import { useUnifiedTimelineEvents } from "@/hooks/useUnifiedTimeline";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { TeamCreditsSection } from "@/components/ui/TeamCreditsSection";

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
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { UnifiedTimeline } from "@/components/ui/UnifiedTimeline";
import { EntitySocialLinks } from "@/components/ui/EntitySocialLinks";
import { WhatIsGiggenFooter } from "@/components/ui/WhatIsGiggenFooter";
import { ShareImageSection } from "@/components/share/ShareImageSection";
import { shareModelFromProject } from "@/lib/share-model";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading, error } = useEntity(slug || "");
  const timelineSource = entity?.id ? { type: "entity" as const, id: entity.id } : undefined;
  const { data: timelineEvents } = useUnifiedTimelineEvents(timelineSource, { visibility: "public" });
  
  // Signed URL for public viewing
  const heroImageUrl = useSignedMediaUrl(entity?.hero_image_url, 'public');
  const logoUrl = useSignedMediaUrl((entity as any)?.logo_url, 'public');

  // Vises alle som er kreditert (entity_team.is_public); useEntity henter allerede kun disse
  const publicTeamMembers = entity?.team ?? [];

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

  // Get social links from entity (future-proofed - field may not exist yet)
  const entitySocialLinks = ((entity as any).social_links || []) as SocialLink[] | undefined;

  // Get location data
  const locationName = (entity as any).location_name as string | null;
  const locationType = (entity as any).location_type as LocationType | null;
  const locationDisplay = formatEntityLocationDisplay(locationName, locationType);

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
      {(entity.description || locationDisplay || (entitySocialLinks && entitySocialLinks.length > 0)) && (
        <section className="py-20 md:py-32 px-6 md:px-12">
          <div className="max-w-2xl">
            {/* Logo + Location */}
            <div className="flex items-center gap-4 mb-6">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={`${entity.name} logo`}
                  className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover ring-1 ring-border/10"
                />
              )}
              {locationDisplay && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
                  <MapPin className="w-4 h-4" />
                  <span>{locationDisplay}</span>
                </div>
              )}
            </div>

            {entity.description && (
              <p className="text-lg md:text-xl text-foreground/85 leading-relaxed whitespace-pre-line font-light">
                {entity.description}
              </p>
            )}

            {/* Social links for project/venue */}
            <EntitySocialLinks links={entitySocialLinks} />
          </div>
        </section>
      )}

      {/* MED PÅ SCENEN / BAK PROSJEKTET – The people */}
      {publicTeamMembers.length > 0 && (
        <TeamCreditsSection
          title={getPersonasSectionTitle(entity.type)}
          members={publicTeamMembers.map((member: any) => ({
            persona: member.persona,
            entity: member.entity,
            role_label: null,
            bindingRoleLabel: member.bindingRoleLabel,
            role_labels: member.role_labels,
          }))}
          className="py-16 md:py-28 px-6 md:px-12 border-t border-border/20"
        />
      )}

      {/* Del – bilde med bakgrunn, tittel, tagline, logo */}
      <ShareImageSection
        slug={entity.slug}
        shareModel={shareModelFromProject({
          slug: entity.slug,
          title: entity.name,
          tagline: entity.tagline ?? null,
          heroImageUrl: heroImageUrl ?? null,
          logoUrl: logoUrl ?? null,
        })}
      />

      {/* HISTORIEN – The journey - only show if events exist */}
      {timelineEvents && timelineEvents.length > 0 && (
        <section className="py-16 md:py-28 px-6 md:px-12 border-t border-border/20">
          <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground/60 mb-12 md:mb-20">
            Historien
          </h2>
          <UnifiedTimeline source={{ type: "entity", id: entity.id }} />
        </section>
      )}

      {/* What is GIGGEN footer */}
      <WhatIsGiggenFooter />
    </PageLayout>
  );
}
