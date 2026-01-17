import { ReactNode, useEffect, useState, useRef } from "react";
import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import { ParallaxBackground } from "./ParallaxBackground";
import { MobileFadeOverlay } from "./MobileFadeOverlay";

interface HeroSectionProps {
  imageUrl?: string;
  imageUrlMobile?: string;
  children: ReactNode;
  compact?: boolean;
  fullScreen?: boolean;
  backgroundFixed?: boolean;
  imageFitMode?: 'cover' | 'contain';
  /** Enable scroll-to-expand effect where image grows and text fades on overscroll */
  scrollExpand?: boolean;
}

export function HeroSection({ 
  imageUrl, 
  imageUrlMobile,
  children, 
  compact, 
  fullScreen,
  backgroundFixed = false,
  imageFitMode = 'cover',
  scrollExpand = false
}: HeroSectionProps) {
  const [overscrollProgress, setOverscrollProgress] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollExpand) return;

    const handleScroll = () => {
      // Detect overscroll at top of page (negative scroll or near top)
      const scrollY = window.scrollY;
      
      // When at top and trying to scroll up further, or just at top
      if (scrollY <= 0) {
        // Use touch overscroll or just being at top
        setOverscrollProgress(Math.min(1, Math.abs(scrollY) / 100));
      } else if (scrollY < 50) {
        // Slight effect when near top
        setOverscrollProgress(Math.max(0, 1 - scrollY / 50));
      } else {
        setOverscrollProgress(0);
      }
    };

    // Touch handling for overscroll effect
    let touchStartY = 0;
    let currentOverscroll = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        const touchY = e.touches[0].clientY;
        const diff = touchY - touchStartY;
        if (diff > 0) {
          currentOverscroll = Math.min(1, diff / 150);
          setOverscrollProgress(currentOverscroll);
        }
      }
    };

    const handleTouchEnd = () => {
      // Animate back
      setOverscrollProgress(0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollExpand]);

  const baseHeight = fullScreen 
    ? "min-h-screen" 
    : compact 
      ? "min-h-[45vh]" 
      : "min-h-[60vh]";

  const activeImage = useResponsiveImage({
    desktopUrl: imageUrl,
    mobileUrl: imageUrlMobile,
    fallbackUrl: imageUrl,
  });

  // For scroll expand: image scales up, text fades out on overscroll UP
  const imageScale = scrollExpand ? 1 + overscrollProgress * 0.2 : 1;
  const textOpacity = scrollExpand ? 1 - overscrollProgress * 1.2 : 1;

  return (
    <div 
      ref={heroRef}
      className={`cosmic-hero relative ${baseHeight}`}
    >
      {activeImage && (
        backgroundFixed ? (
          <ParallaxBackground
            imageUrl={imageUrl}
            imageUrlMobile={imageUrlMobile}
            intensity={0.3}
            imageFitMode={imageFitMode}
          />
        ) : (
          <div
            className="absolute inset-0 bg-no-repeat bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${activeImage})`,
              transform: scrollExpand ? `scale(${imageScale})` : undefined,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out'
            }}
          />
        )
      )}
      
      {/* Gradient overlay - bottom edge for text legibility */}
      <div 
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ 
          background: 'linear-gradient(to top, hsl(240 10% 6% / 0.85) 0%, hsl(240 10% 6% / 0.2) 40%, transparent 70%)'
        }}
      />
      
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{ 
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(240 10% 6% / 0.4) 100%)',
          opacity: scrollExpand ? 1 - overscrollProgress * 0.7 : 1
        }}
      />
      
      {/* Mobile fade overlay */}
      <MobileFadeOverlay />
      
      {/* Content - fixed at very bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-4"
        style={scrollExpand ? { 
          opacity: Math.max(0, textOpacity),
          transition: 'opacity 0.15s ease-out'
        } : undefined}
      >
        <div className="max-w-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
