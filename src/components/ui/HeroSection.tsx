import { ReactNode, useEffect, useState, useRef } from "react";
import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import { ParallaxBackground } from "./ParallaxBackground";
import { MobileFadeOverlay } from "./MobileFadeOverlay";
import { getObjectPositionFromFocal } from "@/lib/image-crop-helpers";
import type { ImageSettings } from "@/types/database";

interface HeroSectionProps {
  imageUrl?: string;
  imageUrlMobile?: string;
  /** Image crop/focal point settings from DB */
  imageSettings?: ImageSettings | unknown | null;
  children: ReactNode;
  compact?: boolean;
  fullScreen?: boolean;
  backgroundFixed?: boolean;
  imageFitMode?: 'cover' | 'contain';
  /** Enable scroll-to-expand effect where image grows and text fades on overscroll */
  scrollExpand?: boolean;
}

/**
 * HeroSection - displays hero image with focal point positioning
 * Uses imageSettings for object-position when available
 */
export function HeroSection({ 
  imageUrl, 
  imageUrlMobile,
  imageSettings,
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

    // Touch handling for overscroll effect only
    let touchStartY = 0;
    let isAtTop = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      isAtTop = window.scrollY <= 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop) return;
      
      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY;
      
      // Only trigger when pulling down at top of page
      if (diff > 0 && window.scrollY <= 0) {
        // More aggressive scaling - faster response
        const progress = Math.min(1, diff / 80);
        setOverscrollProgress(progress);
      }
    };

    const handleTouchEnd = () => {
      // Animate back smoothly
      setOverscrollProgress(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
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

  // More dramatic scaling and faster text fade
  const imageScale = scrollExpand ? 1 + overscrollProgress * 0.35 : 1;
  const textOpacity = scrollExpand ? 1 - overscrollProgress * 2.5 : 1;

  return (
    <div 
      ref={heroRef}
      className={`cosmic-hero relative ${baseHeight}`}
      style={{
        // Extend hero into safe-area on mobile
        marginTop: 'calc(-1 * var(--safe-top, 0px))',
        paddingTop: 'var(--safe-top, 0px)',
      }}
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
            className="absolute inset-0 bg-no-repeat bg-cover will-change-transform"
            style={{ 
              backgroundImage: `url(${activeImage})`,
              backgroundPosition: getObjectPositionFromFocal(imageSettings),
              transform: `scale(${imageScale})`,
              transformOrigin: 'center center',
              transition: overscrollProgress === 0 ? 'transform 0.3s ease-out' : 'none',
              // Extend image into safe-area
              top: 'calc(-1 * var(--safe-top, 0px))',
            }}
          />
        )
      )}
      
      {/* Top fade - scrolls with hero like a roller blind, extends far down */}
      <div 
        className="absolute inset-x-0 pointer-events-none z-[3] md:hidden"
        style={{ 
          top: 'calc(-1 * var(--safe-top, 0px))',
          height: '60vh',
          background: `linear-gradient(
            to bottom, 
            hsl(var(--background)) 0%,
            hsl(var(--background) / 0.95) 10%,
            hsl(var(--background) / 0.7) 25%,
            hsl(var(--background) / 0.4) 45%,
            hsl(var(--background) / 0.15) 65%,
            transparent 100%
          )`,
        }}
      />
      
      {/* Gradient overlay - fades out with overscroll to reveal image */}
      <div 
        className="absolute inset-0 pointer-events-none z-[1] transition-opacity duration-150"
        style={{ 
          background: 'linear-gradient(to top, hsl(240 10% 6% / 0.85) 0%, hsl(240 10% 6% / 0.2) 40%, transparent 70%)',
          opacity: 1 - overscrollProgress * 0.8
        }}
      />
      
      {/* Vignette overlay - fades out with overscroll */}
      <div 
        className="absolute inset-0 pointer-events-none z-[2] transition-opacity duration-150"
        style={{ 
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(240 10% 6% / 0.4) 100%)',
          opacity: 1 - overscrollProgress
        }}
      />
      
      {/* Mobile fade overlay (bottom) */}
      <MobileFadeOverlay />
      
      {/* Content - fixed at very bottom, fades quickly */}
      <div 
        className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-4"
        style={{ 
          opacity: Math.max(0, textOpacity),
          transition: overscrollProgress === 0 ? 'opacity 0.3s ease-out' : 'none'
        }}
      >
        <div className="max-w-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
