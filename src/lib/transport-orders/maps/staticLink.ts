import type { TransportOrderStop } from "@/lib/transport-orders/types";

/**
 * PACK-006: build a static external Google Maps link from reviewed stops.
 * Does NOT call Maps routing / Directions APIs and does not calculate distance.
 */
export function buildStaticMapsLink(stops: TransportOrderStop[]): string | null {
  const ordered = stops.slice().sort((a, b) => a.sequence - b.sequence);
  if (ordered.length === 0) return null;

  const parts = ordered.map((s) => {
    const a = s.address;
    const chunks = [a.company, a.street, a.houseNumber, a.postalCode, a.city, a.country, a.rawAddressText]
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    return chunks.join(", ");
  }).filter(Boolean);

  if (parts.length === 0) return null;

  const path = parts.map((p) => encodeURIComponent(p)).join("/");
  return `https://www.google.com/maps/dir/${path}`;
}
