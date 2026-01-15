import { useState, useEffect, useRef, RefObject } from "react";

interface ParallaxBackgroundProps {
  imageUrl?: string | null;
  imageUrlMobile?: string | null;
  intensity?: number;
  className?: string;
  containerRef?: RefObject<HTMLElement>;
  imageFitMode?: 'cover' | 'contain';
  isAnimated?: boolean; // For GIFs and animated images
}

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
          // Reduce intensity on mobile for smoother performance
          // Also reduce for animated images to prevent jitter
          const mobileReduction = window.innerWidth <= 768 ? 0.5 : 1;
          const animatedReduction = isAnimated ? 0.7 : 1;
          const effectiveIntensity = intensity * mobileReduction * animatedReduction;
          const maxOffset = rect.height * effectiveIntensity;
          const offset = Math.max(-maxOffset, Math.min(maxOffset, distanceFromCenter * effectiveIntensity));
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
    
    handleScroll();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
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
      style={{ contain: 'layout style paint' }}
    >
      <div
        className={`absolute inset-0 flex ${imageFitMode === 'contain' ? 'items-start' : 'items-center'} justify-center`}
        style={{
          transform: `translate3d(0, ${parallaxY}px, 0)`,
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
      >
        <img 
          src={activeImage} 
          alt=""
          className={`w-full h-full ${imageFitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
          style={{ 
            objectPosition: imageFitMode === 'contain' ? 'center top' : 'center center',
            transform: 'translateZ(0)',
            // Ensure GIF animations are not paused
            imageRendering: isAnimated ? 'auto' : undefined,
          }}
        />
      </div>
    </div>
  );
}