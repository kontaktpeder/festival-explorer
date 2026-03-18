import { useMemo } from "react";
import { useParams } from "react-router-dom";
import FestivalTemplatePage from "@/pages/FestivalTemplatePage";

/**
 * Case-wrapper for festivaler.
 * URL: /festival/case/:slug
 */
export default function FestivalCasePage() {
  const { slug } = useParams<{ slug: string }>();
  const resolvedSlug = useMemo(() => slug || "giggen-festival-for-en-kveld", [slug]);

  return <FestivalTemplatePage key={`festival-case-${resolvedSlug}`} />;
}
