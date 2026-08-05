import { afterEach, describe, expect, it } from "vitest";
import {
  CACHE_TTL_MS,
  clearCache,
  getCachedRoute,
  resetMapsCache,
  setCacheClock,
  setCachedRoute,
} from "@/lib/maps/cache";
import {
  getBudgetWarningLevel,
  getCurrentMonthCost,
  isBudgetExceeded,
  resetCostTracker,
  trackRequest,
  COST_PER_REQUEST_USD,
} from "@/lib/maps/cost-tracker";
import type { RouteResult } from "@/lib/maps/types";

const sampleRoute: RouteResult = {
  distanceKm: 780,
  durationMin: 450,
  routeUrl: "https://www.google.com/maps/dir/Hamburg/M%C3%BCnchen",
  source: "api",
};

describe("maps cache", () => {
  afterEach(() => {
    resetMapsCache();
  });

  it("returns cached route for standard routes", async () => {
    await setCachedRoute("Hamburg", "München", sampleRoute);
    const cached = await getCachedRoute("hamburg", "münchen");
    expect(cached).not.toBeNull();
    expect(cached?.source).toBe("cache");
    expect(cached?.distanceKm).toBe(780);
  });

  it("does not cache non-standard routes", async () => {
    await setCachedRoute("Leipzig", "Dresden", sampleRoute);
    const cached = await getCachedRoute("Leipzig", "Dresden");
    expect(cached).toBeNull();
  });

  it("expires after 7 days (mock time)", async () => {
    let now = 1_000_000;
    setCacheClock(() => now);
    await setCachedRoute("Hamburg", "Berlin", sampleRoute);
    expect(await getCachedRoute("Hamburg", "Berlin")).not.toBeNull();

    now = 1_000_000 + CACHE_TTL_MS - 1;
    expect(await getCachedRoute("Hamburg", "Berlin")).not.toBeNull();

    now = 1_000_000 + CACHE_TTL_MS;
    expect(await getCachedRoute("Hamburg", "Berlin")).toBeNull();
  });

  it("clearCache removes entries", async () => {
    await setCachedRoute("Berlin", "Frankfurt", sampleRoute);
    await clearCache();
    expect(await getCachedRoute("Berlin", "Frankfurt")).toBeNull();
  });
});

describe("maps cost tracker", () => {
  afterEach(() => {
    resetCostTracker();
  });

  it("counts requests correctly", async () => {
    await trackRequest(COST_PER_REQUEST_USD);
    await trackRequest(COST_PER_REQUEST_USD);
    expect(await getCurrentMonthCost()).toBeCloseTo(0.01, 6);
  });

  it("warns at 80% budget", async () => {
    const env = {
      MAPS_API_MONTHLY_BUDGET: "50",
      MAPS_API_WARNING_THRESHOLD: "80",
    };
    // 80% of $50 = $40 → 8000 requests * $0.005
    await trackRequest(40);
    expect(await getBudgetWarningLevel(env)).toBe("warning");
    expect(await isBudgetExceeded(env)).toBe(false);
  });

  it("blocks at 100% budget", async () => {
    const env = {
      MAPS_API_MONTHLY_BUDGET: "50",
      MAPS_API_WARNING_THRESHOLD: "80",
    };
    await trackRequest(50);
    expect(await getBudgetWarningLevel(env)).toBe("exceeded");
    expect(await isBudgetExceeded(env)).toBe(true);
  });
});
