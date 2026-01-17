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
  /** Enable scroll-to-expand effect where image grows and text fades */
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollExpand) return;

    const handleScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const heroHeight = heroRef.current.offsetHeight;
      // Calculate scroll progress: 0 at top, 1 when hero is fully scrolled
      const progress = Math.max(0, Math.min(1, -rect.top / (heroHeight * 0.5)));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollExpand]);

  const baseHeight = fullScreen 
    ? "min-h-screen" 
    : compact 
      ? "min-h-[50vh]" 
      : "min-h-[60vh]";

  const activeImage = useResponsiveImage({
    desktopUrl: imageUrl,
    mobileUrl: imageUrlMobile,
    fallbackUrl: imageUrl,
  });

  // For scroll expand: image scales up, text fades out
  const imageScale = scrollExpand ? 1 + scrollProgress * 0.15 : 1;
  const textOpacity = scrollExpand ? 1 - scrollProgress * 1.5 : 1;
  const textTranslate = scrollExpand ? scrollProgress * 30 : 0;

  return (
    <div 
      ref={heroRef}
      className={`cosmic-hero relative ${baseHeight}`}
      style={scrollExpand ? { minHeight: `calc(50vh + ${scrollProgress * 20}vh)` } : undefined}
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
            className={`absolute inset-0 bg-no-repeat ${imageFitMode === 'contain' ? 'bg-contain bg-top' : 'bg-cover bg-center'} transition-transform duration-100`}
            style={{ 
              backgroundImage: `url(${activeImage})`,
              transform: scrollExpand ? `scale(${imageScale})` : undefined,
              transformOrigin: 'center center'
            }}
          />
        )
      )}
      
      {/* Gradient overlay - stronger at bottom for text legibility */}
      <div 
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ 
          background: scrollExpand 
            ? `linear-gradient(to top, hsl(240 10% 6% / ${0.9 - scrollProgress * 0.5}) 0%, hsl(240 10% 6% / ${0.3 - scrollProgress * 0.2}) 50%, transparent 100%)`
            : 'linear-gradient(to top, hsl(240 10% 6% / 0.9) 0%, hsl(240 10% 6% / 0.3) 50%, transparent 100%)'
        }}
      />
      
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{ 
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(240 10% 6% / 0.5) 100%)',
          opacity: scrollExpand ? 1 - scrollProgress * 0.7 : 1
        }}
      />
      
      {/* Mobile fade overlay */}
      <MobileFadeOverlay />
      
      {/* Content - positioned at bottom */}
      <div 
        className="relative z-10 flex flex-col justify-end h-full px-5 pb-8 pt-20"
        style={scrollExpand ? { 
          opacity: Math.max(0, textOpacity),
          transform: `translateY(${textTranslate}px)`,
          transition: 'opacity 0.1s ease-out, transform 0.1s ease-out'
        } : undefined}
      >
        <div className="max-w-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
