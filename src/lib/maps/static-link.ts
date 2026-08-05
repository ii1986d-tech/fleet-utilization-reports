/**
 * PACK-007 fallback: static Google Maps directions URL (no Directions API call).
 * Same pattern as PACK-006 navigation links.
 */
export function buildStaticRouteUrl(origin: string, destination: string): string {
  const o = encodeURIComponent(origin.trim());
  const d = encodeURIComponent(destination.trim());
  return `https://www.google.com/maps/dir/${o}/${d}`;
}
