import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import giggenLogo from "@/assets/giggen-logo-final.png";

interface StaticLogoProps {
  /** If true, logo is always centered and larger (for homepage hero) */
  heroMode?: boolean;
}

export function StaticLogo({ heroMode = false }: StaticLogoProps) {
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

  // Header fade gradient - always visible
  const HeaderFade = () => (
    <div 
      className="fixed inset-x-0 top-0 z-40 pointer-events-none"
      style={{
        height: 'calc(var(--safe-top, 0px) + 80px)',
        background: `linear-gradient(
          to bottom,
          hsl(var(--background)) 0%,
          hsl(var(--background) / 0.9) 30%,
          hsl(var(--background) / 0.6) 60%,
          transparent 100%
        )`,
      }}
    />
  );

  // Festival CTA button
  const FestivalCTA = ({ small = false }: { small?: boolean }) => (
    <Link
      to="/tickets"
      className={`bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-full transition-all ${
        small 
          ? 'px-3 py-1 text-xs' 
          : 'px-4 py-1.5 text-sm'
      }`}
    >
      Kjøp billett
    </Link>
  );

  // Hero mode: centered, very large at top, shrinks on scroll
  if (heroMode) {
    return (
      <>
        <HeaderFade />
        
        {/* Left side: CTA */}
        <div
          className="fixed z-50 left-3 md:left-4 transition-all duration-300"
          style={{
            top: 'calc(var(--safe-top, 0px) + 12px)'
          }}
        >
          <FestivalCTA small={isMobile && isScrolled} />
        </div>
        
        {/* Center: Logo */}
        <Link
          to="/"
          onClick={handleClick}
          className="fixed z-50 left-1/2 -translate-x-1/2 transition-all duration-500 ease-out"
          style={{
            top: isScrolled 
              ? 'calc(var(--safe-top, 0px) + 8px)' 
              : 'calc(var(--safe-top, 0px) + 16px)'
          }}
        >
          {/* Fade cloud behind logo */}
          <div 
            className={`absolute rounded-full blur-3xl transition-all duration-500 ${
              isScrolled 
                ? 'inset-0 -inset-x-4 -inset-y-2 opacity-80' 
                : 'inset-0 -inset-x-12 -inset-y-6 opacity-60'
            }`}
            style={{ background: 'radial-gradient(ellipse, hsl(var(--background)) 0%, transparent 70%)' }}
          />
          <img 
            src={giggenLogo} 
            alt="GIGGEN - festival for en kveld"
            className={`relative drop-shadow-2xl transition-all duration-500 ${
              isScrolled 
                ? 'h-12 md:h-16' 
                : 'h-28 md:h-40 lg:h-48'
            }`}
          />
        </Link>

        {/* Right side: BACKSTAGE */}
        <Link
          to={session ? "/dashboard" : "/admin/login"}
          className="fixed z-50 right-3 md:right-4 transition-all duration-300"
          style={{
            top: 'calc(var(--safe-top, 0px) + 14px)'
          }}
        >
          <span className="font-semibold text-foreground/70 hover:text-accent transition-colors uppercase tracking-wider text-sm md:text-base">
            BACKSTAGE
          </span>
        </Link>
      </>
    );
  }

  const showCentered = isMobile && isScrolled;

  return (
    <>
      <HeaderFade />
      
      {/* Left side: CTA */}
      <div
        className={`fixed z-50 left-4 transition-all duration-500 ease-out ${
          showCentered ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          top: 'calc(var(--safe-top, 0px) + 14px)'
        }}
      >
        <FestivalCTA small={isMobile} />
      </div>
      
      {/* Logo */}
      <Link
        to="/"
        onClick={handleClick}
        className={`fixed z-50 transition-all duration-500 ease-out ${
          showCentered 
            ? 'left-1/2 -translate-x-1/2' 
            : 'left-1/2 -translate-x-1/2'
        }`}
        style={{
          top: showCentered 
            ? 'calc(var(--safe-top, 0px) + 12px)' 
            : 'calc(var(--safe-top, 0px) + 16px)'
        }}
      >
        <img 
          src={giggenLogo} 
          alt="GIGGEN - festival for en kveld"
          className={`transition-all duration-300 drop-shadow-lg ${
            showCentered 
              ? 'h-10' 
              : 'h-12 md:h-16'
          }`}
        />
      </Link>

      {/* Right side: BACKSTAGE */}
      <Link
        to={session ? "/dashboard" : "/admin/login"}
        className={`fixed z-50 right-4 transition-all duration-500 ease-out ${
          showCentered ? 'opacity-80' : 'opacity-100'
        }`}
        style={{
          top: showCentered 
            ? 'calc(var(--safe-top, 0px) + 14px)' 
            : 'calc(var(--safe-top, 0px) + 18px)'
        }}
      >
        <span className={`font-semibold text-foreground/70 hover:text-accent transition-colors uppercase tracking-wider ${
          showCentered ? 'text-[11px]' : 'text-sm md:text-base'
        }`}>
          BACKSTAGE
        </span>
      </Link>
    </>
  );
}
