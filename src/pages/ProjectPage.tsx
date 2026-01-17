import { useParams } from "react-router-dom";
import { Music } from "lucide-react";
import { useProject } from "@/hooks/useFestival";
import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/ui/HeroSection";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { ProjectTimeline } from "@/components/ui/ProjectTimeline";

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
      {/* Static logo in header */}
      <StaticLogo />

      <HeroSection imageUrl={project.hero_image_url || undefined} compact scrollExpand>
        <div className="animate-slide-up">
          {project.tagline && (
            <div className="text-mono text-accent mb-2 text-sm uppercase tracking-widest">{project.tagline}</div>
          )}
          <h1 className="font-black text-4xl md:text-5xl lg:text-6xl uppercase tracking-tight leading-none">{project.name}</h1>
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

                const displayName = profile.display_name || profile.handle || "Ukjent";

                return (
                  <div key={member.profile_id} className="flex items-center gap-4">
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
                      {member.role_label && (
                        <div className="text-sm text-muted-foreground">
                          {member.role_label}
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
        <ProjectTimeline projectId={project.id} viewerRole="fan" />
      </section>
    </PageLayout>
  );
}
