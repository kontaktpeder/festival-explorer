import { useEffect } from "react";
import type { FestivalSeoParams } from "@/lib/festival-seo";
import {
  festivalPageTitle,
  festivalMetaDescription,
  festivalCanonicalUrl,
  festivalJsonLd,
} from "@/lib/festival-seo";

const SCRIPT_ID = "festival-page-jsonld";
const SEO_MARKER = "data-giggen-seo";

export function useFestivalPageSeo(
  params: FestivalSeoParams | null,
  seoDescriptionOverride?: string | null
) {
  useEffect(() => {
    if (!params) return;

    const title = festivalPageTitle(params);
    const description = festivalMetaDescription(params, seoDescriptionOverride);
    const canonical = festivalCanonicalUrl(params.slug);
    const ogImage =
      params.heroImageUrl ||
      `${import.meta.env.VITE_PUBLIC_URL || ""}/og-festival.png`;

    document.title = title;

    const setMeta = (
      nameOrProp: string,
      content: string,
      isProperty = false
    ) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, nameOrProp);
        el.setAttribute(SEO_MARKER, "1");
        document.head.appendChild(el);
      } else {
        el.setAttribute(SEO_MARKER, "1");
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:image", ogImage, true);
    setMeta("og:type", "event", true);
    setMeta("og:url", canonical, true);
    setMeta("og:site_name", "Giggen", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      linkCanonical.setAttribute(SEO_MARKER, "1");
      document.head.appendChild(linkCanonical);
    } else {
      linkCanonical.setAttribute(SEO_MARKER, "1");
    }
    linkCanonical.setAttribute("href", canonical);

    const jsonLd = festivalJsonLd(params);
    let scriptEl = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = SCRIPT_ID;
      scriptEl.type = "application/ld+json";
      scriptEl.setAttribute(SEO_MARKER, "1");
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = "GIGGEN";
      document.querySelectorAll(`[${SEO_MARKER}="1"]`).forEach((el) => el.remove());
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [
    params?.slug,
    params?.startDate,
    params?.festivalName,
    params?.city,
    params?.year,
    params?.venueName,
    params?.heroImageUrl,
    seoDescriptionOverride,
  ]);
}
