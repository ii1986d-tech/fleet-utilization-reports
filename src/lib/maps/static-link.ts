/**
 * PACK-007 fallback: static Google Maps directions URL (no Directions API call).
 * Same pattern as PACK-006 navigation links.
 * Optional waypoints are inserted between origin and destination.
 */
export function buildStaticRouteUrl(
  origin: string,
  destination: string,
  waypoints: string[] = [],
): string {
  const parts = [origin, ...waypoints, destination]
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => encodeURIComponent(p));
  return `https://www.google.com/maps/dir/${parts.join("/")}`;
}
