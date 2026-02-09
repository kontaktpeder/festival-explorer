import { Link } from "react-router-dom";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// NEW ROLE MODEL STEP 1.2: Simple participant row (persona or entity)
interface EventParticipantItemProps {
  item: {
    persona?: { name: string; avatar_url?: string | null; slug?: string } | null;
    entity?: { name: string; hero_image_url?: string | null } | null;
    role_label?: string | null;
  };
}

export function EventParticipantItem({ item }: EventParticipantItemProps) {
  const rawImageUrl = item.persona?.avatar_url ?? item.entity?.hero_image_url ?? null;
  const imageUrl = useSignedMediaUrl(rawImageUrl, "public");
  const name = item.persona?.name ?? item.entity?.name ?? "";
  const role = item.role_label;

  const personaSlug = item.persona?.slug;

  const nameElement = personaSlug ? (
    <Link to={`/p/${personaSlug}`} className="text-sm font-medium text-foreground hover:underline">
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
