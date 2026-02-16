import { forwardRef } from "react";
import shareGIcon from "@/assets/share-g-icon.png";
import shareFallbackBg from "@/assets/share-fallback-bg.jpeg";
import type { ShareModel, ShareVariant } from "@/types/share";
import { SHARE_DIMENSIONS } from "@/types/share";

export type ShareImageFormat = ShareVariant;

type ShareImageCardProps = {
  variant: ShareVariant;
  data: ShareModel;
};

export const ShareImageCard = forwardRef<HTMLDivElement, ShareImageCardProps>(
  function ShareImageCard({ variant, data }, ref) {
    const { width, height } = SHARE_DIMENSIONS[variant];
    const isStory = variant === "story";
    const brandBg = data.brandBackgroundUrl || shareFallbackBg;
    const brandLogo = data.brandLogoUrl || shareGIcon;
    const heroUrl = data.heroImageUrl || shareFallbackBg;
    const logoSize = isStory ? 88 : 64;
    const logoMargin = isStory ? 64 : 56;

    return (
      <div
        ref={ref}
        style={{
          position: "relative",
          overflow: "hidden",
          width,
          height,
          backgroundColor: "#0a0f1a",
        }}
      >
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

        {isStory ? (
          <>
            {/* Story: gradient covers bottom 55% */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "55%",
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.65) 50%, transparent 100%)",
              }}
            />

            {/* Story: Title at top */}
            <div
              style={{
                position: "absolute",
                top: 80,
                left: 60,
                right: 60,
                zIndex: 10,
              }}
            >
              <div
                style={{
                  fontSize: 78,
                  fontWeight: 900,
                  lineHeight: 0.92,
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: "-0.02em",
                  textShadow: "0 4px 30px rgba(0,0,0,0.6)",
                }}
              >
                {data.title}
              </div>
            </div>

            {/* Story: Bottom content */}
            <div
              style={{
                position: "absolute",
                bottom: logoMargin + logoSize + 24,
                left: 60,
                right: 60 + logoSize + 24,
                zIndex: 10,
              }}
            >
              {data.subtitle && (
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 300,
                    lineHeight: 1.3,
                    color: "rgba(255,255,255,0.85)",
                    marginBottom: 20,
                  }}
                >
                  {data.subtitle}
                </div>
              )}
              {data.cta && (
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    color: "#ffffff",
                    marginBottom: 12,
                  }}
                >
                  {data.cta}
                </div>
              )}
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.03em",
                }}
              >
                {data.url.replace(/^https?:\/\//, "")}
              </div>
            </div>

            {/* Story: Logo stamp bottom-right */}
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
          </>
        ) : (
          <>
            {/* Link: gradient covers bottom 35% */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "40%",
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 55%, transparent 100%)",
              }}
            />

            {/* Link: Bottom content */}
            <div
              style={{
                position: "absolute",
                bottom: logoMargin,
                left: 56,
                right: 56 + logoSize + 24,
                zIndex: 10,
              }}
            >
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  lineHeight: 0.95,
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: "-0.02em",
                  marginBottom: 16,
                }}
              >
                {data.title}
              </div>
              {data.subtitle && (
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 300,
                    lineHeight: 1.3,
                    color: "rgba(255,255,255,0.8)",
                    marginBottom: 14,
                  }}
                >
                  {data.subtitle}
                </div>
              )}
              {data.cta && (
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#ffffff",
                    marginBottom: 10,
                  }}
                >
                  {data.cta}
                </div>
              )}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.03em",
                }}
              >
                {data.url.replace(/^https?:\/\//, "")}
              </div>
            </div>

            {/* Link: Logo stamp bottom-right */}
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
          </>
        )}
      </div>
    );
  }
);
