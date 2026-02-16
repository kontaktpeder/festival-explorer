import { forwardRef } from "react";
import shareGIcon from "@/assets/share-g-icon.png";
import shareFallbackBg from "@/assets/share-fallback-bg.jpeg";

export type ShareImageFormat = "link" | "story";

const DIMENSIONS = {
  link: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
} as const;

type ShareImageCardProps = {
  format: ShareImageFormat;
  heroImageUrl: string | null;
  logoUrl: string | null;
  title: string;
  tagline: string | null;
};

export const ShareImageCard = forwardRef<HTMLDivElement, ShareImageCardProps>(
  function ShareImageCard(
    { format, heroImageUrl, logoUrl, title, tagline },
    ref
  ) {
    const { width, height } = DIMENSIONS[format];
    const isStory = format === "story";
    const bgUrl = heroImageUrl || shareFallbackBg;

    return (
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={{
          width,
          height,
          backgroundColor: "#0f0f12",
        }}
      >
        {/* Background image */}
        <img
          src={bgUrl}
          alt=""
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.15) 100%)",
          }}
        />

        {/* G watermark – subtle centered */}
        <img
          src={shareGIcon}
          alt=""
          crossOrigin="anonymous"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
          style={{
            width: isStory ? "55%" : "50%",
            opacity: 0.06,
          }}
        />

        {/* Content area */}
        <div
          className="absolute inset-0 flex flex-col justify-end"
          style={{ padding: isStory ? 72 : 48 }}
        >
          <div className="relative z-10 space-y-3">
            {/* Logo if available */}
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                crossOrigin="anonymous"
                style={{
                  height: isStory ? 80 : 48,
                  width: "auto",
                  maxWidth: isStory ? 200 : 140,
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            )}

            {/* Title */}
            <div
              style={{
                fontSize: isStory ? 72 : 42,
                fontWeight: 900,
                lineHeight: 0.95,
                color: "#ffffff",
                textTransform: "uppercase" as const,
                letterSpacing: "-0.02em",
                maxWidth: isStory ? "90%" : "80%",
              }}
            >
              {title}
            </div>

            {/* Tagline */}
            {tagline && (
              <div
                style={{
                  fontSize: isStory ? 34 : 20,
                  fontWeight: 300,
                  lineHeight: 1.3,
                  color: "rgba(255,255,255,0.8)",
                  maxWidth: isStory ? "85%" : "75%",
                  marginTop: isStory ? 16 : 8,
                }}
              >
                {tagline}
              </div>
            )}
          </div>

          {/* GIGGEN branding bar */}
          <div
            className="relative z-10 flex items-center justify-between"
            style={{
              marginTop: isStory ? 48 : 28,
              paddingTop: isStory ? 24 : 16,
              borderTop: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <span
              style={{
                fontSize: isStory ? 28 : 18,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.15em",
                textTransform: "uppercase" as const,
              }}
            >
              GIGGEN
            </span>
            <img
              src={shareGIcon}
              alt=""
              crossOrigin="anonymous"
              style={{
                height: isStory ? 40 : 28,
                width: "auto",
                opacity: 0.5,
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);
