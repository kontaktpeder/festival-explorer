import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Instagram, Youtube, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import giggenLogo from "@/assets/giggen-festival-logo.png";
import bgOrange from "@/assets/om-giggen-bg-orange.jpeg";
import bgDark from "@/assets/om-giggen-bg-dark.jpeg";
import bgWarm from "@/assets/om-giggen-bg-warm.jpeg";

// Hook for scroll reveal animations
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = ref.current?.querySelectorAll(".reveal-on-scroll");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function OmGiggenPage() {
  const containerRef = useScrollReveal();

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white">
      {/* Back button */}
      <div className="fixed top-6 left-6 z-50">
        <Link
          to="/festival/giggen-sessions"
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake
        </Link>
      </div>

      {/* Hero Section - Origin Story */}
      <section 
        className="relative min-h-screen flex items-center justify-center px-6"
        style={{
          backgroundImage: `url(${bgOrange})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
        
        <div className="relative z-10 max-w-3xl text-center">
          <div className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out">
            <img 
              src={giggenLogo} 
              alt="GIGGEN" 
              className="h-16 md:h-20 mx-auto mb-12 drop-shadow-2xl"
            />
          </div>
          
          <p 
            className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 text-lg md:text-xl lg:text-2xl leading-relaxed text-white/90"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            <strong className="font-bold text-white">
              GIGGEN startet med et enkelt ønske om å spille mer musikk live.
            </strong>{" "}
            Med tiden oppdaget den beskjedne bassisten at det "enkle" ønsket innebar alt fra å 
            mestre kaotiske sosiale medier, inneha et sosialt intellekt, og å bli sin 
            helt egne regnskapsfører. Overveldende, kort fortalt.
          </p>
          
          <p 
            className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-300 text-lg md:text-xl text-white/70 mt-8"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            En frustrasjon vokste, modnet, og ble til et større engasjement for alle 
            som vil skape sin egen scene, eller løfte fram de som allerede finnes.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Tankesett Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center px-6"
        style={{
          backgroundImage: `url(${bgDark})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
        
        <div className="relative z-10 max-w-3xl text-center">
          <h2 
            className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            GIGGEN er et tankesett.
          </h2>
          
          <p 
            className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 text-xl md:text-2xl text-white/80 leading-relaxed"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Vi hyller de som tar beslutningene i egne hender. De som ikke venter på at 
            jobber og muligheter skal bli servert, men skaper dem selv.
          </p>
        </div>
      </section>

      {/* Produkt Section */}
      <section 
        className="relative py-24 md:py-32 px-6"
        style={{
          backgroundImage: `url(${bgWarm})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-center mb-16">
            <span className="text-orange-400 text-sm tracking-[0.3em] uppercase mb-4 block">
              ... et produkt
            </span>
          </div>
          
          <div className="space-y-12">
            <p 
              className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-lg md:text-xl text-white/80 leading-relaxed"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              I dag er GIGGEN nettsiden du nå er inne på. Her kan du idag bli kjent med alle 
              i vår fantastiske{" "}
              <Link 
                to="/festival/giggen-sessions#lineup" 
                className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors"
              >
                LINEUP
              </Link>
              , hvor festivalen skal holdes på{" "}
              <Link 
                to="/project/josefines-vertshus" 
                className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors"
              >
                Josefines Vertshus
              </Link>
              {" "}og kjøpe billett til festivalen.
            </p>
            
            <p 
              className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-100 text-lg md:text-xl text-white/80 leading-relaxed"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Alle medvirkende har og fått tilgang til{" "}
              <Link 
                to="/dashboard" 
                className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors"
              >
                backstage
              </Link>
              . Dette er et rom som lar deg kontrollere din egne offentlige visning, 
              knytte kontakter, starte nye band, selge egne billetter, og mer...
            </p>
          </div>
        </div>
      </section>

      {/* Festival Section */}
      <section className="relative py-24 md:py-32 px-6 bg-zinc-950">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
        
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <Link 
            to="/festival/giggen-sessions"
            className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out inline-block group"
          >
            <h2 
              className="text-4xl md:text-6xl font-bold tracking-tight mb-8 group-hover:text-orange-400 transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              GIGGEN festival
            </h2>
          </Link>
          
          <p 
            className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-100 text-lg md:text-xl text-white/80 leading-relaxed"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Festivalen markerer starten på en ny måte å følge band, artister og musikere på. 
            Du skal ikke trenge stipend, priser eller bransjestempel for å fortelle historien din. 
            Og du skal ikke måtte forstå algoritmer eller kjempe om oppmerksomhet i et evig scroll.
          </p>
        </div>
      </section>

      {/* Vi er GIGGEN Section */}
      <section 
        className="relative min-h-[70vh] flex items-center justify-center px-6"
        style={{
          backgroundImage: `url(${bgOrange})`,
          backgroundSize: "cover",
          backgroundPosition: "bottom",
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
        
        <div className="relative z-10 text-center">
          <h2 
            className="reveal-on-scroll opacity-0 scale-95 transition-all duration-1000 ease-out text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            vi er GIGGEN
          </h2>
          
          <p 
            className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 text-xl md:text-2xl text-white/90"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Og vi er klare for å gi musikkbransjen et friskt pust.
          </p>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="relative py-20 md:py-28 px-6 bg-black">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
        
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <p 
            className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-lg md:text-xl text-white/70 leading-relaxed mb-10"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Tror du GIGGEN er noe for deg? Vi vil høre fra deg som engasjerer deg i 
            nyoppstartede prosjekter, jobber på, rundt eller bak en scene, kan noe, 
            er hyggelig, eller bare har lyst til å slå av en prat.
          </p>
          
          <Button 
            asChild
            className="reveal-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-200 bg-orange-500 hover:bg-orange-600 text-white border-0 px-10 py-6 text-lg"
          >
            <a href="mailto:giggen.main@gmail.com">
              <Mail className="w-5 h-5 mr-3" />
              Ta kontakt
            </a>
          </Button>
        </div>
      </section>

      {/* Social Section */}
      <section className="relative py-10 px-6 bg-black">
        <div className="relative z-10 max-w-xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-6">
            Følg oss
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://www.instagram.com/giggenintervjuer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-11 h-11 rounded-full border border-white/10 text-white/40 hover:text-orange-400 hover:border-orange-400/40 transition-all duration-300"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://www.tiktok.com/@giggenintervjuer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-11 h-11 rounded-full border border-white/10 text-white/40 hover:text-orange-400 hover:border-orange-400/40 transition-all duration-300"
              aria-label="TikTok"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@giggentheapp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-11 h-11 rounded-full border border-white/10 text-white/40 hover:text-orange-400 hover:border-orange-400/40 transition-all duration-300"
              aria-label="YouTube"
            >
              <Youtube className="w-5 h-5" />
            </a>
            <a
              href="https://www.facebook.com/people/GIGGENtheapp/61577973511926/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-11 h-11 rounded-full border border-white/10 text-white/40 hover:text-orange-400 hover:border-orange-400/40 transition-all duration-300"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 bg-black border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Link to="/festival/giggen-sessions">
              <img
                src={giggenLogo}
                alt="Giggen"
                className="h-12 md:h-14 w-auto opacity-70 hover:opacity-100 transition-opacity"
              />
            </Link>
          </div>
          
          {/* Mission statement */}
          <p className="text-white/40 text-sm md:text-base max-w-md mx-auto mb-8 leading-relaxed">
            Et engasjement for å løfte frem dem som jobber med eksisterende musikkarenaer, 
            og dem som ønsker å skape nye.
          </p>
          
          {/* Links */}
          <div className="flex items-center justify-center gap-6 text-xs text-white/30">
            <a 
              href="mailto:giggen.main@gmail.com"
              className="hover:text-white/60 transition-colors"
            >
              Kontakt
            </a>
            <Link 
              to="/personvern"
              className="hover:text-white/60 transition-colors"
            >
              Personvern
            </Link>
            <Link 
              to="/vilkar"
              className="hover:text-white/60 transition-colors"
            >
              Vilkår
            </Link>
          </div>
        </div>
      </footer>

      {/* Reveal animation styles */}
      <style>{`
        .reveal-on-scroll.revealed {
          opacity: 1 !important;
          transform: translateY(0) scale(1) !important;
        }
      `}</style>
    </div>
  );
}
