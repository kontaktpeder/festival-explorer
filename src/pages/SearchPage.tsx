import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Calendar, Music, X } from "lucide-react";
import { useSearch } from "@/hooks/useExplore";
import { PageLayout } from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/ui/LoadingState";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useSearch(query);

  const hasResults =
    results && (results.events.length > 0 || results.projects.length > 0);

  return (
    <PageLayout>
      <div className="p-4 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-6 h-6 text-accent" />
          <h1 className="text-display text-2xl">Søk</h1>
        </div>

        {/* Search input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk etter events eller artister..."
            className="w-full bg-secondary rounded-lg pl-12 pr-10 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-4">
        {query.length < 2 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Skriv minst 2 tegn for å søke</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
            <p>Søker...</p>
          </div>
        ) : !hasResults ? (
          <EmptyState
            title="Ingen resultater"
            description={`Fant ingen treff for "${query}"`}
          />
        ) : (
          <div className="space-y-6">
            {/* Events */}
            {results.events.length > 0 && (
              <section>
                <h2 className="section-title flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Events
                </h2>
                <div className="space-y-2">
                  {results.events.map((event) => (
                    <Link
                      key={event.id}
                      to={`/event/${event.slug}`}
                      className="cosmic-card p-3 flex items-center gap-3 group"
                    >
                      {event.hero_image_url && (
                        <img
                          src={event.hero_image_url}
                          alt={event.title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-accent transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.start_at), "d. MMM yyyy", {
                            locale: nb,
                          })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {results.projects.length > 0 && (
              <section>
                <h2 className="section-title flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Artister
                </h2>
                <div className="space-y-2">
                  {results.projects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/project/${project.slug}`}
                      className="cosmic-card p-3 flex items-center gap-3 group"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        {project.hero_image_url ? (
                          <img
                            src={project.hero_image_url}
                            alt={project.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-lg font-bold text-muted-foreground/40">
                              {project.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-accent transition-colors">
                          {project.name}
                        </h3>
                        {project.tagline && (
                          <p className="text-sm text-muted-foreground truncate">
                            {project.tagline}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
