import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function FortsattNysgjerrigSection() {
  return (
    <section className="relative min-h-[50vh] md:min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 bg-zinc-950">
      {/* Subtle warm gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 max-w-xl mx-auto text-center">
        {/* Section title - serif for warmth */}
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl text-white mb-6 tracking-tight"
          style={{ fontFamily: "'Crimson Pro', 'Source Serif 4', Georgia, serif" }}
        >
          Fortsatt nysgjerrig?
        </h2>
        
        {/* Description */}
        <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-8">
          GIGGEN bygges som et fellesskap – ikke bare for band, men for alle som 
          bygger scenen: musikere, arrangører, teknikere, fotografer, booking og crew.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            asChild
            variant="outline"
            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500"
          >
            <a href="mailto:hei@giggen.app">
              <Mail className="w-4 h-4 mr-2" />
              Kontakt oss
            </a>
          </Button>
          
          <Button 
            asChild
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/5"
          >
            <Link to="/om-giggen">
              Lær mer om GIGGEN →
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
