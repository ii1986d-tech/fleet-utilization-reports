import { afterEach, describe, expect, it, vi } from "vitest";
import { getRoute } from "@/lib/maps/client";

function directionsOkResponse(meters: number, seconds: number): Response {
  return new Response(
    JSON.stringify({
      status: "OK",
      routes: [
        {
          legs: [
            {
              distance: { value: meters },
              duration: { value: seconds },
            },
          ],
        },
      ],
    }),
    { status: 200 },
  );
}

describe("maps client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns fallback when API disabled", async () => {
    const fetchImpl = vi.fn();
    const result = await getRoute("Hamburg", "Berlin", {
      enabled: false,
      apiKey: "test-key-not-real",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.source).toBe("fallback");
    expect(result.routeUrl).toContain("google.com/maps/dir/");
    expect(result.distanceKm).toBe(0);
  });

  it("returns fallback when API key missing", async () => {
    const fetchImpl = vi.fn();
    const result = await getRoute("Hamburg", "Berlin", {
      enabled: true,
      apiKey: null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.source).toBe("fallback");
  });

  it("returns fallback on timeout after one retry", async () => {
    const fetchImpl = vi.fn(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    const result = await getRoute("Hamburg", "Berlin", {
      enabled: true,
      apiKey: "test-key-not-real",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 50,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.source).toBe("fallback");
  });

  it("returns fallback on quota exceeded (OVER_QUERY_LIMIT)", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ status: "OVER_QUERY_LIMIT", routes: [] }), {
          status: 200,
        }),
    );
    const result = await getRoute("Hamburg", "Berlin", {
      enabled: true,
      apiKey: "test-key-not-real",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("fallback");
  });

  it("returns fallback on HTTP 429", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("quota", { status: 429 }),
    );
    const result = await getRoute("Köln", "Stuttgart", {
      enabled: true,
      apiKey: "test-key-not-real",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.source).toBe("fallback");
  });

  it("parses Directions response without logging the key", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain("maps.googleapis.com/maps/api/directions/json");
      expect(url).toContain("key=");
      return directionsOkResponse(250_000, 9_000);
    });
    const result = await getRoute("Berlin", "Frankfurt", {
      enabled: true,
      apiKey: "test-key-not-real",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.source).toBe("api");
    expect(result.distanceKm).toBe(250);
    expect(result.durationMin).toBe(150);
    for (const call of warn.mock.calls) {
      const blob = call.map(String).join(" ");
      expect(blob).not.toContain("test-key-not-real");
      expect(blob).not.toMatch(/NEXT_PUBLIC/);
    }
  });
});
