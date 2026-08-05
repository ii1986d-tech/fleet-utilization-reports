import { isStandardRoute, routeCacheKey } from "@/lib/maps/standard-routes";
import type { RouteResult } from "@/lib/maps/types";

/** Standard-route distance cache TTL: 7 days. */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheEntry = {
  route: RouteResult;
  expiresAt: number;
};

type CacheState = {
  store: Map<string, CacheEntry>;
  now: () => number;
};

const state: CacheState = {
  store: new Map(),
  now: () => Date.now(),
};

/** Test helper: replace clock used for TTL checks. */
export function setCacheClock(now: () => number): void {
  state.now = now;
}

/** Test helper: clear all cached routes and reset clock. */
export function resetMapsCache(): void {
  state.store = new Map();
  state.now = () => Date.now();
}

export async function getCachedRoute(
  origin: string,
  destination: string,
): Promise<RouteResult | null> {
  const key = routeCacheKey(origin, destination);
  const entry = state.store.get(key);
  if (!entry) return null;
  if (state.now() >= entry.expiresAt) {
    state.store.delete(key);
    return null;
  }
  return {
    ...entry.route,
    source: "cache",
  };
}

/**
 * Persist a route distance for standard corridors only.
 * Non-standard routes are ignored (live API path, no cache).
 */
export async function setCachedRoute(
  origin: string,
  destination: string,
  route: RouteResult,
): Promise<void> {
  if (!isStandardRoute(origin, destination)) return;
  const key = routeCacheKey(origin, destination);
  state.store.set(key, {
    route: {
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      routeUrl: route.routeUrl,
      source: "cache",
    },
    expiresAt: state.now() + CACHE_TTL_MS,
  });
}

export async function clearCache(): Promise<void> {
  state.store.clear();
}
