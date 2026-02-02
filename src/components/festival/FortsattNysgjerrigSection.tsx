import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function FortsattNysgjerrigSection() {
  return (
    <section className="relative py-20 md:py-28 px-6 bg-zinc-950">
      {/* Grain texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Section title - serif for warmth */}
        <h2 
          className="text-4xl sm:text-5xl md:text-6xl text-white mb-8 tracking-tight"
          style={{ fontFamily: "'Crimson Pro', 'Source Serif 4', Georgia, serif" }}
        >
          Fortsatt nysgjerrig?
        </h2>
        
        {/* Description - concise */}
        <p className="text-lg md:text-xl text-white/60 leading-relaxed mb-10 max-w-xl mx-auto">
          GIGGEN bygges som et fellesskap – ikke bare for band, men for alle som 
          bygger scenen: musikere, arrangører, teknikere, fotografer, booking og crew.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            asChild
            className="bg-orange-500 hover:bg-orange-600 text-white border-0 px-8"
          >
            <a href="mailto:hei@giggen.app">
              <Mail className="w-4 h-4 mr-2" />
              Kontakt oss
            </a>
          </Button>
          
          <Link 
            to="/om-giggen"
            className="text-white/60 hover:text-white transition-colors text-sm tracking-wide"
          >
            Lær mer om GIGGEN →
          </Link>
        </div>
      </div>
    </section>
  );
}
