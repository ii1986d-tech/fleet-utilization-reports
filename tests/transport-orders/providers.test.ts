import { describe, expect, it, vi } from "vitest";
import { EXTRACTION_SCHEMA_VERSION } from "@/lib/transport-orders/schema";
import { ChainedPdfExtractionProvider } from "@/lib/transport-orders/providers/chain";
import { GeminiPdfExtractionProvider } from "@/lib/transport-orders/providers/gemini";
import { ManualPdfExtractionProvider } from "@/lib/transport-orders/providers/manual";
import { MockPdfExtractionProvider } from "@/lib/transport-orders/providers/mock";
import { normalizeProviderExtraction } from "@/lib/transport-orders/providers/normalize";
import { OpenAiCompatiblePdfExtractionProvider } from "@/lib/transport-orders/providers/openai-compatible";
import { extractJsonObject } from "@/lib/transport-orders/providers/prompt";
import { resolveExtractionProvider } from "@/lib/transport-orders/providers/registry";
import { syntheticPdfBytes } from "@/lib/transport-orders/upload/validate";

const syntheticExtraction = {
  schemaVersion: EXTRACTION_SCHEMA_VERSION,
  tourNumber: "SYN-LIVE-001",
  borderoNumber: null,
  businessIdentifier: "SYN-LIVE-001",
  referenceNumbers: ["R1"],
  responsibleClerk: null,
  remarks: null,
  freight: { amount: 10, currency: "EUR" },
  paidKilometers: 100,
  emptyKilometers: null,
  truckLicensePlate: "SYN-1",
  trailerLicensePlate: null,
  cargoWeightKg: null,
  cargoLoadingMeters: null,
  cargoVolumeM3: null,
  cargoDescription: "Synthetic",
  stops: [
    {
      sequence: 1,
      type: "pickup",
      address: {
        company: "A",
        street: "S1",
        houseNumber: null,
        postalCode: "1000",
        city: "CityA",
        country: "DE",
        rawAddressText: null,
      },
      date: "2026-08-01",
      timeWindow: null,
      references: [],
      remarks: null,
    },
    {
      sequence: 2,
      type: "delivery",
      address: {
        company: "B",
        street: null,
        houseNumber: null,
        postalCode: null,
        city: "CityB",
        country: "FR",
        rawAddressText: null,
      },
      date: null,
      timeWindow: null,
      references: [],
      remarks: null,
    },
  ],
  partialLoadPositions: [],
  transportLegs: [],
};

describe("provider normalize + prompt helpers", () => {
  it("normalizes synthetic fixture JSON to schema", () => {
    const result = normalizeProviderExtraction(syntheticExtraction);
    expect(result.businessIdentifier).toBe("SYN-LIVE-001");
    expect(result.stops).toHaveLength(2);
  });

  it("extracts JSON object from fenced text", () => {
    const raw = `Here you go:\n\`\`\`json\n${JSON.stringify(syntheticExtraction)}\n\`\`\``;
    expect(extractJsonObject(raw)).toMatchObject({ tourNumber: "SYN-LIVE-001" });
  });
});

describe("manual + mock providers (no network)", () => {
  it("manual returns skeleton without calling fetch", async () => {
    const fetchImpl = vi.fn();
    const provider = new ManualPdfExtractionProvider();
    const outcome = await provider.extractPdf({
      documentBytes: syntheticPdfBytes("manual"),
      filename: "order-abc.pdf",
      timeoutMs: 5_000,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.providerName).toBe("manual");
      expect(outcome.result.stops.length).toBeGreaterThanOrEqual(2);
      expect(outcome.result.remarks).toMatch(/Manual extraction/i);
    }
  });

  it("mock success_simple still works", async () => {
    const provider = new MockPdfExtractionProvider("success_simple");
    const outcome = await provider.extractPdf({
      documentBytes: syntheticPdfBytes("mock"),
      filename: "syn.pdf",
      timeoutMs: 5_000,
    });
    expect(outcome.ok).toBe(true);
  });
});

