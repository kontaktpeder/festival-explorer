import { useState, useEffect } from "react";

interface MobileFadeOverlayProps {
  className?: string;
}

/**
 * MobileFadeOverlay - bottom gradient only
 * Top fade is handled by StaticLogo component which shows on scroll
 */
export function MobileFadeOverlay({ className = "" }: MobileFadeOverlayProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
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
  );
}
