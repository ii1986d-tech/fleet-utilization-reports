import { afterEach, describe, expect, it, vi } from "vitest";
import { resetMapsCache, setCachedRoute } from "@/lib/maps/cache";
import {
  COST_PER_REQUEST_USD,
  getCurrentMonthCost,
  resetCostTracker,
  trackRequest,
} from "@/lib/maps/cost-tracker";
import { calculateRoute } from "@/lib/maps/route-service";
import type { RouteResult } from "@/lib/maps/types";

const apiRoute: RouteResult = {
  distanceKm: 290,
  durationMin: 180,
  routeUrl: "https://www.google.com/maps/dir/Hamburg/Berlin",
  source: "api",
};

describe("maps route service", () => {
  afterEach(() => {
    resetMapsCache();
    resetCostTracker();
    vi.restoreAllMocks();
  });

  it("returns fallback when disabled", async () => {
    const getRouteImpl = vi.fn();
    const result = await calculateRoute("Hamburg", "Berlin", {
      env: { MAPS_API_ENABLED: "false", MAPS_API_KEY: "test-key-not-real" },
      getRouteImpl,
    });
    expect(getRouteImpl).not.toHaveBeenCalled();
    expect(result.source).toBe("fallback");
  });

  it("returns cached route for standard routes", async () => {
    await setCachedRoute("Hamburg", "Berlin", apiRoute);
    const getRouteImpl = vi.fn();
    const result = await calculateRoute("Hamburg", "Berlin", {
      env: { MAPS_API_ENABLED: "true", MAPS_API_KEY: "test-key-not-real" },
      getRouteImpl,
    });
    expect(getRouteImpl).not.toHaveBeenCalled();
    expect(result.source).toBe("cache");
    expect(result.distanceKm).toBe(290);
  });

  it("calls API for non-standard routes and does not cache them", async () => {
    const getRouteImpl = vi.fn(async () => ({
      ...apiRoute,
      distanceKm: 120,
      source: "api" as const,
    }));
    const first = await calculateRoute("Leipzig", "Dresden", {
      env: { MAPS_API_ENABLED: "true", MAPS_API_KEY: "test-key-not-real" },
      getRouteImpl,
    });
    expect(getRouteImpl).toHaveBeenCalledTimes(1);
    expect(first.source).toBe("api");

    const second = await calculateRoute("Leipzig", "Dresden", {
      env: { MAPS_API_ENABLED: "true", MAPS_API_KEY: "test-key-not-real" },
      getRouteImpl,
    });
    expect(getRouteImpl).toHaveBeenCalledTimes(2);
    expect(second.source).toBe("api");
  });

  it("tracks cost after successful API call", async () => {
    const getRouteImpl = vi.fn(async () => apiRoute);
    await calculateRoute("München", "Frankfurt", {
      env: {
        MAPS_API_ENABLED: "true",
        MAPS_API_KEY: "test-key-not-real",
        MAPS_API_MONTHLY_BUDGET: "50",
      },
      getRouteImpl,
    });
    expect(await getCurrentMonthCost()).toBeCloseTo(COST_PER_REQUEST_USD, 6);
  });

  it("returns fallback when budget exceeded", async () => {
    await trackRequest(50);
    const getRouteImpl = vi.fn();
    const result = await calculateRoute("Hamburg", "Berlin", {
      env: {
        MAPS_API_ENABLED: "true",
        MAPS_API_KEY: "test-key-not-real",
        MAPS_API_MONTHLY_BUDGET: "50",
        MAPS_API_WARNING_THRESHOLD: "80",
      },
      getRouteImpl,
    });
    expect(getRouteImpl).not.toHaveBeenCalled();
    expect(result.source).toBe("fallback");
  });

  it("caches standard route after API success", async () => {
    const getRouteImpl = vi.fn(async () => apiRoute);
    const env = {
      MAPS_API_ENABLED: "true",
      MAPS_API_KEY: "test-key-not-real",
      MAPS_API_MONTHLY_BUDGET: "50",
    };
    const first = await calculateRoute("Hamburg", "Berlin", {
      env,
      getRouteImpl,
    });
    expect(first.source).toBe("api");

    const second = await calculateRoute("Hamburg", "Berlin", {
      env,
      getRouteImpl,
    });
    expect(getRouteImpl).toHaveBeenCalledTimes(1);
    expect(second.source).toBe("cache");
  });
});
