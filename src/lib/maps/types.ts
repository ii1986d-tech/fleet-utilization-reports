export type RouteSource = "api" | "cache" | "fallback";

export type RouteResult = {
  distanceKm: number;
  durationMin: number;
  routeUrl: string;
  source: RouteSource;
};

export type BudgetWarningLevel = "ok" | "warning" | "exceeded";
