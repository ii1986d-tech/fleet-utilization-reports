import {
  clearCache,
  getCachedRoute,
  setCachedRoute,
} from "@/lib/maps/cache";
import { getRoute, type FetchLike, type GetRouteOptions } from "@/lib/maps/client";
import { isMapsApiEnabled } from "@/lib/maps/config";
import {
  COST_PER_REQUEST_USD,
  isBudgetExceeded,
  trackRequest,
} from "@/lib/maps/cost-tracker";
import { isStandardRoute } from "@/lib/maps/standard-routes";
import { buildStaticRouteUrl } from "@/lib/maps/static-link";
import type { RouteResult } from "@/lib/maps/types";

export type CalculateRouteOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** Injected for tests; defaults to live client. */
  getRouteImpl?: (
    origin: string,
    destination: string,
    options?: GetRouteOptions,
  ) => Promise<RouteResult>;
};

function fallbackResult(origin: string, destination: string): RouteResult {
  return {
    distanceKm: 0,
    durationMin: 0,
    routeUrl: buildStaticRouteUrl(origin, destination),
    source: "fallback",
  };
}

/**
 * Orchestrates kill switch, budget, standard-route cache, and Directions API.
 */
export async function calculateRoute(
  origin: string,
  destination: string,
  options: CalculateRouteOptions = {},
): Promise<RouteResult> {
  const env = options.env ?? process.env;

  if (!isMapsApiEnabled(env)) {
    return fallbackResult(origin, destination);
  }

  if (await isBudgetExceeded(env)) {
    return fallbackResult(origin, destination);
  }

  if (isStandardRoute(origin, destination)) {
    const cached = await getCachedRoute(origin, destination);
    if (cached) return cached;
  }

  const getRouteImpl = options.getRouteImpl ?? getRoute;
  const result = await getRouteImpl(origin, destination, {
    env,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });

  if (result.source === "api") {
    await trackRequest(COST_PER_REQUEST_USD);
    if (isStandardRoute(origin, destination)) {
      await setCachedRoute(origin, destination, result);
    }
  }

  return result;
}

export { clearCache };
