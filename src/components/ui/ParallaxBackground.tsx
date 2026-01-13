import { useState, useEffect, useRef } from "react";

interface ParallaxBackgroundProps {
  imageUrl?: string | null;
  imageUrlMobile?: string | null;
  intensity?: number;
  className?: string;
}

export function ParallaxBackground({
  imageUrl,
  imageUrlMobile,
  intensity = 0.3,
  className = "",
}: ParallaxBackgroundProps) {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();

    const handleScroll = () => {
      if (rafRef.current !== null) return;
      
      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        rafRef.current = null;
      });
    };

    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Choose image based on device
  const activeImage = isMobile 
    ? (imageUrlMobile || imageUrl) 
    : (imageUrl || imageUrlMobile);

  if (!activeImage) return null;

  // Calculate parallax offset
  const parallaxY = scrollY * intensity;

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${activeImage})`,
          transform: `translateY(${parallaxY}px) scale(1.2)`,
          willChange: "transform",
        }}
      />
    </div>
  );
}
