import { useEffect } from "react";
import { getPublicUrl } from "@/lib/utils";

const SEO_MARKER = "data-giggen-seo";
const SEO_DATA_KEY = "data-key";

export type PageSeoOptions = {
  title: string;
  description: string;
  canonical: string; // absolute URL or path
  ogImage: string;   // absolute URL or path
  ogType?: "website" | "event" | "place";
};

function ensureAbsoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const base = getPublicUrl().replace(/\/$/, "");
  return pathOrUrl.startsWith("/") ? `${base}${pathOrUrl}` : `${base}/${pathOrUrl}`;
}

export function usePageSeo(options: PageSeoOptions | null) {
  useEffect(() => {
    if (!options) return;

    const title = options.title;
    const description = options.description;
    const canonical = ensureAbsoluteUrl(options.canonical);
    const ogImage = ensureAbsoluteUrl(options.ogImage);
    const ogType = options.ogType ?? "website";

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
    setMeta("og:type", "og:type", ogType, true);
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

    return () => {
      document.title = "GIGGEN";
      document
        .querySelectorAll(`[${SEO_MARKER}="1"]`)
        .forEach((el) => el.remove());
    };
  }, [
    options?.title,
    options?.description,
    options?.canonical,
    options?.ogImage,
    options?.ogType,
  ]);
}
