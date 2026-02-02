import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import giggenLogo from "@/assets/giggen-logo-outline.png";

export function FestivalFooter() {
  return (
    <footer className="relative py-12 px-6 bg-black border-t border-white/5">
      <div className="max-w-3xl mx-auto text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={giggenLogo}
            alt="Giggen"
            className="h-12 md:h-14 w-auto opacity-70"
          />
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
          <Link 
            to="/admin" 
            className="text-white/10 hover:text-white/30 transition-colors"
            title="Admin"
          >
            <Settings className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
