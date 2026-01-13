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
}

export function HeroSection({ 
  imageUrl, 
  imageUrlMobile,
  children, 
  compact, 
  fullScreen,
  backgroundFixed = false 
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
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${activeImage})` }}
          />
        )
      )}
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, hsl(240 10% 6% / 0.4) 100%)' }}
      />
      {/* Mobile fade overlay */}
      <MobileFadeOverlay />
      <div className="relative z-10 flex flex-col justify-end h-full p-4 pt-16">
        {children}
      </div>
    </div>
  );
}
