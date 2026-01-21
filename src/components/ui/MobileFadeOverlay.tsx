import { useState, useEffect } from "react";

interface MobileFadeOverlayProps {
  className?: string;
  showTop?: boolean;
  showBottom?: boolean;
}

export function MobileFadeOverlay({ 
  className = "", 
  showTop = true, 
  showBottom = true 
}: MobileFadeOverlayProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <>
      {/* Top fade - covers status bar / notch area */}
      {showTop && (
        <div 
          className={`absolute inset-x-0 top-0 pointer-events-none z-[4] ${className}`}
          style={{
            // Use env() for safe area, with fallback
            height: 'calc(env(safe-area-inset-top, 20px) + 60px)',
            background: `linear-gradient(
              to top,
              transparent 0%,
              hsl(var(--background) / 0.6) 50%,
              hsl(var(--background) / 0.95) 100%
            )`,
          }}
        />
      )}
      
      {/* Bottom fade */}
      {showBottom && (
        <div 
          className={`absolute inset-x-0 bottom-0 h-40 pointer-events-none z-[4] ${className}`}
          style={{
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              transparent 20%,
              hsl(240 10% 6% / 0.4) 60%,
              hsl(240 10% 6% / 0.8) 100%
            )`,
          }}
        />
      )}
    </>
  );
}
