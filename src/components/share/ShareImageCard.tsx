import { forwardRef } from "react";
import shareGIcon from "@/assets/share-g-icon.png";
import shareFallbackBg from "@/assets/share-fallback-bg.jpeg";
import type { ShareModel } from "@/types/share";
import { SHARE_WIDTH, SHARE_HEIGHT } from "@/types/share";

const SAFE_LEFT = 96;
const SAFE_RIGHT = 96;
const SAFE_TOP = 116;
const SAFE_BOTTOM = 140;

// Fast hero-sone: samme rektangel for alle prosjekter (crop med object-fit: cover)
const HERO_ZONE_TOP = 380;
const HERO_ZONE_BOTTOM_RESERVE = 340;
const HERO_ZONE_HEIGHT = SHARE_HEIGHT - HERO_ZONE_TOP - HERO_ZONE_BOTTOM_RESERVE; // 630

const GIGGEN_SIZE = 76;
const GIGGEN_INSET = 16;
const GIGGEN_BOTTOM = 52;
const GIGGEN_LEFT = 52;
const SUBJECT_LOGO_MAX_W = 360;
const SUBJECT_LOGO_MAX_H = 160;

/** Varmere oransje – mer plakat, mindre UI */
const ACCENT_COLOR = "#FF8C2B";

type ShareImageCardProps = {
  data: ShareModel;
};

/**
 * Hero i fast sone – samme størrelse for alle (object-fit: cover).
 */
function ShareHeroForeground({ src }: { src: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: HERO_ZONE_TOP,
        left: 0,
        width: SHARE_WIDTH,
        height: HERO_ZONE_HEIGHT,
        overflow: "hidden",
        zIndex: 2,
      }}
    >
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
        }}
      />
    </div>
  );
}

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
        {/* Lag 1: Bakgrunn – hero cover + blur + mørk overlay (HELE kortet) */}
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

        {/* Lag 2: Hero forgrunn */}
        {heroUrl && <ShareHeroForeground src={heroUrl} />}

        {/* Topp-gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.22) 20%, rgba(0,0,0,0.04) 40%, transparent 56%)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />

        {/* Bunn-gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.20) 28%, rgba(0,0,0,0.04) 52%, rgba(0,0,0,0) 68%)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />

        {/* Svak hjørne-vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.15) 100%)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />

        {/* GIGGEN-ikon – nederst venstre, tett i hjørnet */}
        <img
          src={brandLogo}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            bottom: GIGGEN_BOTTOM,
            left: GIGGEN_LEFT,
            width: GIGGEN_SIZE,
            height: GIGGEN_SIZE,
            objectFit: "contain",
            zIndex: 10,
            opacity: 0.72,
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
          }}
        />

        {/* Tittel + tagline – full bredde øverst */}
        <div
          style={{
            position: "absolute",
            top: SAFE_TOP,
            left: SAFE_LEFT,
            width: SHARE_WIDTH - SAFE_LEFT - SAFE_RIGHT,
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
              letterSpacing: "0.08em",
              textShadow: "0 6px 40px rgba(0,0,0,0.7)",
              marginBottom: 24,
            }}
          >
            {data.title}
          </div>
          {data.subtitle && (
            <div
              style={{
                fontSize: 34,
                fontWeight: 600,
                lineHeight: 1.3,
                color: ACCENT_COLOR,
                textShadow: "0 3px 16px rgba(0,0,0,0.6)",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
                marginTop: 14,
                paddingBottom: 12,
              }}
            >
              {data.subtitle}
            </div>
          )}
        </div>

        {/* CTA – 2-linjers plakatstruktur, nederst høyre */}
        <div
          style={{
            position: "absolute",
            bottom: SAFE_BOTTOM,
            right: SAFE_RIGHT,
            zIndex: 10,
            textAlign: "right" as const,
            maxWidth: SHARE_WIDTH - SAFE_LEFT - GIGGEN_LEFT - GIGGEN_SIZE - 48,
          }}
        >
          {data.cta ? (() => {
            const [line1, line2] = data.cta.split("\n");
            return (
              <>
                {line1 && (
                  <div
                    style={{
                      fontSize: 27,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.95)",
                      letterSpacing: "0.14em",
                      lineHeight: 1.2,
                      textShadow: "0 2px 16px rgba(0,0,0,0.9)",
                      marginBottom: line2 ? 10 : 0,
                    }}
                  >
                    {line1}
                  </div>
                )}
                {line2 && (
                  <div
                    style={{
                      fontSize: 50,
                      fontWeight: 800,
                      color: "#FFB060",
                      letterSpacing: "0.05em",
                      lineHeight: 1.05,
                      textShadow: "0 3px 24px rgba(0,0,0,0.85)",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    {line2}
                  </div>
                )}
                {!line2 && (
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.65)",
                      letterSpacing: "0.04em",
                      textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                    }}
                  >
                    {line1}
                  </div>
                )}
              </>
            );
          })() : (
            <div
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.04em",
                textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              }}
            >
              giggen.org
            </div>
          )}
        </div>

        {/* Prosjekt/venue-logo – over CTA, høyre side */}
        {subjectLogo && (
          <div
            style={{
              position: "absolute",
              bottom: SAFE_BOTTOM + 36,
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
