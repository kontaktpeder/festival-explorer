import { forwardRef, useCallback, useState } from "react";
import shareGIcon from "@/assets/share-g-icon.png";
import shareFallbackBg from "@/assets/share-fallback-bg.jpeg";
import type { ShareModel } from "@/types/share";
import { SHARE_WIDTH, SHARE_HEIGHT } from "@/types/share";

const SAFE_LEFT = 96;
const SAFE_RIGHT = 96;
const SAFE_TOP = 120;
const SAFE_BOTTOM = 140;

const GIGGEN_SIZE = 92;
const GIGGEN_INSET = 16;
const SUBJECT_LOGO_MAX_W = 360;
const SUBJECT_LOGO_MAX_H = 160;

/** Varmere oransje – mer plakat, mindre UI */
const ACCENT_COLOR = "#FF8C2B";

type ShareImageCardProps = {
  data: ShareModel;
};

/**
 * Hero forgrunn – contain uten object-fit (html2canvas-vennlig).
 */
function ShareHeroForeground({ src }: { src: string }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const onLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return;
    const r = nw / nh;
    let w = SHARE_WIDTH;
    let h = SHARE_HEIGHT;
    if (r > SHARE_WIDTH / SHARE_HEIGHT) {
      h = Math.round(SHARE_WIDTH / r);
    } else {
      w = Math.round(SHARE_HEIGHT * r);
    }
    setSize({ w, h });
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
      }}
    >
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        onLoad={onLoad}
        style={{
          width: size ? size.w : SHARE_WIDTH,
          height: size ? size.h : SHARE_HEIGHT,
          objectFit: "cover",
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
        {/* Lag 1: Bakgrunn – hero cover + blur + mørk overlay */}
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
              "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 20%, transparent 40%)",
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
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 10%, rgba(0,0,0,0) 30%)",
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

        {/* GIGGEN-ikon – større, mer inn, svak skygge */}
        <img
          src={brandLogo}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            top: SAFE_TOP + GIGGEN_INSET,
            right: SAFE_RIGHT + GIGGEN_INSET,
            width: GIGGEN_SIZE,
            height: GIGGEN_SIZE,
            objectFit: "contain",
            zIndex: 10,
            opacity: 0.9,
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
          }}
        />

        {/* Tittel + tagline – tydeligere hierarki */}
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

        {/* CTA – mer tyngde, svak glow */}
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
              fontSize: 36,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.06em",
              textShadow:
                "0 2px 14px rgba(0,0,0,0.6), 0 0 30px rgba(255,255,255,0.08)",
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
