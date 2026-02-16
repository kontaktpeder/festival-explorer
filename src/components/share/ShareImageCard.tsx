import { forwardRef } from "react";
import shareGIcon from "@/assets/share-g-icon.png";
import shareFallbackBg from "@/assets/share-fallback-bg.jpeg";
import type { ShareModel } from "@/types/share";
import { SHARE_WIDTH, SHARE_HEIGHT } from "@/types/share";

const SAFE = 56;
const GIGGEN_SIZE = 64;
const GIGGEN_MARGIN = 56;
const SUBJECT_LOGO_MAX_W = 320;
const SUBJECT_LOGO_MAX_H = 140;
const SUBJECT_LOGO_MARGIN = 56;

/** Oransje accent – brukes direkte i canvas (html2canvas krever inline) */
const ACCENT_COLOR = "hsl(24, 100%, 55%)";

type ShareImageCardProps = {
  data: ShareModel;
  /** Når true, skalert preview i modal. Default false = full px for capture. */
  preview?: boolean;
};

export const ShareImageCard = forwardRef<HTMLDivElement, ShareImageCardProps>(
  function ShareImageCard({ data, preview = false }, ref) {
    const brandBg = data.brandBackgroundUrl || shareFallbackBg;
    const brandLogo = data.brandLogoUrl || shareGIcon;
    const heroUrl = data.heroImageUrl || null;
    const subjectLogo = data.subjectLogoUrl || null;

    const rootStyle: React.CSSProperties = preview
      ? {
          position: "relative",
          overflow: "hidden",
          width: SHARE_WIDTH,
          height: SHARE_HEIGHT,
          transform: "scale(0.22)",
          transformOrigin: "top left",
          backgroundColor: "#0a0a0a",
        }
      : {
          position: "relative",
          overflow: "hidden",
          width: SHARE_WIDTH,
          height: SHARE_HEIGHT,
          backgroundColor: "#0a0a0a",
        };

    return (
      <div ref={ref} style={rootStyle}>
        {/* Lag 1: Bakgrunn – hero blurred som fyll, eller brand texture */}
        {heroUrl ? (
          <>
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
                filter: "blur(16px) brightness(0.5)",
                transform: "scale(1.1)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            />
          </>
        ) : (
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
        )}

        {/* Lag 2: Hero forgrunn – contain, sentrert, aldri strekk */}
        {heroUrl && (
          <img
            src={heroUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              zIndex: 2,
            }}
          />
        )}

        {/* Lag 3: Bunn-gradient for lesbarhet (~38% høyde) */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "38%",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 55%, transparent 100%)",
            zIndex: 3,
          }}
        />

        {/* GIGGEN-ikon – topp høyre */}
        <img
          src={brandLogo}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            top: GIGGEN_MARGIN,
            right: GIGGEN_MARGIN,
            width: GIGGEN_SIZE,
            height: GIGGEN_SIZE,
            objectFit: "contain",
            zIndex: 10,
            opacity: 0.9,
          }}
        />

        {/* Tekstblokk – top-left (safe zone) */}
        <div
          style={{
            position: "absolute",
            top: SAFE,
            left: SAFE,
            maxWidth: SHARE_WIDTH - SAFE * 2 - GIGGEN_SIZE - 24,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 0.92,
              color: "#ffffff",
              textTransform: "uppercase" as const,
              letterSpacing: "-0.02em",
              textShadow: "0 4px 30px rgba(0,0,0,0.6)",
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
                color: ACCENT_COLOR,
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }}
            >
              {data.subtitle}
            </div>
          )}
        </div>

        {/* CTA – nederst venstre, over gradient */}
        <div
          style={{
            position: "absolute",
            bottom: SAFE,
            left: SAFE,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#ffffff",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            {data.cta ?? "Les mer på giggen.org"}
          </div>
        </div>

        {/* Prosjekt/venue-logo – nederst høyre, kun hvis finnes */}
        {subjectLogo && (
          <div
            style={{
              position: "absolute",
              bottom: SUBJECT_LOGO_MARGIN,
              right: SUBJECT_LOGO_MARGIN,
              zIndex: 10,
            }}
          >
            <img
              src={subjectLogo}
              alt=""
              crossOrigin="anonymous"
              style={{
                maxWidth: SUBJECT_LOGO_MAX_W,
                maxHeight: SUBJECT_LOGO_MAX_H,
                objectFit: "contain",
              }}
            />
          </div>
        )}
      </div>
    );
  }
);
