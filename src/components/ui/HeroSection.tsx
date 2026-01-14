import { ReactNode } from "react";
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
}

export function HeroSection({ 
  imageUrl, 
  imageUrlMobile,
  children, 
  compact, 
  fullScreen,
  backgroundFixed = false,
  imageFitMode = 'cover'
}: HeroSectionProps) {
  const heightClass = fullScreen 
    ? "min-h-screen" 
    : compact 
      ? "min-h-[40vh]" 
      : "min-h-[60vh]";

  const activeImage = useResponsiveImage({
    desktopUrl: imageUrl,
    mobileUrl: imageUrlMobile,
    fallbackUrl: imageUrl,
  });

  return (
    <div className={`cosmic-hero relative ${heightClass}`}>
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
            className={`absolute inset-0 bg-no-repeat ${imageFitMode === 'contain' ? 'bg-contain bg-top' : 'bg-cover bg-center'}`}
            style={{ backgroundImage: `url(${activeImage})` }}
          />
        )
      )}
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, hsl(240 10% 6% / 0.5) 100%)' }}
      />
      {/* Mobile fade overlay */}
      <MobileFadeOverlay />
      {/* Content - centered on mobile, bottom-aligned on desktop */}
      <div className="relative z-10 flex flex-col justify-end h-full px-5 pb-12 pt-20">
        <div className="max-w-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
