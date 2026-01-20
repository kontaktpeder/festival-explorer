import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import giggenLogo from "@/assets/giggen-logo-new.png";

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
      // Trigger centered logo a bit later for smoother transition
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
          background: 'hsl(240 10% 6% / 1)'
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
          background: 'linear-gradient(to bottom, hsl(240 10% 6% / 1) 0%, hsl(240 10% 6% / 0.7) 40%, transparent 100%)'
        }}
      />
      
      {/* Logo */}
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
            ? 'calc(var(--safe-top, 0px) + 8px)' 
            : 'calc(var(--safe-top, 0px) + 8px)'
        }}
      >
        <img
          src={giggenLogo}
          alt="Giggen"
          className="h-24 w-auto opacity-90 hover:opacity-100 transition-all duration-500"
        />
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
