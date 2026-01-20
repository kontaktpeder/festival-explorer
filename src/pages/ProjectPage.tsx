import { useParams, Link } from "react-router-dom";
import { Music } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

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
import { useEntityPersonaBindings } from "@/hooks/usePersonaBindings";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { EntityTimeline } from "@/components/ui/EntityTimeline";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading, error } = useEntity(slug || "");
  const { data: personaBindings } = useEntityPersonaBindings(entity?.id);

  // Filter to only show public bindings with public personas
  const publicBindings = (personaBindings || []).filter(
    (binding) => binding.is_public && binding.persona?.is_public
  );

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

  return (
    <PageLayout>
      {/* Static logo in header */}
      <StaticLogo />

      <HeroSection imageUrl={entity.hero_image_url || undefined} compact scrollExpand>
        {entity.tagline && (
          <div className="text-mono text-accent mb-1 text-xs uppercase tracking-widest opacity-80">{entity.tagline}</div>
        )}
        <h1 className="font-black text-2xl md:text-3xl uppercase tracking-tight leading-none">{entity.name}</h1>
      </HeroSection>

      <div className="section">
        {entity.description && (
          <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
            {entity.description}
          </p>
        )}
      </div>

      {/* Personas section - "Bak prosjektet" */}
      {publicBindings.length > 0 && (
        <>
          <div className="accent-line" />
          <section className="section">
            <h2 className="section-title">{getPersonasSectionTitle(entity.type)}</h2>

            <div className="space-y-4">
              {publicBindings.map((binding) => {
                const persona = binding.persona;
                if (!persona) return null;

                return (
                  <Link 
                    key={binding.id} 
                    to={`/p/${persona.slug}`}
                    className="flex items-center gap-4 hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                      {persona.avatar_url ? (
                        <img
                          src={persona.avatar_url}
                          alt={persona.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-lg font-bold text-muted-foreground/40">
                            {persona.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {persona.name}
                      </div>
                      {binding.role_label && (
                        <div className="text-sm text-muted-foreground">
                          {binding.role_label}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Timeline section */}
      <div className="accent-line" />
      <section className="section">
        <h2 className="section-title">Historien</h2>
        <EntityTimeline entityId={entity.id} viewerRole="fan" />
      </section>
    </PageLayout>
  );
}
