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
}

// Type guard to check if it's the new EventEntity format
function isEventEntity(item: LineupItemData): item is EventEntity {
  return 'entity_id' in item && 'entity' in item;
}

/**
 * LineupItem - displays lineup artist/entity with hero image
 * Uses hero_image_settings for focal point positioning when available
 */
export function LineupItem({ item, showBilling }: LineupItemProps) {
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

  return (
    <Link to={route} className="lineup-item group">
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-secondary">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={entityData.name}
            className="w-full h-full object-cover"
            style={{ objectPosition: getObjectPositionFromFocal(imageSettings) }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-lg font-bold text-muted-foreground/40">
              {entityData.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold truncate group-hover:text-accent transition-colors">
          {entityData.name}
        </h4>
        {entityData.tagline && (
          <p className="text-sm text-muted-foreground truncate">{entityData.tagline}</p>
        )}
      </div>

      {showBilling && item.billing_order === 1 && (
        <span className="cosmic-tag-accent flex-shrink-0">Headliner</span>
      )}
    </Link>
  );
}
