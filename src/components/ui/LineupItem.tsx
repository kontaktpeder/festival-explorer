import { Link } from "react-router-dom";
import type { EventProject, EventEntity } from "@/types/database";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { getEntityPublicRoute } from "@/lib/entity-types";
import { getObjectPositionFromFocal } from "@/lib/image-crop-helpers";

// Support both legacy EventProject and new EventEntity
type LineupItemData = EventProject | EventEntity;

interface LineupItemProps {
  item: LineupItemData;
  showBilling?: boolean;
  isFirst?: boolean;
}

// Type guard to check if it's the new EventEntity format
function isEventEntity(item: LineupItemData): item is EventEntity {
  return 'entity_id' in item && 'entity' in item;
}

/**
 * LineupItem - displays lineup artist/entity with hero image
 * Redesigned as "poster" style - large, breathing, not list-like
 * Uses hero_image_settings for focal point positioning when available
 */
export function LineupItem({ item, showBilling, isFirst }: LineupItemProps) {
  const { data: entityTypes } = useEntityTypes();
  
  // Handle both new entity format and legacy project format
  const entityData = isEventEntity(item) ? item.entity : item.project;
  
  // Signed URL for public viewing
  const imageUrl = useSignedMediaUrl(entityData?.hero_image_url, 'public');
  
  // Get image settings if available (Entity type has it)
  const imageSettings = isEventEntity(item) && item.entity 
    ? item.entity.hero_image_settings 
    : null;
  
  if (!entityData) return null;

  // Get route from entity_types config
  const entityType = isEventEntity(item) && item.entity?.type;
  const route = entityType 
    ? getEntityPublicRoute(entityType, entityData.slug, entityTypes)
    : `/project/${entityData.slug}`;

  const isHeadliner = showBilling && item.billing_order === 1;

  return (
    <Link 
      to={route} 
      className="group block"
    >
      <div className={`flex items-center gap-6 md:gap-8 ${isFirst || isHeadliner ? 'py-2' : ''}`}>
        {/* Artist image - larger for poster feel */}
        <div className={`
          flex-shrink-0 rounded-lg overflow-hidden bg-secondary/50
          ${isHeadliner ? 'w-24 h-24 md:w-32 md:h-32' : 'w-16 h-16 md:w-20 md:h-20'}
          transition-transform duration-300 group-hover:scale-105
        `}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={entityData.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: getObjectPositionFromFocal(imageSettings) }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className={`
                font-bold text-muted-foreground/30
                ${isHeadliner ? 'text-3xl' : 'text-xl'}
              `}>
                {entityData.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Artist info */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-semibold tracking-tight 
            group-hover:text-accent transition-colors duration-200
            ${isHeadliner ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'}
          `}>
            {entityData.name}
          </h3>
          
          {entityData.tagline && (
            <p className={`
              text-muted-foreground/70 mt-1
              ${isHeadliner ? 'text-base md:text-lg' : 'text-sm md:text-base'}
            `}>
              {entityData.tagline}
            </p>
          )}
        </div>

        {/* Headliner badge - subtle, not flashy */}
        {isHeadliner && (
          <span className="text-accent/60 text-xs uppercase tracking-widest font-mono flex-shrink-0 hidden md:block">
            Headliner
          </span>
        )}
      </div>
    </Link>
  );
}
