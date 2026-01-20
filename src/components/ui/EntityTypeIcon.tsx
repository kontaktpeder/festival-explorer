import { Building2, User, Users, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  building2: Building2,
  user: User,
  users: Users,
};

interface EntityTypeIconProps {
  iconKey: string;
  className?: string;
}

/**
 * Renders an icon based on the icon_key from entity_types
 */
export function EntityTypeIcon({ iconKey, className }: EntityTypeIconProps) {
  const Icon = ICON_MAP[iconKey.toLowerCase()] || User;
  return <Icon className={cn("h-4 w-4", className)} />;
}

/**
 * Get icon component by key - for inline usage
 */
export function getIconComponent(iconKey: string): LucideIcon {
  return ICON_MAP[iconKey.toLowerCase()] || User;
}
