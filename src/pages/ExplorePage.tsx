import { useState } from "react";
import { Compass, Calendar, Music } from "lucide-react";
import { useExploreEvents, useExploreProjects } from "@/hooks/useExplore";
import { PageLayout } from "@/components/layout/PageLayout";
import { EventCard } from "@/components/ui/EventCard";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import type { Event, Project } from "@/types/database";

type Tab = "events" | "projects";

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const { data: events, isLoading: loadingEvents } = useExploreEvents();
  const { data: projects, isLoading: loadingProjects } = useExploreProjects();

  const isLoading = activeTab === "events" ? loadingEvents : loadingProjects;

  return (
    <PageLayout>
      <div className="p-4 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <Compass className="w-6 h-6 text-accent" />
          <h1 className="text-display text-2xl">Utforsk</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "events"
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Events
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "projects"
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Music className="w-4 h-4" />
            Artister
          </button>
        </div>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && activeTab === "events" && (
        <div className="px-4 space-y-4">
          {events && events.length > 0 ? (
            events.map((event, index) => (
              <div
                key={event.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <EventCard event={event as Event & { venue?: { name: string; slug: string } | null }} />
              </div>
            ))
          ) : (
            <EmptyState
              icon={<Calendar className="w-12 h-12" />}
              title="Ingen kommende events"
              description="Det er ingen publiserte events for øyeblikket."
            />
          )}
        </div>
      )}

      {!isLoading && activeTab === "projects" && (
        <div className="px-4 grid grid-cols-2 gap-3">
          {projects && projects.length > 0 ? (
            projects.map((project, index) => (
              <div
                key={project.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ProjectCard project={project as Project} />
              </div>
            ))
          ) : (
            <div className="col-span-2">
              <EmptyState
                icon={<Music className="w-12 h-12" />}
                title="Ingen artister"
                description="Det er ingen publiserte artister/prosjekter for øyeblikket."
              />
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
