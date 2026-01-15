import { useState, useEffect, useRef, RefObject } from "react";

interface ParallaxBackgroundProps {
  imageUrl?: string | null;
  imageUrlMobile?: string | null;
  intensity?: number;
  className?: string;
  containerRef?: RefObject<HTMLElement>;
  imageFitMode?: 'cover' | 'contain';
}

export function ParallaxBackground({
  imageUrl,
  imageUrlMobile,
  intensity = 0.3,
  className = "",
  containerRef,
  imageFitMode = 'cover',
}: ParallaxBackgroundProps) {
  const [parallaxY, setParallaxY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const rafRef = useRef<number | null>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();

    // Disable parallax on mobile for smooth scrolling
    if (window.innerWidth <= 768) {
      window.addEventListener("resize", checkMobile, { passive: true });
      return () => {
        window.removeEventListener("resize", checkMobile);
      };
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
        className={`absolute inset-0 flex ${imageFitMode === 'contain' ? 'items-start' : 'items-center'} justify-center`}
        style={{
          transform: `translateY(${parallaxY}px)`,
          willChange: "transform",
        }}
      >
        <img 
          src={activeImage} 
          alt=""
          className={`w-full h-full ${imageFitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
          style={{ objectPosition: imageFitMode === 'contain' ? 'center top' : 'center center' }}
        />
      </div>
    </div>
  );
}