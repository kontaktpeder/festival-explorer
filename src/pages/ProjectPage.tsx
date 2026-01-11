import { useParams } from "react-router-dom";
import { Music } from "lucide-react";
import { useProject } from "@/hooks/useFestival";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading, error } = useProject(slug || "");

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Laster prosjekt..." />
      </PageLayout>
    );
  }

  if (error || !project) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Music className="w-12 h-12" />}
          title="Prosjekt ikke funnet"
          description="Prosjektet du leter etter finnes ikke eller er ikke publisert ennå."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <HeroSection imageUrl={project.hero_image_url || undefined} compact>
        <div className="animate-slide-up">
          {project.tagline && (
            <div className="text-mono text-accent mb-2">{project.tagline}</div>
          )}
          <h1 className="text-display text-3xl md:text-4xl">{project.name}</h1>
        </div>
      </HeroSection>

      <div className="section">
        {project.description && (
          <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
            {project.description}
          </p>
        )}
      </div>

      {/* Public members section */}
      {project.members && project.members.length > 0 && (
        <>
          <div className="accent-line" />
          <section className="section">
            <h2 className="section-title">Bak prosjektet</h2>

            <div className="space-y-4">
              {project.members.map((member) => {
                const profile = member.profile;
                if (!profile) return null;

                return (
                  <div key={member.id} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-lg font-bold text-muted-foreground/40">
                            {(profile.full_name || "?").charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {profile.full_name || "Ukjent"}
                      </div>
                      {member.role && (
                        <div className="text-sm text-muted-foreground">
                          {member.role}
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

      {/* Placeholder for future travel modules */}
      <div className="section opacity-50">
        <div className="cosmic-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Relaterte opplevelser kommer snart...
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
