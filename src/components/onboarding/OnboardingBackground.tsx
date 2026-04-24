import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

type Intensity = "light" | "medium" | "heavy";

interface Props {
  intensity?: Intensity;
  vimeoId?: string;
  desktopVimeoId?: string;
}

/**
 * Cinematic full-screen Vimeo background for the onboarding flow.
 * Lives in the DOM across all steps so the video never restarts —
 * only the overlay intensity changes between steps.
 */
export const OnboardingBackground: React.FC<Props> = ({
  intensity = "medium",
  vimeoId = "1185124572",
  desktopVimeoId = "1185852804",
}) => {
  const isMobile = useIsMobile();
  const overlayClass =
    intensity === "light"
      ? "bg-[radial-gradient(ellipse_at_center,hsl(0_0%_4%/0.25)_0%,hsl(0_0%_4%/0.75)_100%)]"
      : intensity === "medium"
        ? "bg-[radial-gradient(ellipse_at_center,hsl(0_0%_4%/0.55)_0%,hsl(0_0%_4%/0.9)_100%)]"
        : "bg-[radial-gradient(ellipse_at_center,hsl(0_0%_4%/0.75)_0%,hsl(0_0%_4%/0.95)_100%)]";

  const params = new URLSearchParams({
    background: "1",
    autoplay: "1",
    muted: "1",
    loop: "1",
    title: "0",
    byline: "0",
    portrait: "0",
    badge: "0",
    autopause: "0",
    dnt: "1",
  }).toString();

  const activeVimeoId = isMobile ? vimeoId : desktopVimeoId;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-background"
    >
      {/* Video — scaled up so the 9:16 portrait fills any viewport without bars */}
      <div className="absolute inset-0 scale-150 sm:scale-110 origin-center">
        <iframe
          src={`https://player.vimeo.com/video/${activeVimeoId}?${params}`}
          allow="autoplay; fullscreen; picture-in-picture"
          className="absolute inset-0 w-full h-full"
          title=""
          tabIndex={-1}
          loading="eager"
          // @ts-expect-error - fetchpriority is a valid HTML attribute not yet in React types
          fetchpriority="high"
        />
      </div>

      {/* Cinematic overlay — radial vignette, intensity controlled per step */}
      <div
        className={`absolute inset-0 transition-colors duration-700 ${overlayClass}`}
      />

      {/* Top + bottom gradient for legibility of header / CTA stack */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background via-background/70 to-transparent" />

      {/* Subtle film grain */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{ backgroundImage: "var(--cosmic-grain)" }}
      />
    </div>
  );
};