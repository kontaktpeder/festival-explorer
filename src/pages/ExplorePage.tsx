import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, Calendar, Music, ArrowRight } from "lucide-react";
import { useExploreEvents, useExploreEntities, useExploreFeaturedEvents } from "@/hooks/useExplore";
import { PageLayout } from "@/components/layout/PageLayout";
import { EventCard } from "@/components/ui/EventCard";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { LoadingState, EmptyState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import type { Event, Entity } from "@/types/database";

type Tab = "events" | "artists";

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [showAllEvents, setShowAllEvents] = useState(
    searchParams.get("all") === "true"
  );
  
  const { data: featuredEvents, isLoading: loadingFeatured } = useExploreFeaturedEvents();
  const { data: allEvents, isLoading: loadingAllEvents } = useExploreEvents();
  const { data: entities, isLoading: loadingEntities } = useExploreEntities();

  const isLoading = activeTab === "events" 
    ? (showAllEvents ? loadingAllEvents : loadingFeatured) 
    : loadingEntities;
  
  const events = showAllEvents ? allEvents : featuredEvents;

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
            onClick={() => setActiveTab("artists")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "artists"
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
            <>
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <EventCard event={event as Event & { venue?: { name: string; slug: string } | null }} />
                </div>
              ))}
              
              {!showAllEvents && (
                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAllEvents(true)}
                  >
                    <span className="flex items-center gap-2">
                      Se alle konserter
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<Calendar className="w-12 h-12" />}
              title={showAllEvents ? "Ingen kommende events" : "Ingen featured events"}
              description={
                showAllEvents 
                  ? "Det er ingen publiserte events for øyeblikket."
                  : "Det er ingen featured events for øyeblikket."
              }
            />
          )}
        </div>
      )}

      {!isLoading && activeTab === "artists" && (
        <div className="px-4 grid grid-cols-2 gap-3">
          {entities && entities.length > 0 ? (
            entities.map((entity, index) => (
              <div
                key={entity.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ProjectCard project={entity as Entity} />
              </div>
            ))
          ) : (
            <div className="col-span-2">
              <EmptyState
                icon={<Music className="w-12 h-12" />}
                title="Ingen artister"
                description="Det er ingen publiserte artister for øyeblikket."
              />
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
