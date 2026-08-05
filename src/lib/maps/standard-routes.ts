export type StandardRoute = {
  origin: string;
  destination: string;
};

/** Frequently used corridors eligible for distance caching. */
export const STANDARD_ROUTES: readonly StandardRoute[] = [
  { origin: "Hamburg", destination: "München" },
  { origin: "Berlin", destination: "Frankfurt" },
  { origin: "Köln", destination: "Stuttgart" },
  { origin: "Hamburg", destination: "Berlin" },
  { origin: "München", destination: "Frankfurt" },
] as const;

export function normalizePlace(value: string): string {
  return value.trim().toLowerCase().normalize("NFC");
}

export function routeCacheKey(origin: string, destination: string): string {
  return `${normalizePlace(origin)}|${normalizePlace(destination)}`;
}

export function isStandardRoute(origin: string, destination: string): boolean {
  const key = routeCacheKey(origin, destination);
  return STANDARD_ROUTES.some(
    (route) => routeCacheKey(route.origin, route.destination) === key,
  );
}
