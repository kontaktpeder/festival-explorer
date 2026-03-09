/**
 * Samler logikk for offentlige URL-er til entities og personas.
 * Hvis routing endres senere, trenger du kun å oppdatere denne filen.
 */

export function getEntityPublicHref(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return `/project/${slug}`;
}

export function getPersonaPublicHref(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return `/p/${slug}`;
}
