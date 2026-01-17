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
      setIsScrolled(window.scrollY > 50);
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
      {/* Background fade for centered logo on mobile */}
      {showCentered && (
        <div 
          className="fixed inset-x-0 top-0 h-24 z-40 pointer-events-none transition-opacity duration-300"
          style={{
            background: 'linear-gradient(to bottom, hsl(240 10% 6% / 0.8) 0%, hsl(240 10% 6% / 0.4) 60%, transparent 100%)'
          }}
        />
      )}
      
      <Link
        to="/"
        onClick={handleClick}
        className={`fixed z-50 transition-all duration-300 ease-out ${
          showCentered 
            ? 'left-1/2 -translate-x-1/2 top-3' 
            : 'left-4 top-2 translate-x-0'
        }`}
      >
        <img
          src={giggenLogo}
          alt="Giggen"
          className={`w-auto opacity-90 hover:opacity-100 transition-all duration-300 ${
            showCentered ? 'h-14' : 'h-20'
          }`}
        />
      </Link>
    </>
  );
}
