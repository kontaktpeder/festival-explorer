import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Users, ExternalLink, ArrowLeft, MapPin, Mail } from "lucide-react";
import { EntityTimeline } from "@/components/ui/EntityTimeline";
import { usePublicEntityTimelineEvents } from "@/hooks/useEntityTimeline";
import { usePersona } from "@/hooks/usePersona";
import { usePersonaEntityBindings } from "@/hooks/usePersonaBindings";
import { ContactRequestModal } from "@/components/persona/ContactRequestModal";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { parseImageSettings } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageLayout } from "@/components/layout/PageLayout";
import { PersonaSocialLinks } from "@/components/ui/PersonaSocialLinks";
import { WhatIsGiggenFooter } from "@/components/ui/WhatIsGiggenFooter";
import type { EntityType, Persona } from "@/types/database";
import type { SocialLink } from "@/types/social";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAvailableForLabel, type AvailableForKey } from "@/types/availability";
import { formatLocationDisplay, type LocationType } from "@/types/location";

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

// Scroll reveal hook with fallback
function useScrollReveal(initialVisible = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(initialVisible);

  useEffect(() => {
    if (initialVisible) return;
    
    // Fallback: make visible after delay if observer doesn't fire
    const fallbackTimer = setTimeout(() => setIsVisible(true), 500);
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          clearTimeout(fallbackTimer);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "50px 0px 0px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [initialVisible]);

  return { ref, isVisible };
}

export default function PersonaPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: persona, isLoading: isLoadingPersona, error } = usePersona(slug);
  const { data: bindings, isLoading: isLoadingBindings } = usePersonaEntityBindings(persona?.id);
  const { data: otherPersonas } = usePersonasByUserId(persona?.user_id);
  const { data: timelineEvents } = usePublicEntityTimelineEvents(undefined, persona?.id);

  // Contact modal state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const showContactButton = (persona as any)?.show_email === true &&
    (persona as any)?.public_email &&
    (persona as any)?.public_email.trim().length > 0;

  // Scroll reveal for sections - hero is visible immediately
  const heroReveal = useScrollReveal(true); // Always visible immediately
  const bioReveal = useScrollReveal();
  const timelineReveal = useScrollReveal();
  const entitiesReveal = useScrollReveal();
  const linksReveal = useScrollReveal();

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

  // Get social links from persona (future-proofed - field may not exist yet)
  const personaSocialLinks = ((persona as any)?.social_links || []) as SocialLink[] | undefined;
  
  // Get availability and location
  const availableFor = ((persona as any)?.available_for || []) as AvailableForKey[];
  const locationName = (persona as any)?.location_name as string | null;
  const locationType = (persona as any)?.location_type as LocationType | null;
  const locationDisplay = formatLocationDisplay(locationName, locationType);

  if (isLoadingPersona) return <LoadingState />;
  
  if (error || !persona) {
    return (
      <PageLayout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <h1 className="text-2xl font-light mb-2">Profil ikke funnet</h1>
          <p className="text-muted-foreground/60">
            Denne profilen finnes ikke eller er ikke offentlig.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen">
        {/* Back button - fixed top */}
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/30 text-muted-foreground hover:text-foreground hover:bg-background/90 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm">Tilbake</span>
          </button>
        </div>

        {/* Hero Section */}
        <section
          ref={heroReveal.ref}
          className={`
            pt-24 pb-16 md:pt-32 md:pb-24 px-6
            flex flex-col items-center text-center
            transition-all duration-1000 ease-out
            ${heroReveal.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          {/* Large avatar with glow */}
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl scale-110 animate-pulse" />
            <Avatar className="relative h-36 w-36 md:h-44 md:w-44 ring-2 ring-border/20 shadow-2xl">
              <AvatarImage 
                src={avatarUrl || undefined} 
                style={avatarStyles}
              />
              <AvatarFallback className="text-4xl font-light bg-muted">
                {persona.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Name - large editorial */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium tracking-tight mb-6">
            {persona.name}
          </h1>
          
          {/* Tags - subtle badges */}
          {persona.category_tags && persona.category_tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {persona.category_tags.map((tag) => (
                <span 
                  key={tag} 
                  className="px-4 py-1.5 rounded-full border border-primary/30 text-primary/80 text-sm capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Available for - only show if populated */}
          {availableFor.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {availableFor.map((key) => (
                <span 
                  key={key} 
                  className="px-3 py-1 rounded-full bg-secondary/50 text-secondary-foreground/70 text-xs"
                >
                  {getAvailableForLabel(key)}
                </span>
              ))}
            </div>
          )}

          {/* Location - only show if populated */}
          {locationDisplay && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60 mb-8">
              <MapPin className="w-3.5 h-3.5" />
              <span>{locationDisplay}</span>
            </div>
          )}

          {/* Social links */}
          <PersonaSocialLinks links={personaSocialLinks} />

          {/* Contact button */}
          {showContactButton && (
            <button
              onClick={() => setContactModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors duration-300"
            >
              <Mail className="w-4 h-4" />
              Book / samarbeid
            </button>
          )}
        </section>

        {/* Bio Section */}
        {persona.bio && (
          <section
            ref={bioReveal.ref}
            className={`
              py-12 md:py-20 px-6 max-w-2xl mx-auto
              transition-all duration-1000 ease-out delay-100
              ${bioReveal.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            <p className="text-lg md:text-xl text-muted-foreground/80 leading-relaxed text-center font-light whitespace-pre-line">
              {persona.bio}
            </p>
          </section>
        )}

        {/* Timeline Section - Min reise - only show if events exist */}
        {timelineEvents && timelineEvents.length > 0 && (
          <section
            ref={timelineReveal.ref}
            className={`
              py-16 md:py-24 px-6
              transition-all duration-1000 ease-out delay-200
              ${timelineReveal.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-display font-light text-center text-muted-foreground/60 mb-12 md:mb-16 tracking-wide">
                Min reise
              </h2>
              
              {persona && (
                <EntityTimeline personaId={persona.id} viewerRole="fan" />
              )}
            </div>
          </section>
        )}

        {/* Medvirker på Section */}
        {!isLoadingBindings && publicBindings.length > 0 && (
          <section
            ref={entitiesReveal.ref}
            className={`
              py-16 md:py-24 px-6
              transition-all duration-1000 ease-out delay-300
              ${entitiesReveal.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-display font-light text-center text-muted-foreground/60 mb-12 md:mb-16 tracking-wide">
                Medvirker på
              </h2>
              
              <div className="space-y-8">
                {publicBindings.map((binding, index) => {
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
                      className="group flex items-center gap-6 py-4 transition-all duration-300 hover:translate-x-2"
                      style={{ transitionDelay: `${index * 80}ms` }}
                    >
                      {/* Entity image/icon */}
                      <div className="relative shrink-0">
                        {entity.hero_image_url ? (
                          <img
                            src={entity.hero_image_url}
                            alt={entity.name}
                            className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover ring-1 ring-border/10 group-hover:ring-primary/30 transition-all duration-300"
                          />
                        ) : (
                          <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-muted/50 flex items-center justify-center ring-1 ring-border/10 group-hover:ring-primary/30 transition-all duration-300">
                            <Icon className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      
                      {/* Entity info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xl md:text-2xl font-medium tracking-tight group-hover:text-primary transition-colors duration-300">
                          {entity.name}
                        </p>
                        
                        {/* Tagline as teaser */}
                        {entity.tagline && (
                          <p className="text-sm text-muted-foreground/70 mt-1 line-clamp-1">
                            {entity.tagline}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-sm text-muted-foreground/60">
                            {TYPE_LABELS[entity.type as EntityType]}
                          </span>
                          {binding.role_label && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <span className="text-sm text-primary/60">
                                {binding.role_label}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow hint */}
                      <ArrowLeft className="w-5 h-5 text-muted-foreground/30 rotate-180 group-hover:text-primary/60 group-hover:translate-x-1 transition-all duration-300" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Other personas links - at the very bottom */}
        {otherPersonasList.length > 0 && (
          <section
            ref={linksReveal.ref}
            className={`
              py-20 md:py-28 px-6 border-t border-border/10
              transition-all duration-1000 ease-out delay-400
              ${linksReveal.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            <div className="max-w-xl mx-auto text-center">
              <p className="text-sm text-muted-foreground/40 mb-6 tracking-wide uppercase">
                Andre profiler fra samme person
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {otherPersonasList.map((otherPersona) => (
                  <Link 
                    key={otherPersona.id}
                    to={`/p/${otherPersona.slug}`}
                    className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/30 text-foreground/80 hover:border-primary/50 hover:text-primary transition-all duration-300"
                  >
                    {otherPersona.name}
                    <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* What is GIGGEN footer */}
        <WhatIsGiggenFooter />

        {/* Spacer at bottom */}
        <div className="h-8 md:h-12" />

        {/* Contact Request Modal */}
        {persona && showContactButton && (
          <ContactRequestModal
            open={contactModalOpen}
            onOpenChange={setContactModalOpen}
            persona={persona as any}
            avatarUrl={avatarUrl}
          />
        )}
      </div>
    </PageLayout>
  );
}
