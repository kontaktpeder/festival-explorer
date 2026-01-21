import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function ScrollAnimatedLogo() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY >= 200);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    
    handleScroll();
    handleResize();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (location.pathname === "/" || location.pathname.startsWith("/festival/")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  }, [location.pathname, navigate]);

  return (
    <Link
      to="/"
      onClick={handleClick}
      className="fixed z-50 transition-all duration-500 ease-out"
      style={isScrolled ? {
        left: "50%",
        top: isMobile ? "12px" : "16px",
        transform: "translateX(-50%)",
      } : {
        left: "16px",
        top: isMobile ? "12px" : "16px",
        transform: "none",
      }}
    >
      <div className="flex flex-col items-start group">
        {/* Main logo text - spaced letters */}
        <span 
          className={`font-black text-foreground uppercase transition-all duration-500 group-hover:text-accent ${
            isScrolled 
              ? 'text-2xl md:text-4xl tracking-[0.5em] md:tracking-[0.6em]' 
              : 'text-xl md:text-2xl tracking-[0.4em] md:tracking-[0.5em]'
          }`}
        >
          GIGGEN
        </span>
        {/* Tagline - shows when not scrolled or on mobile */}
        <span 
          className={`text-muted-foreground/80 font-medium tracking-wide transition-all duration-500 ${
            isScrolled && !isMobile 
              ? 'opacity-0 h-0 -mt-2' 
              : 'opacity-100 text-[10px] md:text-xs -mt-0.5'
          }`}
        >
          – en festival for en kveld
        </span>
      </div>
    </Link>
  );
}