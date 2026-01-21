import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function StaticLogo() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if user is logged in
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
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

  const showCentered = isMobile && isScrolled;

  return (
    <>
      {/* Solid black bar at very top to cover iPhone notch */}
      <div 
        className={`fixed inset-x-0 z-40 pointer-events-none transition-opacity duration-500 ease-out md:hidden ${
          showCentered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          top: 0,
          height: 'var(--safe-top, 47px)',
          background: 'hsl(var(--background))'
        }}
      />
      
      {/* Gradient fade below the solid bar */}
      <div 
        className={`fixed inset-x-0 z-40 pointer-events-none transition-opacity duration-500 ease-out md:hidden ${
          showCentered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          top: 'var(--safe-top, 47px)',
          height: '100px',
          background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.7) 40%, transparent 100%)'
        }}
      />
      
      {/* Logo - Bold text */}
      <Link
        to="/"
        onClick={handleClick}
        className={`fixed z-50 transition-all duration-500 ease-out ${
          showCentered 
            ? 'left-1/2 -translate-x-1/2' 
            : 'left-4 translate-x-0'
        }`}
        style={{
          top: showCentered 
            ? 'calc(var(--safe-top, 0px) + 12px)' 
            : 'calc(var(--safe-top, 0px) + 16px)'
        }}
      >
        <div className="flex flex-col items-start group">
          {/* Retro frame accent */}
          <div className="absolute -inset-2 border border-[hsl(162_40%_70%_/_0.3)] rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Main logo text - bold condensed retro style */}
          <span 
            className="font-black text-foreground tracking-[0.3em] md:tracking-[0.4em] text-2xl md:text-3xl uppercase transition-all duration-300 group-hover:text-accent relative"
            style={{ 
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              textShadow: '2px 2px 0 hsl(330 100% 60% / 0.2)'
            }}
          >
            GIGGEN
          </span>
          {/* Tagline - retro subtitle */}
          <span className="text-[10px] md:text-xs text-[hsl(162_40%_70%)] font-medium tracking-widest uppercase -mt-0.5">
            en festival for en kveld
          </span>
        </div>
      </Link>

      {/* BACKSTAGE link - top right */}
      <Link
        to={session ? "/dashboard" : "/admin/login"}
        className="fixed z-50 right-4 transition-all duration-500 ease-out"
        style={{
          top: 'calc(var(--safe-top, 0px) + 20px)'
        }}
      >
        <span className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors uppercase tracking-wider">
          BACKSTAGE
        </span>
      </Link>
    </>
  );
}
