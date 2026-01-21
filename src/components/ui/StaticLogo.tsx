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
      {/* Fixed fade behind logo - always visible on mobile to keep logo readable */}
      <div 
        className="fixed inset-x-0 z-40 pointer-events-none md:hidden"
        style={{
          top: 0,
          height: 'calc(var(--safe-top, 47px) + 70px)',
          background: `linear-gradient(
            to bottom, 
            hsl(var(--background)) 0%,
            hsl(var(--background) / 0.9) 40%,
            hsl(var(--background) / 0.5) 70%,
            transparent 100%
          )`,
        }}
      />
      
      {/* Logo - Bold text with orange accent */}
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
          {/* Main logo text - bolder with orange underline accent */}
          <span 
            className={`font-black text-foreground uppercase transition-all duration-300 group-hover:text-accent relative ${
              showCentered 
                ? 'text-xl tracking-[0.25em]' 
                : 'text-2xl md:text-3xl tracking-[0.3em] md:tracking-[0.4em]'
            }`}
            style={{ 
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              textShadow: '3px 3px 0 hsl(24 100% 55% / 0.3), -1px -1px 0 hsl(330 100% 60% / 0.15)'
            }}
          >
            GIGGEN
            {/* Orange accent dot */}
            <span 
              className="absolute -right-2 top-0 w-1.5 h-1.5 rounded-full"
              style={{ background: 'hsl(24 100% 55%)' }}
            />
          </span>
          {/* Tagline - updated text */}
          <span className={`text-[hsl(24_100%_55%_/_0.8)] font-medium tracking-widest uppercase transition-all duration-300 ${
            showCentered ? 'text-[8px] -mt-0.5' : 'text-[10px] md:text-xs -mt-0.5'
          }`}>
            festival for en kveld
          </span>
        </div>
      </Link>

      {/* BACKSTAGE link - top right, smaller when logo is centered */}
      <Link
        to={session ? "/dashboard" : "/admin/login"}
        className={`fixed z-50 right-4 transition-all duration-500 ease-out ${
          showCentered ? 'opacity-70' : 'opacity-100'
        }`}
        style={{
          top: showCentered 
            ? 'calc(var(--safe-top, 0px) + 16px)' 
            : 'calc(var(--safe-top, 0px) + 20px)'
        }}
      >
        <span className={`font-medium text-foreground/80 hover:text-accent transition-colors uppercase tracking-wider ${
          showCentered ? 'text-[10px]' : 'text-sm'
        }`}>
          BACKSTAGE
        </span>
      </Link>
    </>
  );
}
