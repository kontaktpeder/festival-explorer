import { forwardRef } from "react";
import shareGIcon from "@/assets/share-g-icon.png";
import shareFallbackBg from "@/assets/share-fallback-bg.jpeg";
import type { ShareModel, ShareVariant } from "@/types/share";
import { SHARE_DIMENSIONS } from "@/types/share";

export type ShareImageFormat = ShareVariant;

type ShareImageCardProps = {
  variant: ShareVariant;
  data: ShareModel;
  /** When true, renders a scaled-down preview (not for capture). */
  preview?: boolean;
};

export const ShareImageCard = forwardRef<HTMLDivElement, ShareImageCardProps>(
  function ShareImageCard({ variant, data, preview = false }, ref) {
    const { width, height } = SHARE_DIMENSIONS[variant];
    const isStory = variant === "story";
    const brandBg = data.brandBackgroundUrl || shareFallbackBg;
    const brandLogo = data.brandLogoUrl || shareGIcon;
    const heroUrl = data.heroImageUrl || null;
    const subjectLogo = data.subjectLogoUrl || null;

    const logoSize = isStory ? 88 : 64;
    const logoMargin = isStory ? 64 : 56;

    const rootStyle: React.CSSProperties = preview
      ? {
          position: "relative" as const,
          overflow: "hidden",
          width,
          height,
          transform: "scale(0.22)",
          transformOrigin: "top left",
        }
      : {
          position: "relative" as const,
          overflow: "hidden",
          width,
          height,
        };

    return (
      <div ref={ref} style={{ ...rootStyle, backgroundColor: "#0a0f1a" }}>
        {/* Layer 1: Brand background texture */}
        <img
          src={brandBg}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.35,
            filter: "blur(1px)",
          }}
        />

        {/* Layer 2: Hero image */}
        {heroUrl ? (
          <img
            src={heroUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0 }} />
        )}

        {/* Layer 3: Gradient overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: isStory ? "55%" : "40%",
            background: isStory
              ? "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.65) 50%, transparent 100%)"
              : "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 55%, transparent 100%)",
          }}
        />

        {/* Subject logo (top-left signature) */}
        {subjectLogo && (
          <div
            style={{
              position: "absolute",
              top: isStory ? 80 : 56,
              left: isStory ? 60 : 56,
              zIndex: 10,
              background: "rgba(0,0,0,0.35)",
              borderRadius: 16,
              padding: 12,
            }}
          >
            <img
              src={subjectLogo}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: isStory ? 100 : 72,
                height: isStory ? 100 : 72,
                objectFit: "contain",
              }}
            />
          </div>
        )}

        {/* Text content – no URL in the image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: isStory ? "0 60px 64px" : "0 56px 56px",
            zIndex: 10,
          }}
        >
          <div style={{ paddingRight: logoSize + 24 }}>
            {/* Title */}
            <div
              style={{
                fontSize: isStory ? 78 : 52,
                fontWeight: 900,
                lineHeight: 0.92,
                color: "#ffffff",
                textTransform: "uppercase" as const,
                letterSpacing: "-0.02em",
                textShadow: "0 4px 30px rgba(0,0,0,0.6)",
                marginBottom: 20,
              }}
            >
              {data.title}
            </div>

            {/* Subtitle */}
            {data.subtitle && (
              <div
                style={{
                  fontSize: isStory ? 32 : 24,
                  fontWeight: 300,
                  lineHeight: 1.3,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: 20,
                }}
              >
                {data.subtitle}
              </div>
            )}

            {/* CTA */}
            {data.cta && (
              <div
                style={{
                  fontSize: isStory ? 26 : 22,
                  fontWeight: 600,
                  color: "#ffffff",
                }}
              >
                {data.cta}
              </div>
            )}
          </div>
        </div>

        {/* GIGGEN stamp – bottom-right */}
        <img
          src={brandLogo}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            bottom: logoMargin,
            right: logoMargin,
            width: logoSize,
            height: logoSize,
            objectFit: "contain",
            zIndex: 10,
            opacity: 0.9,
          }}
        />
      </div>
    );
  }
);
