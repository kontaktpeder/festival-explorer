import { Link } from "react-router-dom";
import giggenLogo from "@/assets/giggen-logo-outline.png";

export function FestivalFooter() {
  return (
    <footer className="relative py-16 px-6 bg-black">
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={giggenLogo}
            alt="Giggen"
            className="h-10 md:h-12 w-auto opacity-60"
          />
        </div>
        
        {/* Mission statement */}
        <p className="text-white/35 text-sm max-w-sm mx-auto mb-10 leading-relaxed">
          Et engasjement for å løfte frem dem som jobber med eksisterende musikkarenaer, 
          og dem som ønsker å skape nye.
        </p>
        
        {/* Links */}
        <div className="flex flex-col items-center gap-6">
          {/* Primary links */}
          <div className="flex items-center justify-center gap-8 text-xs text-white/40">
            <Link to="/festival" className="hover:text-white/70 transition-colors">
              Festival
            </Link>
            <Link to="/utforsk" className="hover:text-white/70 transition-colors">
              Utforsk
            </Link>
            <Link to="/om-giggen" className="hover:text-white/70 transition-colors">
              Om GIGGEN
            </Link>
            <Link to="/request-access" className="hover:text-white/70 transition-colors">
              Be om tilgang
            </Link>
          </div>

          {/* Secondary links */}
          <div className="flex items-center justify-center gap-6 text-[11px] text-white/20">
            <Link to="/personvern" className="hover:text-white/40 transition-colors">
              Personvern
            </Link>
            <Link to="/vilkar" className="hover:text-white/40 transition-colors">
              Vilkår
            </Link>
          </div>
        </div>
        
        {/* Copyright */}
        <p className="mt-10 text-[10px] text-white/15">
          © 2025 GIGGEN
        </p>
      </div>
    </footer>
  );
}
