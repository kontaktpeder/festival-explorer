import { Navigate } from "react-router-dom";

const GIGGEN_FESTIVAL_SLUG = "giggen-festival-for-en-kveld";

/**
 * Wrapper for the GIGGEN Festival proof-of-concept case.
 * Currently redirects to the generic festival template with
 * the Giggen slug. Later this can be expanded with case-specific
 * sections, story copy, or marketing overlays.
 */
export default function GiggenFestivalCasePage() {
  return <Navigate to={`/festival/${GIGGEN_FESTIVAL_SLUG}`} replace />;
}
