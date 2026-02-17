import { Link } from "react-router-dom";
import type { EventProject, EventEntity, EventParticipant } from "@/types/database";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { getEntityPublicRoute } from "@/lib/entity-types";
import { getObjectPositionFromFocal } from "@/lib/image-crop-helpers";
import { useIsMobile } from "@/hooks/use-mobile";

// Support legacy EventProject, EventEntity, and NEW EventParticipant
type LineupItemData = EventProject | EventEntity | EventParticipant;

interface LineupItemProps {
  item: LineupItemData;
  showBilling?: boolean;
  isFirst?: boolean;
  /** When set, overrides headliner logic */
  isHeadliner?: boolean;
  /** Larger sizing for event page program view */
  large?: boolean;
}

// Type guard for new EventEntity format
function isEventEntity(item: LineupItemData): item is EventEntity {
  return 'entity_id' in item && 'entity' in item && !('participant_kind' in item);
}

// NEW ROLE MODEL STEP 1.1: Type guard for EventParticipant
function isEventParticipant(item: LineupItemData): item is EventParticipant {
  return 'participant_kind' in item;
}

/**
 * LineupItem - displays lineup artist/entity with hero image
 * Redesigned as "poster" style - large, breathing, not list-like
 * Uses hero_image_settings for focal point positioning when available
 * Mobile: No hover effects, no tagline - only "Utforsk" indicator
 * 
 * NEW ROLE MODEL STEP 1.1: Supports EventParticipant (entity + persona)
 */
export function LineupItem({ item, showBilling, isFirst, isHeadliner: isHeadlinerProp, large }: LineupItemProps) {
  const { data: entityTypes } = useEntityTypes();
  const isMobile = useIsMobile();
  
  // Resolve display data from different item formats
  let displayName = "";
  let displayTagline: string | null = null;
  let displayImageUrl: string | null = null;
  let displayImageSettings: unknown = null;
  let route = "#";
  let billingOrder = 0;

  if (isEventParticipant(item)) {
    // NEW ROLE MODEL STEP 1.1: EventParticipant format
    if (item.participant_kind === "persona" && item.persona) {
      displayName = item.persona.name;
      displayImageUrl = item.persona.avatar_url || null;
      displayImageSettings = item.persona.avatar_image_settings || null;
      route = `/p/${item.persona.slug}`;
    } else if (item.entity) {
      displayName = item.entity.name;
      displayTagline = item.entity.tagline || null;
      displayImageUrl = item.entity.hero_image_url || null;
      displayImageSettings = item.entity.hero_image_settings || null;
      route = getEntityPublicRoute(item.entity.type, item.entity.slug, entityTypes);
    }
    billingOrder = item.sort_order;
    // Show role_label as tagline if persona
    if (item.participant_kind === "persona" && item.role_label) {
      displayTagline = item.role_label;
    }
  } else if (isEventEntity(item)) {
    // EventEntity format
    const entity = item.entity;
    if (!entity) return null;
    displayName = entity.name;
    displayTagline = entity.tagline || null;
    displayImageUrl = entity.hero_image_url || null;
    displayImageSettings = entity.hero_image_settings || null;
    route = getEntityPublicRoute(entity.type, entity.slug, entityTypes);
    billingOrder = item.billing_order;
  } else {
    // Legacy EventProject format
    const project = item.project;
    if (!project) return null;
    displayName = project.name;
    displayTagline = project.tagline || null;
    displayImageUrl = project.hero_image_url || null;
    route = `/project/${project.slug}`;
    billingOrder = item.billing_order;
  }

  if (!displayName) return null;

  const imageUrl = useSignedMediaUrl(displayImageUrl, 'public');
  const isHeadliner = showBilling && (isHeadlinerProp ?? (billingOrder === 1));

  return (
    <Link 
      to={route} 
      className="group block"
    >
      <div className={`flex items-center gap-5 md:gap-6 py-1`}>
        {/* Artist image */}
        <div className={`
          flex-shrink-0 rounded-lg overflow-hidden bg-secondary/50
          ${large
            ? (isHeadliner ? 'w-24 h-24 md:w-28 md:h-28' : 'w-22 h-22 md:w-24 md:h-24')
            : (isHeadliner ? 'w-20 h-20 md:w-24 md:h-24' : 'w-18 h-18 md:w-20 md:h-20')
          }
          transition-transform duration-300 ${!isMobile ? 'group-hover:scale-105' : ''}
        `}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              style={{ objectPosition: getObjectPositionFromFocal(displayImageSettings) }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-bold text-muted-foreground/30 text-2xl">
                {displayName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Artist info */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-semibold tracking-tight 
            ${!isMobile ? 'group-hover:text-accent' : ''} transition-colors duration-200
            ${isHeadliner ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'}
          `}>
            {displayName}
          </h3>
          
          {/* Mobile: show "Utforsk" instead of tagline */}
          {isMobile ? (
            <p className="text-muted-foreground/50 mt-1 text-sm">
              Utforsk →
            </p>
          ) : (
            displayTagline && (
              <p className="text-muted-foreground/70 mt-1 text-sm md:text-base">
                {displayTagline}
              </p>
            )
          )}
        </div>

        {/* Headliner badge - subtle (desktop only) */}
        {isHeadliner && !isMobile && (
          <span className="text-accent/50 text-[10px] uppercase tracking-widest font-mono flex-shrink-0 hidden md:block">
            Headliner
          </span>
        )}
      </div>
    </Link>
  );
}
