import { getMapsApiKey, isMapsApiEnabled } from "@/lib/maps/config";
import { buildStaticRouteUrl } from "@/lib/maps/static-link";
import type { RouteResult } from "@/lib/maps/types";

export type FetchLike = typeof fetch;

export type GetRouteOptions = {
  apiKey?: string | null;
  enabled?: boolean;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";

type DirectionsLeg = {
  distance?: { value?: number };
  duration?: { value?: number };
};

type DirectionsResponse = {
  status?: string;
  routes?: Array<{ legs?: DirectionsLeg[] }>;
};

function fallbackResult(origin: string, destination: string): RouteResult {
  return {
    distanceKm: 0,
    durationMin: 0,
    routeUrl: buildStaticRouteUrl(origin, destination),
    source: "fallback",
  };
}

/** Safe error codes only — never log keys, URLs with keys, or business payloads. */
function logMapsSafe(code: string): void {
  console.warn(`[maps] ${code}`);
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { method: "GET", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseDirectionsBody(body: DirectionsResponse): {
  distanceKm: number;
  durationMin: number;
} | null {
  const status = body.status ?? "";
  if (status === "OVER_QUERY_LIMIT") {
    throw Object.assign(new Error("quota"), { code: "maps_quota_exceeded" as const });
  }
  if (status !== "OK") {
    throw Object.assign(new Error("api_status"), {
      code: "maps_api_error" as const,
    });
  }
  const leg = body.routes?.[0]?.legs?.[0];
  const meters = leg?.distance?.value;
  const seconds = leg?.duration?.value;
  if (
    typeof meters !== "number" ||
    !Number.isFinite(meters) ||
    typeof seconds !== "number" ||
    !Number.isFinite(seconds)
  ) {
    throw Object.assign(new Error("parse"), { code: "maps_parse_error" as const });
  }
  return {
    distanceKm: meters / 1000,
    durationMin: seconds / 60,
  };
}

async function callDirectionsOnce(
  origin: string,
  destination: string,
  apiKey: string,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<RouteResult> {
  const url = new URL(DIRECTIONS_URL);
  url.searchParams.set("origin", origin.trim());
  url.searchParams.set("destination", destination.trim());
  url.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetchWithTimeout(fetchImpl, url.toString(), timeoutMs);
  } catch (err) {
    if (isAbortError(err)) {
      throw Object.assign(new Error("timeout"), { code: "maps_timeout" as const });
    }
    throw Object.assign(new Error("network"), {
      code: "maps_network_error" as const,
    });
  }

  if (response.status === 429) {
    throw Object.assign(new Error("quota"), { code: "maps_quota_exceeded" as const });
  }
  if (!response.ok) {
    throw Object.assign(new Error("http"), { code: "maps_http_error" as const });
  }

  let body: DirectionsResponse;
  try {
    body = (await response.json()) as DirectionsResponse;
  } catch {
    throw Object.assign(new Error("parse"), { code: "maps_parse_error" as const });
  }

  const parsed = parseDirectionsBody(body);
  if (!parsed) {
    throw Object.assign(new Error("parse"), { code: "maps_parse_error" as const });
  }

  return {
    distanceKm: parsed.distanceKm,
    durationMin: parsed.durationMin,
    routeUrl: buildStaticRouteUrl(origin, destination),
    source: "api",
  };
}

/**
 * Google Directions API client (server-only).
 * Never uses NEXT_PUBLIC_* keys. Falls back to static Maps link on any failure.
 */
export async function getRoute(
  origin: string,
  destination: string,
  options: GetRouteOptions = {},
): Promise<RouteResult> {
  const env = options.env ?? process.env;
  const enabled =
    options.enabled !== undefined ? options.enabled : isMapsApiEnabled(env);
  if (!enabled) {
    logMapsSafe("maps_disabled");
    return fallbackResult(origin, destination);
  }

  const apiKey =
    options.apiKey !== undefined ? options.apiKey : getMapsApiKey(env);
  if (!apiKey) {
    logMapsSafe("maps_key_missing");
    return fallbackResult(origin, destination);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    return await callDirectionsOnce(
      origin,
      destination,
      apiKey,
      fetchImpl,
      timeoutMs,
    );
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "maps_api_error";

    if (code === "maps_timeout") {
      logMapsSafe("maps_timeout_retry");
      try {
        return await callDirectionsOnce(
          origin,
          destination,
          apiKey,
          fetchImpl,
          timeoutMs,
        );
      } catch (retryErr) {
        const retryCode =
          retryErr && typeof retryErr === "object" && "code" in retryErr
            ? String((retryErr as { code: string }).code)
            : "maps_api_error";
        logMapsSafe(retryCode);
        return fallbackResult(origin, destination);
      }
    }

    logMapsSafe(code);
    return fallbackResult(origin, destination);
  }
}
