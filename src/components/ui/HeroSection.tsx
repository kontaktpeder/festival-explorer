import { ReactNode } from "react";

interface HeroSectionProps {
  imageUrl?: string;
  children: ReactNode;
  compact?: boolean;
}

export function HeroSection({ imageUrl, children, compact }: HeroSectionProps) {
  return (
    <div className={`cosmic-hero relative ${compact ? "min-h-[40vh]" : "min-h-[60vh]"}`}>
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