describe("live adapters with mocked fetch (synthetic only)", () => {
  it("gemini parses generateContent JSON", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(syntheticExtraction) }] } }],
        }),
        { status: 200 },
      ),
    );
    const provider = new GeminiPdfExtractionProvider({
      apiKey: "test-key-not-real",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const outcome = await provider.extractPdf({
      documentBytes: syntheticPdfBytes("gemini"),
      filename: "syn.pdf",
      timeoutMs: 5_000,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const callArgs = fetchImpl.mock.calls[0] as unknown as [unknown, unknown?];
    const url = String(callArgs[0] ?? "");
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).not.toContain("NEXT_PUBLIC");
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.result.tourNumber).toBe("SYN-LIVE-001");
  });

  it("openai-compatible (grok) parses chat completions JSON", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(syntheticExtraction) } }],
        }),
        { status: 200 },
      ),
    );
    const provider = new OpenAiCompatiblePdfExtractionProvider({
      providerName: "grok",
      modelName: "grok-test",
      apiKey: "test-key-not-real",
      baseUrl: "https://api.x.ai/v1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const outcome = await provider.extractPdf({
      documentBytes: syntheticPdfBytes("grok"),
      filename: "syn.pdf",
      timeoutMs: 5_000,
    });
    expect(outcome.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("chain falls back to manual when primary fails", async () => {
    const failing = new GeminiPdfExtractionProvider({
      apiKey: "test-key-not-real",
      fetchImpl: (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch,
    });
    const chain = new ChainedPdfExtractionProvider([failing, new ManualPdfExtractionProvider()]);
    const outcome = await chain.extractPdf({
      documentBytes: syntheticPdfBytes("chain"),
      filename: "syn.pdf",
      timeoutMs: 5_000,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.providerName).toBe("manual");
  });
});

describe("registry", () => {
  it("defaults to mock", () => {
    const p = resolveExtractionProvider({
      env: {} as NodeJS.ProcessEnv,
      withFallbacks: false,
    });
    expect(p.providerName).toBe("mock");
  });

  it("resolves gemini when key present (no network)", () => {
    const p = resolveExtractionProvider({
      env: {
        TRANSPORT_ORDER_PROVIDER: "gemini",
        GEMINI_API_KEY: "test-key-not-real",
        TRANSPORT_ORDER_FALLBACK_PROVIDERS: "manual",
      } as unknown as NodeJS.ProcessEnv,
      withFallbacks: false,
    });
    expect(p.providerName).toBe("gemini");
  });

  it("resolves manual and grok/qwen names", () => {
    expect(
      resolveExtractionProvider({
        env: { TRANSPORT_ORDER_PROVIDER: "manual" } as unknown as NodeJS.ProcessEnv,
      }).providerName,
    ).toBe("manual");
    expect(
      resolveExtractionProvider({
        env: {
          TRANSPORT_ORDER_PROVIDER: "grok",
          XAI_API_KEY: "test-key-not-real",
        } as unknown as NodeJS.ProcessEnv,
        withFallbacks: false,
      }).providerName,
    ).toBe("grok");
    expect(
      resolveExtractionProvider({
        env: {
          TRANSPORT_ORDER_PROVIDER: "qwen",
          QWEN_API_KEY: "test-key-not-real",
        } as unknown as NodeJS.ProcessEnv,
        withFallbacks: false,
      }).providerName,
    ).toBe("qwen");
  });

  it("requires secrets for live providers", () => {
    expect(() =>
      resolveExtractionProvider({
        env: { TRANSPORT_ORDER_PROVIDER: "gemini" } as unknown as NodeJS.ProcessEnv,
        withFallbacks: false,
      }),
    ).toThrow(/GEMINI_API_KEY/);
  });

  it("rejects unknown provider names", () => {
    expect(() =>
      resolveExtractionProvider({
        env: { TRANSPORT_ORDER_PROVIDER: "nope" } as unknown as NodeJS.ProcessEnv,
      }),
    ).toThrow(/Unknown TRANSPORT_ORDER_PROVIDER/);
  });
});
