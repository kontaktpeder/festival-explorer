import { ReactNode } from "react";

interface HeroSectionProps {
  imageUrl?: string;
  children: ReactNode;
  compact?: boolean;
  fullScreen?: boolean;
}

export function HeroSection({ imageUrl, children, compact, fullScreen }: HeroSectionProps) {
  const heightClass = fullScreen 
    ? "min-h-screen" 
    : compact 
      ? "min-h-[40vh]" 
      : "min-h-[60vh]";

  return (
    <div className={`cosmic-hero relative ${heightClass}`}>
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="relative z-10 flex flex-col justify-end h-full p-4 pt-16">
        {children}
      </div>
    </div>
  );
}