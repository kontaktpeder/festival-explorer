import { useEffect, useRef } from "react";
import type { FestivalSeoParams } from "@/lib/festival-seo";
import {
  festivalPageTitle,
  festivalMetaDescription,
  festivalCanonicalUrl,
  festivalJsonLd,
} from "@/lib/festival-seo";

const SCRIPT_ID = "festival-page-jsonld";

export function useFestivalPageSeo(
  params: FestivalSeoParams | null,
  seoDescriptionOverride?: string | null
) {
  const addedRef = useRef<Set<string>>(new Set());

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
        document.head.appendChild(el);
        addedRef.current.add(`${attr}-${nameOrProp}`);
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
      document.head.appendChild(linkCanonical);
      addedRef.current.add("canonical");
    }
    linkCanonical.setAttribute("href", canonical);

    const jsonLd = festivalJsonLd(params);
    let scriptEl = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = SCRIPT_ID;
      scriptEl.type = "application/ld+json";
      document.head.appendChild(scriptEl);
      addedRef.current.add("jsonld");
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = "GIGGEN";
      if (addedRef.current.has("canonical"))
        document.querySelector('link[rel="canonical"]')?.remove();
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
