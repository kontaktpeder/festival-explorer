import { useState, useEffect, useRef, RefObject } from "react";

interface ParallaxBackgroundProps {
  imageUrl?: string | null;
  imageUrlMobile?: string | null;
  intensity?: number;
  className?: string;
  containerRef?: RefObject<HTMLElement>;
}

export function ParallaxBackground({
  imageUrl,
  imageUrlMobile,
  intensity = 0.3,
  className = "",
  containerRef,
}: ParallaxBackgroundProps) {
  const [parallaxY, setParallaxY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const rafRef = useRef<number | null>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();

    const handleScroll = () => {
      if (rafRef.current !== null) return;
      
      rafRef.current = requestAnimationFrame(() => {
        const container = containerRef?.current || internalContainerRef.current?.parentElement;
        if (!container) {
          rafRef.current = null;
          return;
        }

        const rect = container.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Calculate how far the section is from center of viewport
        // When section enters viewport from bottom, offset is positive
        // When section leaves viewport from top, offset is negative
        const sectionCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportHeight / 2;
        const distanceFromCenter = viewportCenter - sectionCenter;
        
        // Only apply parallax when section is visible
        if (rect.bottom > 0 && rect.top < viewportHeight) {
          // Limit the parallax effect to prevent image moving too much
          const maxOffset = rect.height * intensity;
          const offset = Math.max(-maxOffset, Math.min(maxOffset, distanceFromCenter * intensity));
          setParallaxY(offset);
        }
        
        rafRef.current = null;
      });
    };

    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    
    // Initial calculation
    handleScroll();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [containerRef, intensity]);

  // Choose image based on device
  const activeImage = isMobile 
    ? (imageUrlMobile || imageUrl) 
    : (imageUrl || imageUrlMobile);

  if (!activeImage) return null;

  return (
    <div 
      ref={internalContainerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${activeImage})`,
          transform: `translateY(${parallaxY}px) scale(1.2)`,
          willChange: "transform",
        }}
      />
    </div>
  );
}