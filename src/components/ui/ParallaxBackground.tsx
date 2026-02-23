import { useState, useEffect, useRef, RefObject } from "react";

interface ParallaxBackgroundProps {
  imageUrl?: string | null;
  imageUrlMobile?: string | null;
  intensity?: number;
  className?: string;
  containerRef?: RefObject<HTMLElement>;
  imageFitMode?: 'cover' | 'contain';
  isAnimated?: boolean;
}

/**
 * ParallaxBackground - GPU-optimized parallax effect
 * Completely disabled on mobile for smoother scrolling (especially in Instagram/Chrome in-app browsers)
 */
export function ParallaxBackground({
  imageUrl,
  imageUrlMobile,
  intensity = 0.3,
  className = "",
  containerRef,
  imageFitMode = 'cover',
  isAnimated = false,
}: ParallaxBackgroundProps) {
  const [parallaxY, setParallaxY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const rafRef = useRef<number | null>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();

    // Completely disable parallax on mobile for smooth scrolling
    // Instagram and Chrome in-app browsers struggle with scroll-based transforms
    if (window.innerWidth <= 768) {
      window.addEventListener("resize", checkMobile, { passive: true });
      return () => window.removeEventListener("resize", checkMobile);
    }

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
        
        const sectionCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportHeight / 2;
        const distanceFromCenter = viewportCenter - sectionCenter;
        
        if (rect.bottom > 0 && rect.top < viewportHeight) {
          const animatedReduction = isAnimated ? 0.7 : 1;
          const effectiveIntensity = intensity * animatedReduction;
          const maxOffset = rect.height * effectiveIntensity;
          const offset = Math.max(-maxOffset, Math.min(maxOffset, distanceFromCenter * effectiveIntensity));
          setParallaxY(offset);
        }
        
        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", checkMobile, { passive: true });
    
    handleScroll();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkMobile);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [containerRef, intensity, isAnimated]);

  // Choose image based on device
  const activeImage = isMobile 
    ? (imageUrlMobile || imageUrl) 
    : (imageUrl || imageUrlMobile);

  if (!activeImage) return null;

  return (
    <div 
      ref={internalContainerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ 
        contain: 'layout style paint',
        // Force GPU layer for smoother rendering
        transform: 'translateZ(0)',
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          // On mobile: no transform, just static image for smooth scrolling
          // On desktop: apply parallax transform
          transform: isMobile ? 'translate3d(0, 0, 0)' : `translate3d(0, ${parallaxY}px, 0)`,
          // Only animate transform on desktop
          willChange: isMobile ? 'auto' : 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <img 
          src={activeImage} 
          alt=""
          loading="eager"
          decoding="async"
          className={`w-full h-full ${imageFitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
          style={{ 
            objectPosition: imageFitMode === 'contain' ? 'center top' : 'center center',
            transform: 'translateZ(0)',
            imageRendering: isAnimated ? 'auto' : undefined,
          }}
        />
      </div>
    </div>
  );
}