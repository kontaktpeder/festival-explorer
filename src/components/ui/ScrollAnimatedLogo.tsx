import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import giggenLogo from "@/assets/giggen-logo.png";

// Easing function for smoother animation
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function ScrollAnimatedLogo() {
  const [scrollY, setScrollY] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  const location = useLocation();
  const navigate = useNavigate();
  const rafRef = useRef<number | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current !== null) return;
      
      rafRef.current = requestAnimationFrame(() => {
        lastScrollY.current = window.scrollY;
        setScrollY(window.scrollY);
        rafRef.current = null;
      });
    };

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Progress: 0 at top, 1 at 400px scroll with easing
  const rawProgress = Math.min(scrollY / 400, 1);
  const progress = easeOutCubic(rawProgress);

  // Responsive end size: 80px on desktop, 72px on mobile
  const isMobile = windowWidth <= 768;
  const endSize = isMobile ? 72 : 80;

  // Interpolated values
  const startX = 16; // left: 16px
  const endX = windowWidth / 2;
  const startY = 16; // top: 16px
  const endY = 20; // top: 20px (centered header)
  const startSize = 40;

  const currentX = startX + (endX - startX) * progress;
  const currentY = startY + (endY - startY) * progress;
  const currentSize = startSize + (endSize - startSize) * progress;

  // When in center, translate by half width to actually center
  const translateX = progress > 0 ? -currentSize / 2 * progress : 0;

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
    <Link
      to="/"
      onClick={handleClick}
      className="fixed z-50 transition-all duration-300 ease-out"
      style={{
        left: `${currentX}px`,
        top: `${currentY}px`,
        transform: `translateX(${translateX}px)`,
        willChange: "transform, left, top",
      }}
    >
      <img
        src={giggenLogo}
        alt="Giggen"
        className="opacity-90 hover:opacity-100 transition-opacity duration-200"
        style={{
          height: `${currentSize}px`,
          width: "auto",
          willChange: "height",
        }}
      />
    </Link>
  );
}
