import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import giggenLogo from "@/assets/giggen-logo-new.png";

export function StaticLogo() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      {/* Solid black bar at very top to cover iPhone notch - always visible on mobile when scrolled */}
      <div 
        className={`fixed inset-x-0 z-40 pointer-events-none transition-opacity duration-500 ease-out md:hidden ${
          showCentered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          top: '-60px',
          height: 'calc(env(safe-area-inset-top, 47px) + 60px)',
          background: 'hsl(240 10% 6% / 1)'
        }}
      />
      
      {/* Gradient fade below the solid bar */}
      <div 
        className={`fixed inset-x-0 z-40 pointer-events-none transition-opacity duration-500 ease-out md:hidden ${
          showCentered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          top: 'env(safe-area-inset-top, 47px)',
          height: '120px',
          background: 'linear-gradient(to bottom, hsl(240 10% 6% / 1) 0%, hsl(240 10% 6% / 0.85) 30%, hsl(240 10% 6% / 0.5) 60%, transparent 100%)'
        }}
      />
      
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
            ? 'calc(env(safe-area-inset-top, 0px) + 4px)' 
            : 'calc(env(safe-area-inset-top, 0px) + 4px)'
        }}
      >
        <img
          src={giggenLogo}
          alt="Giggen"
          className={`w-auto opacity-90 hover:opacity-100 transition-all duration-500 ${
            showCentered ? 'h-24' : 'h-24'
          }`}
        />
      </Link>
    </>
  );
}
