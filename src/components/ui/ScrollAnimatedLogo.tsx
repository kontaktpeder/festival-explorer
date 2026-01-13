import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import giggenLogo from "@/assets/giggen-logo.png";

export function ScrollAnimatedLogo() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      // Two discrete positions: corner when < 200px, center when >= 200px
      setIsScrolled(window.scrollY >= 200);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    
    // Initial check
    handleScroll();
    handleResize();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // If already on home/festival page, scroll to top
    if (location.pathname === "/" || location.pathname.startsWith("/festival/")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Navigate to home and scroll to top
      navigate("/");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  }, [location.pathname, navigate]);

  // Center size: 150px on both desktop and mobile
  const centerSize = 150;

  return (
    <Link
      to="/"
      onClick={handleClick}
      className="fixed z-50"
      style={isScrolled ? {
        left: "50%",
        top: "20px",
        transform: "translateX(-50%)",
      } : {
        left: "16px",
        top: "16px",
        transform: "none",
      }}
    >
      <img
        src={giggenLogo}
        alt="Giggen"
        className="opacity-90 hover:opacity-100"
        style={{
          height: isScrolled ? `${centerSize}px` : "40px",
          width: "auto",
        }}
      />
    </Link>
  );
}