import { Link } from "react-router-dom";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { getEntityPublicRoute } from "@/lib/entity-types";

/**
 * Shared component for displaying team/credits lists.
 * Used on EventPage (Festival-team), ProjectPage (Bak prosjektet),
 * and OmGiggenPage (Festival-teamet).
 *
 * Each member shows avatar, name (linked), and role.
 */

interface TeamMember {
  persona?: {
    name: string;
    avatar_url?: string | null;
    slug?: string;
    type?: string | null;
    category_tags?: string[] | null;
  } | null;
  entity?: {
    name: string;
    slug?: string | null;
    type?: string | null;
    hero_image_url?: string | null;
  } | null;
  role_label?: string | null;
  /** Fallback role sources for project team members */
  bindingRoleLabel?: string | null;
  role_labels?: string[] | null;
}

interface TeamCreditsSectionProps {
  title: string;
  members: TeamMember[];
  /** Optional class for the outer section */
  className?: string;
}

function TeamCreditItem({ member }: { member: TeamMember }) {
  const { data: entityTypes } = useEntityTypes();
  const rawImageUrl = member.persona?.avatar_url ?? member.entity?.hero_image_url ?? null;
  const imageUrl = useSignedMediaUrl(rawImageUrl, "public");
  const name = member.persona?.name ?? member.entity?.name ?? "";

  // Role resolution: explicit label → binding label → role_labels → persona type → first category tag
  const role =
    member.role_label ||
    member.bindingRoleLabel ||
    (member.role_labels?.length ? member.role_labels.join(", ") : null) ||
    getPersonaTypeLabel(member.persona?.type) ||
    (member.persona?.category_tags?.[0] ?? null);

  const personaSlug = member.persona?.slug;
  const entitySlug = member.entity?.slug;
  const entityType = member.entity?.type;

  const nameElement = personaSlug ? (
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
    <div className="flex items-center gap-4">
      <Avatar className="h-10 w-10 border border-border/30">
        {imageUrl ? (
          <AvatarImage src={imageUrl} alt={name} className="object-cover" />
        ) : null}
        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div>
        {nameElement}
        {role && (
          <p className="text-xs text-muted-foreground">{role}</p>
        )}
      </div>
    </div>
  );
}

export function TeamCreditsSection({ title, members, className }: TeamCreditsSectionProps) {
  if (!members || members.length === 0) return null;

  return (
    <div className={className ?? "py-16 md:py-24 border-t border-border/20"}>
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-8">
          {title}
        </h2>
        <div className="space-y-4">
          {members.map((member, i) => (
            <TeamCreditItem key={(member.persona?.slug || member.entity?.slug || '') + i} member={member} />
          ))}
        </div>
      </div>
    </div>
  );
}
