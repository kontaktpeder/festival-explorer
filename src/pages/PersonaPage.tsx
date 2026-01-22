import { useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, User, Users, ExternalLink, Clock, Info } from "lucide-react";
import { usePersona } from "@/hooks/usePersona";
import { usePersonaEntityBindings } from "@/hooks/usePersonaBindings";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageLayout } from "@/components/layout/PageLayout";
import type { EntityType, Persona } from "@/types/database";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

// Hook to get all public personas for a user
function usePersonasByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ["personas-by-user", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("personas")
        .select("*")
        .eq("user_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Persona[];
    },
    enabled: !!userId,
  });
}

export default function PersonaPage() {
  const { slug } = useParams();
  const { data: persona, isLoading: isLoadingPersona, error } = usePersona(slug);
  const { data: bindings, isLoading: isLoadingBindings } = usePersonaEntityBindings(persona?.id);
  const { data: otherPersonas } = usePersonasByUserId(persona?.user_id);

  // Filter to only show public bindings for published entities
  const publicBindings = (bindings || []).filter(
    (binding) => binding.is_public && binding.entity?.is_published
  );

  // Filter out current persona from other personas
  const otherPersonasList = (otherPersonas || []).filter(
    (p) => p.id !== persona?.id
  );

  // Use signed URL and parse image settings for avatar
  const avatarUrl = useSignedMediaUrl(persona?.avatar_url, 'public');
  const avatarImageSettings = parseImageSettings(persona?.avatar_image_settings);
  const avatarStyles = getCroppedImageStyles(avatarImageSettings);

  if (isLoadingPersona) return <LoadingState />;
  
  if (error || !persona) {
    return (
      <PageLayout>
        <div className="container max-w-2xl py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Profil ikke funnet</h1>
          <p className="text-muted-foreground">
            Denne profilen finnes ikke eller er ikke offentlig.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container max-w-2xl py-8 space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-28 w-28">
            <AvatarImage 
              src={avatarUrl || undefined} 
              style={avatarStyles}
            />
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

          {/* Link to other personas if they exist */}
          {otherPersonasList.length > 0 && (
            <div className="pt-4 border-t border-border w-full max-w-xs">
              <p className="text-xs text-muted-foreground mb-2">
                Andre profiler fra samme person:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {otherPersonasList.map((otherPersona) => (
                  <Link 
                    key={otherPersona.id}
                    to={`/p/${otherPersona.slug}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {otherPersona.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            </div>
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

        {/* Min reise (tidslinje) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Min reise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-muted/50 border-border/50">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-sm text-muted-foreground">
                Tidslinje viser personlig reise som artist eller kreativ.
              </AlertDescription>
            </Alert>
            
            <div className="py-6 text-center text-muted-foreground">
              <Clock className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tidslinje kommer snart</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
