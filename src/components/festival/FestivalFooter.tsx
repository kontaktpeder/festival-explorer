import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import giggenLogo from "@/assets/giggen-logo.png";

export function FestivalFooter() {
  return (
    <footer className="relative py-16 px-6 bg-black border-t border-white/5">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={giggenLogo}
            alt="Giggen"
            className="h-16 md:h-20 w-auto opacity-80"
          />
        </div>
        
        {/* Mission statement */}
        <p className="text-center text-muted-foreground text-sm md:text-base max-w-lg mx-auto mb-10 leading-relaxed">
          Et engasjement for å løfte frem dem som jobber med eksisterende musikkarenaer, 
          og dem som ønsker å skape nye.
        </p>
        
        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground/60 mb-10">
          <a 
            href="mailto:hei@giggen.app"
            className="hover:text-white transition-colors"
          >
            Kontakt
          </a>
          <Link 
            to="/personvern"
            className="hover:text-white transition-colors"
          >
            Personvern
          </Link>
          <Link 
            to="/vilkar"
            className="hover:text-white transition-colors"
          >
            Vilkår
          </Link>
        </div>
        
        {/* Admin link */}
        <div className="flex justify-center">
          <Link 
            to="/admin" 
            className="text-muted-foreground/20 hover:text-muted-foreground/40 transition-colors"
            title="Admin"
          >
            <Settings className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
