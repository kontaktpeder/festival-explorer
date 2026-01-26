import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import giggenLogo from "@/assets/giggen-logo-final.png";

export function ScrollAnimatedLogo() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const location = useLocation();
  const navigate = useNavigate();

  // Check route type
  const isHomePage = location.pathname === "/" || location.pathname.startsWith("/festival/");
  const isContentPage = location.pathname.startsWith("/project/") || 
                        location.pathname.startsWith("/event/") || 
                        location.pathname.startsWith("/venue/") ||
                        location.pathname.startsWith("/p/");

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

  // Logo sizing based on route type - smaller on mobile for content pages
  const getLogoClasses = () => {
    if (isContentPage) {
      // Tiny logo on content pages - match BACKSTAGE text scale
      return 'h-2.5 md:h-4';
    }
    if (!isHomePage) {
      // Small logo on other pages
      return 'h-4 md:h-5';
    }
    // Original sizes for homepage/festival
    return isScrolled ? 'h-14 md:h-20' : 'h-12 md:h-16';
  };

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
      <img 
        src={giggenLogo} 
        alt="GIGGEN - festival for en kveld"
        className={`transition-all duration-500 drop-shadow-lg ${getLogoClasses()}`}
      />
    </Link>
  );
}