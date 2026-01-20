import { useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Users } from "lucide-react";
import { usePersona } from "@/hooks/usePersona";
import { usePersonaEntityBindings } from "@/hooks/usePersonaBindings";
import { LoadingState } from "@/components/ui/LoadingState";
import type { EntityType } from "@/types/database";

const TYPE_ICONS: Record<EntityType, typeof User> = {
  venue: Building2,
  solo: User,
  band: Users,
};

const TYPE_LABELS: Record<EntityType, string> = {
  venue: "Venue",
  solo: "Artist",
  band: "Band",
};

export default function PersonaPage() {
  const { slug } = useParams();
  const { data: persona, isLoading: isLoadingPersona, error } = usePersona(slug);
  const { data: bindings, isLoading: isLoadingBindings } = usePersonaEntityBindings(persona?.id);

  // Filter to only show public bindings for published entities
  const publicBindings = (bindings || []).filter(
    (binding) => binding.is_public && binding.entity?.is_published
  );

  if (isLoadingPersona) return <LoadingState />;
  
  if (error || !persona) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Profil ikke funnet</h1>
        <p className="text-muted-foreground">
          Denne profilen finnes ikke eller er ikke offentlig.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={persona.avatar_url || undefined} />
          <AvatarFallback className="text-2xl">
            {persona.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <h1 className="text-3xl font-bold">{persona.name}</h1>
          {persona.category_tags && persona.category_tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {persona.category_tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="capitalize">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {persona.bio && (
          <p className="text-muted-foreground max-w-md">
            {persona.bio}
          </p>
        )}
      </div>

      {/* Associated Entities via bindings */}
      {!isLoadingBindings && publicBindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tilknyttet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {publicBindings.map((binding) => {
                const entity = binding.entity;
                if (!entity) return null;
                
                const Icon = TYPE_ICONS[entity.type as EntityType];
                return (
                  <Link
                    key={binding.id}
                    to={entity.type === 'venue' 
                      ? `/venue/${entity.slug}`
                      : `/project/${entity.slug}`
                    }
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    {entity.hero_image_url ? (
                      <img
                        src={entity.hero_image_url}
                        alt={entity.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entity.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[entity.type as EntityType]}
                        </Badge>
                        {binding.role_label && (
                          <span className="text-xs text-muted-foreground">
                            {binding.role_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
