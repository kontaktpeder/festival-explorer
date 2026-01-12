import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import giggenLogo from "@/assets/giggen-logo.png";

export function ScrollAnimatedLogo() {
  const [scrollY, setScrollY] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Progress: 0 at top, 1 at 400px scroll
  const progress = Math.min(scrollY / 400, 1);

  // Interpolated values
  const startX = 16; // left: 16px
  const endX = typeof window !== "undefined" ? window.innerWidth / 2 : 200;
  const startY = 16; // top: 16px
  const endY = 20; // top: 20px (centered header)
  const startSize = 40;
  const endSize = 56;

  const currentX = startX + (endX - startX) * progress;
  const currentY = startY + (endY - startY) * progress;
  const currentSize = startSize + (endSize - startSize) * progress;

  // When in center, translate by half width to actually center
  const translateX = progress > 0 ? -currentSize / 2 * progress : 0;

  // Show header background when scrolled past 400px
  const showHeader = scrollY > 400;

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

  return (
    <>
      {/* Header background - only visible when scrolled */}
      <div
        className="fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: showHeader ? 1 : 0,
          background: "linear-gradient(to bottom, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.7) 50%, transparent 100%)",
          backdropFilter: showHeader ? "blur(8px)" : "none",
        }}
      />

      {/* Animated logo */}
      <Link
        to="/"
        onClick={handleClick}
        className="fixed z-50 transition-all duration-100 ease-out"
        style={{
          left: `${currentX}px`,
          top: `${currentY}px`,
          transform: `translateX(${translateX}px)`,
        }}
      >
        <img
          src={giggenLogo}
          alt="Giggen"
          className="opacity-90 hover:opacity-100 transition-opacity"
          style={{
            height: `${currentSize}px`,
            width: "auto",
          }}
        />
      </Link>
    </>
  );
}
