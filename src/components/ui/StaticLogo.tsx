import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import giggenLogo from "@/assets/giggen-logo-final.png";

interface StaticLogoProps {
  /** If true, logo starts large and centered (for festival/homepage hero) */
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

  const [isLargeDesktop, setIsLargeDesktop] = useState(false);

  useEffect(() => {
    const checkBreakpoints = () => {
      setIsMobile(window.innerWidth < 768);
      setIsLargeDesktop(window.innerWidth >= 1024);
    };
    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  useEffect(() => {
    // Scroll threshold: 100px for hero mode transition
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
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

  // Calculate logo offset based on scroll (desktop only)
  const [logoOffset, setLogoOffset] = useState(0);
  
  useEffect(() => {
    if (isMobile) return;
    
    const handleLogoScroll = () => {
      // Move logo up as user scrolls, max 60px offset
      const offset = Math.min(window.scrollY * 0.3, 60);
      setLogoOffset(offset);
    };
    
    window.addEventListener('scroll', handleLogoScroll, { passive: true });
    handleLogoScroll();
    return () => window.removeEventListener('scroll', handleLogoScroll);
  }, [isMobile]);

  // ============================================
  // HERO MODE: Two distinct states
  // ============================================
  if (heroMode) {
    // DESKTOP: Always show fixed header with large centered logo
    // MOBILE: Original scroll-based behavior
    
    return (
      <>
        {/* ========== DESKTOP: FIXED HEADER WITH LARGE CENTERED LOGO ========== */}
        {!isMobile && (
          <div
            className="fixed inset-x-0 top-0 z-50"
            style={{
              paddingTop: 'var(--safe-top, 0px)'
            }}
          >
            {/* Background: subtle gradient fade from top */}
            <div 
              className="absolute inset-x-0 pointer-events-none"
              style={{
                top: 'calc(-1 * var(--safe-top, 0px))',
                height: 'calc(100% + var(--safe-top, 0px) + 40px)',
                background: `linear-gradient(
                  to bottom,
                  rgba(0, 0, 0, 0.85) 0%,
                  rgba(0, 0, 0, 0.5) 50%,
                  transparent 100%
                )`
              }}
            />
            
            {/* Content bar */}
            <div className="relative flex items-start justify-between px-6 py-4">
              {/* Left: Backstage link */}
              <Link
                to={session ? "/dashboard" : "/admin/login"}
                className="text-foreground/60 hover:text-foreground font-medium text-xs uppercase tracking-wider transition-colors pt-2"
              >
                Backstage
              </Link>

              {/* Center: Large logo extending beyond header - moves up on scroll */}
              <Link
                to="/"
                onClick={handleClick}
                className="absolute left-1/2 -translate-x-1/2 transition-transform duration-100 ease-out"
                style={{
                  top: isLargeDesktop ? -8 - logoOffset : 4 - logoOffset,
                  transform: `translateX(-50%) scale(${1 - logoOffset * 0.002})`
                }}
              >
                <img 
                  src={giggenLogo} 
                  alt="GIGGEN - festival for en kveld"
                  className="h-40 lg:h-52"
                  style={{
                    filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))'
                  }}
                />
              </Link>

              {/* Right: CTA button */}
              <Link
                to="/tickets"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-full px-5 py-2 text-sm transition-all shadow-lg"
              >
                Kjøp billett
              </Link>
            </div>
          </div>
        )}

        {/* ========== MOBILE: SCROLL-BASED BEHAVIOR ========== */}
        {isMobile && (
          <>
            {/* STATE A: Hero header (before scroll) */}
            <Link
              to="/"
              onClick={handleClick}
              className={`fixed z-50 left-1/2 -translate-x-1/2 transition-all duration-500 ease-out ${
                isScrolled ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
              }`}
              style={{
                top: 'calc(var(--safe-top, 0px) + 24px)'
              }}
            >
              <img 
                src={giggenLogo} 
                alt="GIGGEN - festival for en kveld"
                className="h-32"
                style={{
                  filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))'
                }}
              />
            </Link>

            {/* HERO CTA: Bottom center (before scroll) */}
            <Link
              to="/tickets"
              className={`fixed z-50 left-1/2 -translate-x-1/2 transition-all duration-500 ease-out ${
                isScrolled 
                  ? 'opacity-0 pointer-events-none translate-y-4 scale-90' 
                  : 'opacity-100 translate-y-0 scale-100'
              }`}
              style={{
                bottom: 'calc(var(--safe-bottom, 0px) + 32px)'
              }}
            >
              <span className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-full px-6 py-3 text-sm transition-all shadow-2xl inline-block">
                Kjøp billett
              </span>
            </Link>

            {/* STATE B: STICKY ACTION HEADER (after scroll) */}
            <div
              className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-out ${
                isScrolled 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 -translate-y-full pointer-events-none'
              }`}
              style={{
                paddingTop: 'var(--safe-top, 0px)'
              }}
            >
              {/* Background: subtle gradient fade from top */}
              <div 
                className="absolute inset-x-0 pointer-events-none"
                style={{
                  top: 'calc(-1 * var(--safe-top, 0px))',
                  height: 'calc(100% + var(--safe-top, 0px) + 16px)',
                  background: `linear-gradient(
                    to bottom,
                    rgba(0, 0, 0, 0.85) 0%,
                    rgba(0, 0, 0, 0.6) 30%,
                    rgba(0, 0, 0, 0.25) 70%,
                    transparent 100%
                  )`
                }}
              />
              
              {/* Content */}
              <div className="relative flex items-center justify-between px-3 py-2">
                {/* Left: Small logo */}
                <Link
                  to="/"
                  onClick={handleClick}
                  className="flex-shrink-0"
                >
                  <img 
                    src={giggenLogo} 
                    alt="GIGGEN"
                    className="h-6 drop-shadow-lg"
                  />
                </Link>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  {/* Primary CTA */}
                  <Link
                    to="/tickets"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-full px-3 py-1 text-xs transition-all shadow-lg"
                  >
                    Kjøp billett
                  </Link>
                  
                  {/* Secondary: Backstage */}
                  <Link
                    to={session ? "/dashboard" : "/admin/login"}
                    className="text-foreground/60 hover:text-foreground font-medium text-[10px] uppercase tracking-wider transition-colors"
                  >
                    Backstage
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ============================================
  // NON-HERO MODE: Content pages (artist, event, etc.)
  // Always show compact sticky header
  // ============================================
  return (
    <>
      {/* Compact sticky header for content pages */}
      <div
        className="fixed inset-x-0 top-0 z-50"
        style={{
          paddingTop: 'var(--safe-top, 0px)'
        }}
      >
        {/* Background: matching footer dark gradient */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.9) 0%,
              rgba(0, 0, 0, 0.7) 50%,
              transparent 100%
            )`,
            height: '120%'
          }}
        />
        
        {/* Content */}
        <div className="relative flex items-center justify-between px-4 py-3">
          {/* Left: Small logo */}
          <Link
            to="/"
            onClick={handleClick}
            className="flex-shrink-0"
          >
            <img 
              src={giggenLogo} 
              alt="GIGGEN"
              className="h-8 md:h-10 drop-shadow-lg"
            />
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Primary CTA */}
            <Link
              to="/tickets"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-full px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm transition-all"
            >
              Kjøp billett
            </Link>
            
            {/* Secondary: Backstage */}
            <Link
              to={session ? "/dashboard" : "/admin/login"}
              className="text-foreground/60 hover:text-foreground font-medium text-[10px] md:text-xs uppercase tracking-wider transition-colors"
            >
              Backstage
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
