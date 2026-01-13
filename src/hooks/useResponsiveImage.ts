import { useState, useEffect } from "react";

interface ResponsiveImageOptions {
  desktopUrl?: string | null;
  mobileUrl?: string | null;
  fallbackUrl?: string | null;
}

export function useResponsiveImage({
  desktopUrl,
  mobileUrl,
  fallbackUrl,
}: ResponsiveImageOptions): string | null {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    // Mobile priority: mobile -> fallback -> desktop
    return mobileUrl || fallbackUrl || desktopUrl || null;
  }

  // Desktop priority: desktop -> fallback -> mobile
  return desktopUrl || fallbackUrl || mobileUrl || null;
}
