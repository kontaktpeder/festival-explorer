import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import giggenLogo from "@/assets/giggen-logo-final.png";

/** Smart bottom CTA that hides on scroll-down, shows on scroll-up */
function SmartBottomCta() {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current + 8) {
        setVisible(false); // scrolling down
      } else if (currentY < lastScrollY.current - 4) {
        setVisible(true); // scrolling up
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center items-center gap-3 pointer-events-none transition-all duration-300"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      <Link
        to="/tickets"
        className="pointer-events-auto bg-accent text-accent-foreground font-black rounded-full px-5 py-2.5 text-sm shadow-lg"
      >
        Kjøp festivalpass
      </Link>
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("giggen:open-lineup"));
          document.getElementById("lineup")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="pointer-events-auto font-bold text-xs uppercase tracking-wider text-foreground/80 hover:text-accent transition-colors py-2.5 px-3"
      >
        Se lineup
      </button>
    </div>
  );
}

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
        {/* ========== DESKTOP: FIXED HEADER – no large center logo ========== */}
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
            <div className="relative flex items-center justify-between px-6 py-4">
              {/* Left: Logo (compact) */}
              <Link
                to="/"
                onClick={handleClick}
                className="flex-shrink-0"
              >
                <img 
                  src={giggenLogo} 
                  alt="GIGGEN"
                  className="h-10 lg:h-12 drop-shadow-lg"
                />
              </Link>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <Link
                  to="/festival/program"
                  className="text-foreground/60 hover:text-foreground font-bold text-sm uppercase tracking-wider transition-colors"
                >
                  Program
                </Link>
                <Link
                  to={session ? "/dashboard" : "/admin/login"}
                  className="text-foreground/60 hover:text-foreground font-bold text-sm uppercase tracking-wider transition-colors"
                >
                  Backstage
                </Link>
                <Link
                  to="/tickets"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-7 py-3 text-base transition-all shadow-lg"
                >
                  Kjøp festivalpass
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ========== MOBILE: STICKY HEADER + LARGE FADING LOGO + BOTTOM CTA ========== */}
        {isMobile && (
          <>
            {/* ALWAYS VISIBLE: Sticky header bar (no CTA - it's at bottom) */}
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
                {/* Left: Small Logo (always visible) */}
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

                {/* Right: Program + Backstage */}
                <div className="flex items-center gap-3">
                  <Link
                    to="/festival/program"
                    className="text-foreground/60 font-bold text-xs uppercase tracking-wider"
                  >
                    Program
                  </Link>
                  <Link
                    to={session ? "/dashboard" : "/admin/login"}
                    className="text-foreground/60 font-bold text-xs uppercase tracking-wider"
                  >
                    Backstage
                  </Link>
                </div>
              </div>
            </div>



            {/* ALWAYS VISIBLE: Fixed bottom CTA – ticket + Se lineup, smart hide on scroll */}
            <SmartBottomCta />
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

          {/* Right: Actions - CTA only on desktop, Backstage always */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Primary CTA - desktop only */}
            <Link
              to="/tickets"
              className="hidden md:block bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-full px-7 py-3 text-base transition-all"
            >
              Kjøp festivalpass
            </Link>
            
            {/* Secondary: Backstage */}
            <Link
              to={session ? "/dashboard" : "/admin/login"}
              className="text-foreground/60 hover:text-foreground font-bold text-xs md:text-sm uppercase tracking-wider transition-colors"
            >
              Backstage
            </Link>
          </div>
        </div>
      </div>
      
      {/* Mobile: Fixed bottom CTA button - positioned above Safari UI zone */}
      {isMobile && (
        <div
          className="fixed inset-x-0 z-50 flex justify-center pointer-events-none"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)'
          }}
        >
          <Link
            to="/tickets"
            className="pointer-events-auto bg-accent text-accent-foreground font-black rounded-full px-6 py-3 text-sm shadow-lg"
          >
            Kjøp festivalpass
          </Link>
        </div>
      )}
    </>
  );
}
