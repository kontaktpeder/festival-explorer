import { useEffect } from "react";
import type { FestivalSeoParams } from "@/lib/festival-seo";
import {
  festivalPageTitle,
  festivalMetaDescription,
  festivalCanonicalUrl,
  festivalJsonLd,
  festivalBreadcrumbJsonLd,
} from "@/lib/festival-seo";

const SCRIPT_ID = "festival-page-jsonld";
const BREADCRUMB_SCRIPT_ID = "festival-page-breadcrumb-jsonld";
const SEO_MARKER = "data-giggen-seo";
const SEO_DATA_KEY = "data-key";

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
      "https://giggen.org/images/giggen-festival-share-2026.png";

    document.title = title;

    const setMeta = (
      key: string,
      nameOrProp: string,
      content: string,
      isProperty = false
    ) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(
        `meta[${SEO_MARKER}="1"][${SEO_DATA_KEY}="${key}"]`
      );
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, nameOrProp);
        el.setAttribute(SEO_MARKER, "1");
        el.setAttribute(SEO_DATA_KEY, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", "description", description);
    setMeta("og:title", "og:title", title, true);
    setMeta("og:description", "og:description", description, true);
    setMeta("og:image", "og:image", ogImage, true);
    setMeta("og:image:width", "og:image:width", "1200", true);
    setMeta("og:image:height", "og:image:height", "630", true);
    setMeta("og:image:type", "og:image:type", "image/png", true);
    setMeta("og:type", "og:type", "event", true);
    setMeta("og:url", "og:url", canonical, true);
    setMeta("og:site_name", "og:site_name", "Giggen", true);
    setMeta("twitter:card", "twitter:card", "summary_large_image");
    setMeta("twitter:title", "twitter:title", title);
    setMeta("twitter:description", "twitter:description", description);
    setMeta("twitter:image", "twitter:image", ogImage);

    let linkCanonical = document.querySelector(
      `link[${SEO_MARKER}="1"][${SEO_DATA_KEY}="canonical"]`
    );
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      linkCanonical.setAttribute(SEO_MARKER, "1");
      linkCanonical.setAttribute(SEO_DATA_KEY, "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", canonical);

    // Main JSON-LD (@graph: WebPage + Event)
    const jsonLd = festivalJsonLd(params);
    let scriptEl = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = SCRIPT_ID;
      scriptEl.type = "application/ld+json";
      scriptEl.setAttribute(SEO_MARKER, "1");
      scriptEl.setAttribute(SEO_DATA_KEY, "jsonld");
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    // BreadcrumbList JSON-LD
    const breadcrumbLd = festivalBreadcrumbJsonLd({
      festivalName: params.festivalName,
      city: params.city,
      year: params.year,
      slug: params.slug,
    });
    let scriptBreadcrumb = document.getElementById(
      BREADCRUMB_SCRIPT_ID
    ) as HTMLScriptElement | null;
    if (!scriptBreadcrumb) {
      scriptBreadcrumb = document.createElement("script");
      scriptBreadcrumb.id = BREADCRUMB_SCRIPT_ID;
      scriptBreadcrumb.type = "application/ld+json";
      scriptBreadcrumb.setAttribute(SEO_MARKER, "1");
      scriptBreadcrumb.setAttribute(SEO_DATA_KEY, "breadcrumb-jsonld");
      document.head.appendChild(scriptBreadcrumb);
    }
    scriptBreadcrumb.textContent = JSON.stringify(breadcrumbLd);

    return () => {
      document.title = "GIGGEN";
      document
        .querySelectorAll(`[${SEO_MARKER}="1"]`)
        .forEach((el) => el.remove());
      document.getElementById(SCRIPT_ID)?.remove();
      document.getElementById(BREADCRUMB_SCRIPT_ID)?.remove();
    };
  }, [
    params?.slug,
    params?.startDate,
    params?.festivalName,
    params?.city,
    params?.year,
    params?.venueName,
    params?.heroImageUrl,
    params?.updatedAt,
    seoDescriptionOverride,
  ]);
}
