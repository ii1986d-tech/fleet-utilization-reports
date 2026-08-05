const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Great-circle distance between two WGS84 points (km), 2 decimal places.
 */
export function calculateDirectKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return round2(EARTH_RADIUS_KM * c);
}

export type LatLon = { lat: number; lon: number };

/**
 * Returns null when either coordinate pair is missing/invalid.
 * PACK-006 stops do not yet carry lat/lon — callers typically pass null.
 */
export function calculateDirectKmFromCoords(
  origin: LatLon | null | undefined,
  destination: LatLon | null | undefined,
): number | null {
  if (!origin || !destination) return null;
  if (
    !Number.isFinite(origin.lat) ||
    !Number.isFinite(origin.lon) ||
    !Number.isFinite(destination.lat) ||
    !Number.isFinite(destination.lon)
  ) {
    return null;
  }
  return calculateDirectKm(origin.lat, origin.lon, destination.lat, destination.lon);
}
