import { useParams } from "react-router-dom";
import { Music } from "lucide-react";
import { useEntity } from "@/hooks/useEntity";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { EntityTimeline } from "@/components/ui/EntityTimeline";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading, error } = useEntity(slug || "");

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

      {/* Public team members section */}
      {entity.team && entity.team.length > 0 && (
        <>
          <div className="accent-line" />
          <section className="section">
            <h2 className="section-title">Bak prosjektet</h2>

            <div className="space-y-4">
              {entity.team.map((member) => {
                const profile = member.profile;
                if (!profile) return null;

                const displayName = profile.display_name || profile.handle || "Ukjent";

                return (
                  <div key={member.user_id} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-lg font-bold text-muted-foreground/40">
                            {displayName.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {displayName}
                      </div>
                      {member.role_labels && member.role_labels.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {member.role_labels.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
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
