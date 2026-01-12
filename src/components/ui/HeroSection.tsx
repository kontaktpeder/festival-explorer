import { ReactNode } from "react";

interface HeroSectionProps {
  imageUrl?: string;
  children: ReactNode;
  compact?: boolean;
  fullScreen?: boolean;
  backgroundFixed?: boolean;
}

export function HeroSection({ 
  imageUrl, 
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

  return (
    <div className={`cosmic-hero relative ${heightClass}`}>
      {imageUrl && (
        <div
          className={`absolute inset-0 bg-cover bg-center ${backgroundFixed ? 'bg-fixed' : ''}`}
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, hsl(240 10% 6% / 0.4) 100%)' }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-[3]" />
      <div className="relative z-10 flex flex-col justify-end h-full p-4 pt-16">
        {children}
      </div>
    </div>
  );
}
