import { Link } from "react-router-dom";
import { Users, Mail, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VenuePosterBlock } from "./VenuePosterBlock";
import { Button } from "@/components/ui/button";
interface ExploreLink {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  to: string;
}
const exploreLinks: ExploreLink[] = [{
  icon: <Sparkles className="w-5 h-5" />,
  title: "Lær mer om GIGGEN",
  subtitle: "Historien bak",
  to: "/om-giggen"
}, {
  icon: <Users className="w-5 h-5" />,
  title: "Backstage",
  subtitle: "For artister, arrangører og crew",
  to: "/dashboard"
}];
export function UtforskMerSection() {
  // Hent venue fra database for dynamisk oppdatering
  const {
    data: venue
  } = useQuery({
    queryKey: ["venue", "josefines-vertshus"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("venues").select("name, slug, address, hero_image_url").eq("slug", "josefines-vertshus").eq("is_published", true).maybeSingle();
      if (error) throw error;
      return data;
    }
  });
  return <section className="relative bg-black">
      {/* Venue poster block - same style as lineup */}
      <VenuePosterBlock venue={{
      name: venue?.name || "Josefines Vertshus",
      slug: venue?.slug || "josefines-vertshus",
      tagline: venue?.address || "Josefines gate 16, Oslo",
      hero_image_url: venue?.hero_image_url || null
    }} />
      
      {/* Lær mer om GIGGEN - community pitch */}
      <div className="relative py-16 md:py-20 px-6 bg-zinc-950">
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
        
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          {/* Section title - serif for warmth */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl text-white mb-6 tracking-tight" style={{
          fontFamily: "'Crimson Pro', 'Source Serif 4', Georgia, serif"
        }}>
            Fortsatt nysgjerrig? 
          </h2>
          
          {/* Description - concise */}
          <p className="text-base md:text-lg text-white/60 leading-relaxed mb-6 max-w-xl mx-auto">
            GIGGEN bygges som et fellesskap – ikke bare for band, men for alle som 
            bygger scenen: musikere, arrangører, teknikere, fotografer, booking og crew.
          </p>
          
          {/* Navigation links - moved up under text */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 mb-10">
            {exploreLinks.map((link, index) => <Link key={index} to={link.to} className="group flex items-center gap-3 text-white/50 hover:text-white transition-colors duration-300">
                <span className="text-orange-400/50 group-hover:text-orange-400 transition-colors">
                  {link.icon}
                </span>
                <span className="text-base font-medium">
                  {link.title}
                </span>
                <span className="text-orange-400/0 group-hover:text-orange-400 transition-colors text-sm">
                  →
                </span>
              </Link>)}
          </div>
          
          {/* Contact CTA - orange inverted style at bottom */}
          <Button asChild variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black hover:!text-black transition-all px-8">
            <Link to="/request-access">
              <Mail className="w-4 h-4 mr-2" />
              Be om tilgang
            </Link>
          </Button>
        </div>
      </div>
    </section>;
}