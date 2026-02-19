import { useEffect } from "react";
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
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { UnifiedTimeline } from "@/components/ui/UnifiedTimeline";
import { EntitySocialLinks } from "@/components/ui/EntitySocialLinks";
import { WhatIsGiggenFooter } from "@/components/ui/WhatIsGiggenFooter";
import { ShareImageSection } from "@/components/share/ShareImageSection";
import { shareModelFromProject } from "@/lib/share-model";
import { CroppedImage } from "@/components/ui/CroppedImage";
import { UpcomingGigsSection } from "@/components/ui/UpcomingGigsSection";
import { useUpcomingGigsForEntity } from "@/hooks/useUpcomingGigs";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading, error } = useEntity(slug || "");
  const { data: upcomingGigs } = useUpcomingGigsForEntity(entity?.id);
  const nextGig = upcomingGigs?.[0] ?? null;
  const timelineSource = entity?.id ? { type: "entity" as const, id: entity.id } : undefined;
  const { data: timelineEvents } = useUnifiedTimelineEvents(timelineSource, { visibility: "public" });
  const heroImageUrl = useSignedMediaUrl((entity as any)?.hero_image_url, 'public');
  const logoUrl = useSignedMediaUrl((entity as any)?.logo_url, 'public');

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

  const heroImageSettings = parseImageSettings(entity.hero_image_settings);
  const entitySocialLinks = ((entity as any).social_links || []) as SocialLink[] | undefined;
  const locationName = (entity as any).location_name as string | null;
  const locationType = (entity as any).location_type as LocationType | null;
  const locationDisplay = formatEntityLocationDisplay(locationName, locationType);
  const hasTimeline = timelineEvents && timelineEvents.length > 0;

  return (
    <PageLayout>
      <StaticLogo />

      {/* COVER BANNER – taller than venue, cinematic feel */}
      <div className="relative w-full md:h-[580px] bg-background md:bg-black overflow-hidden">
        {heroImageUrl ? (
          <>
            {/* Mobile: cropped cover */}
            <div className="block md:hidden h-[300px]">
              <CroppedImage
                src={heroImageUrl}
                alt={entity.name}
                imageSettings={heroImageSettings ?? { focal_x: 0.5, focal_y: 0.4, zoom: 1 }}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Desktop: contain with blurred bg fill */}
            <div className="hidden md:block relative h-full">
              {/* Blurred background fill */}
              <img
                src={heroImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110"
                style={{ filter: "blur(44px)", opacity: 0.18 }}
              />
              <div className="absolute inset-0 bg-black/20" />
              {/* Sharp foreground – contained */}
              <div className="relative flex items-center justify-center h-full z-[1]">
                <img
                  src={heroImageUrl}
                  alt={entity.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-[300px] md:h-full bg-gradient-to-br from-card to-muted" />
        )}
        {/* Bottom fade – only on desktop */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none hidden md:block" />
      </div>

      {/* NAME + TAGLINE */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-6 relative z-10">
        <div className="flex items-end gap-5">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`${entity.name} logo`}
              className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover ring-2 ring-background shadow-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-3xl md:text-5xl uppercase tracking-tight leading-[0.95]">
              {entity.name}
            </h1>
            {entity.tagline && (
              <p className="text-sm md:text-base text-muted-foreground/60 mt-1.5 truncate">
                {entity.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Location + socials bar */}
        {(locationDisplay || (entitySocialLinks && entitySocialLinks.length > 0)) && (
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {locationDisplay && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground/50">
                <MapPin className="w-3.5 h-3.5" />
                <span>{locationDisplay}</span>
              </div>
            )}
            <EntitySocialLinks links={entitySocialLinks} />
          </div>
        )}

        <div className="border-b border-border/20 mt-6 mb-0" />
      </div>

      {/* MAIN CONTENT – two-column on desktop */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">

          {/* LEFT – Primary content */}
          <div className="space-y-8">
            {/* Beskrivelse */}
            {entity.description && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
                  Om {entity.name}
                </h2>
                <p className="text-base md:text-lg font-light leading-relaxed text-foreground/85 whitespace-pre-line">
                  {entity.description}
                </p>
              </div>
            )}

            {/* Spiller snart */}
            <UpcomingGigsSection entityId={entity.id} />

            {/* Team / Bak prosjektet */}
            {publicTeamMembers.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
                  {getPersonasSectionTitle(entity.type)}
                </h2>
                <div className="space-y-3">
                  {publicTeamMembers.map((member: any, i: number) => (
                    <TeamCreditInline
                      key={(member.persona?.slug || member.entity?.slug || '') + i}
                      member={{
                        persona: member.persona,
                        entity: member.entity,
                        role_label: null,
                        bindingRoleLabel: member.bindingRoleLabel,
                        role_labels: member.role_labels,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Historikk / Tidslinje */}
            {hasTimeline && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
                  Historien
                </h2>
                <UnifiedTimeline source={{ type: "entity", id: entity.id }} />
              </div>
            )}
          </div>

          {/* RIGHT – Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">

            {/* Del */}
            <ShareImageSection
              slug={entity.slug}
              shareModel={shareModelFromProject({
                slug: entity.slug,
                title: entity.name,
                tagline: entity.tagline ?? null,
                heroImageUrl: heroImageUrl ?? null,
                logoUrl: logoUrl ?? null,
                venueName: nextGig?.venueName ?? null,
                startAt: nextGig?.startsAt ?? null,
              })}
              compact
            />
          </aside>
        </div>
      </div>

      <WhatIsGiggenFooter />
    </PageLayout>
  );
}

/* ── Inline team credit (reuses same data shape) ─────────────────── */

import { useSignedMediaUrl as useSignedUrl } from "@/hooks/useSignedMediaUrl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { getEntityPublicRoute } from "@/lib/entity-types";

function TeamCreditInline({ member }: { member: any }) {
  const { data: entityTypes } = useEntityTypes();
  const rawImageUrl = member.persona?.avatar_url ?? member.entity?.hero_image_url ?? null;
  const imageUrl = useSignedUrl(rawImageUrl, "public");
  const name = member.persona?.name ?? member.entity?.name ?? "";

  const role =
    member.role_label ||
    member.bindingRoleLabel ||
    (member.role_labels?.length ? member.role_labels.join(", ") : null) ||
    getPersonaTypeLabel(member.persona?.type) ||
    (member.persona?.category_tags?.[0] ?? null);

  const personaSlug = member.persona?.slug;
  const entitySlug = member.entity?.slug;
  const entityType = member.entity?.type;

  const nameEl = personaSlug ? (
    <Link to={`/p/${personaSlug}`} className="text-sm font-medium text-foreground hover:underline">
      {name}
    </Link>
  ) : entitySlug && entityType ? (
    <Link to={getEntityPublicRoute(entityType, entitySlug, entityTypes)} className="text-sm font-medium text-foreground hover:underline">
      {name}
    </Link>
  ) : (
    <p className="text-sm font-medium text-foreground">{name}</p>
  );

  return (
    <div className="flex items-center gap-3 py-1.5">
      <Avatar className="h-9 w-9 border border-border/20">
        {imageUrl ? <AvatarImage src={imageUrl} alt={name} className="object-cover" /> : null}
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div>
        {nameEl}
        {role && <p className="text-xs text-muted-foreground/50">{role}</p>}
      </div>
    </div>
  );
}
