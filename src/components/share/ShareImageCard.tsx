import { forwardRef } from "react";
import shareGIcon from "@/assets/share-g-icon.png";
import shareFallbackBg from "@/assets/share-fallback-bg.jpeg";
import type { ShareModel } from "@/types/share";
import { SHARE_WIDTH, SHARE_HEIGHT } from "@/types/share";

const SAFE_LEFT = 96;
const SAFE_RIGHT = 96;
const SAFE_TOP = 120;
const SAFE_BOTTOM = 140;

const GIGGEN_SIZE = 80;
const SUBJECT_LOGO_MAX_W = 360;
const SUBJECT_LOGO_MAX_H = 160;

/** Oransje accent – inline for html2canvas */
const ACCENT_COLOR = "hsl(24, 100%, 55%)";

type ShareImageCardProps = {
  data: ShareModel;
};

export const ShareImageCard = forwardRef<HTMLDivElement, ShareImageCardProps>(
  function ShareImageCard({ data }, ref) {
    const brandBg = data.brandBackgroundUrl || shareFallbackBg;
    const brandLogo = data.brandLogoUrl || shareGIcon;
    const heroUrl = data.heroImageUrl || null;
    const subjectLogo = data.subjectLogoUrl || null;

    return (
      <div
        ref={ref}
        style={{
          position: "relative",
          overflow: "hidden",
          width: SHARE_WIDTH,
          height: SHARE_HEIGHT,
          backgroundColor: "#0a0a0a",
        }}
      >
        {/* Lag 1: Bakgrunn – hero cover + blur 44px + opacity 0.18 */}
        {heroUrl ? (
          <>
            <img
              src={heroUrl}
              alt=""
              crossOrigin="anonymous"
              style={{
                position: "absolute",
                inset: 0,
                width: SHARE_WIDTH,
                height: SHARE_HEIGHT,
                objectFit: "cover",
                objectPosition: "center",
                filter: "blur(44px)",
                opacity: 0.18,
                transform: "scale(1.1)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.18)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.45) 100%)",
                pointerEvents: "none",
                zIndex: 1,
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
              width: SHARE_WIDTH,
              height: SHARE_HEIGHT,
              objectFit: "cover",
              opacity: 0.35,
              filter: "blur(1px)",
            }}
          />
        )}

        {/* Lag 2: Hero forgrunn – contain, skarp */}
        {heroUrl && (
          <img
            src={heroUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: 0,
              width: SHARE_WIDTH,
              height: SHARE_HEIGHT,
              objectFit: "contain",
              objectPosition: "center",
              zIndex: 2,
            }}
          />
        )}

        {/* Lag 3: Bunn-gradient – helflate, myk overgang, ingen hairline */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 35%, transparent 60%)",
            pointerEvents: "none",
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
            top: SAFE_TOP,
            right: SAFE_RIGHT,
            width: GIGGEN_SIZE,
            height: GIGGEN_SIZE,
            objectFit: "contain",
            zIndex: 10,
            opacity: 0.9,
          }}
        />

        {/* Tittel + tagline – top-left, fast bredde */}
        <div
          style={{
            position: "absolute",
            top: SAFE_TOP,
            left: SAFE_LEFT,
            width: SHARE_WIDTH - SAFE_LEFT - SAFE_RIGHT - GIGGEN_SIZE - 32,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 0.88,
              color: "#ffffff",
              textTransform: "uppercase" as const,
              letterSpacing: "-0.03em",
              textShadow: "0 6px 40px rgba(0,0,0,0.7)",
              marginBottom: 20,
            }}
          >
            {data.title}
          </div>
          {data.subtitle && (
            <div
              style={{
                fontSize: 40,
                fontWeight: 300,
                lineHeight: 1.25,
                color: ACCENT_COLOR,
                textShadow: "0 3px 16px rgba(0,0,0,0.6)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
                marginTop: 14,
                paddingBottom: 8,
              }}
            >
              {data.subtitle}
            </div>
          )}
        </div>

        {/* CTA – nederst venstre */}
        <div
          style={{
            position: "absolute",
            bottom: SAFE_BOTTOM,
            left: SAFE_LEFT,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              textShadow: "0 2px 14px rgba(0,0,0,0.6)",
            }}
          >
            {data.cta ?? "Les mer på giggen.org"}
          </div>
        </div>

        {/* Prosjekt/venue-logo – nederst høyre */}
        {subjectLogo && (
          <div
            style={{
              position: "absolute",
              bottom: SAFE_BOTTOM,
              right: SAFE_RIGHT,
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
