import {
  DEFAULT_PROVIDER_NAME,
  TRANSPORT_ORDER_PROVIDER_ENV,
} from "@/lib/transport-orders/constants";
import { ChainedPdfExtractionProvider } from "@/lib/transport-orders/providers/chain";
import {
  normalizeProviderName,
  parseFallbackList,
  requireServerSecret,
  type ProviderName,
  type RegistryResolveOptions,
} from "@/lib/transport-orders/providers/config";
import { GeminiPdfExtractionProvider } from "@/lib/transport-orders/providers/gemini";
import { ManualPdfExtractionProvider } from "@/lib/transport-orders/providers/manual";
import { MockPdfExtractionProvider } from "@/lib/transport-orders/providers/mock";
import { OpenAiCompatiblePdfExtractionProvider } from "@/lib/transport-orders/providers/openai-compatible";
import type { PdfExtractionProvider } from "@/lib/transport-orders/providers/types";

function buildNamedProvider(
  name: ProviderName,
  options: RegistryResolveOptions,
): PdfExtractionProvider {
  const env = options.env ?? process.env;
  switch (name) {
    case "mock":
      return new MockPdfExtractionProvider(options.mode ?? "success_simple");
    case "manual":
      return new ManualPdfExtractionProvider();
    case "gemini": {
      const modelName =
        env.GEMINI_MODEL_ID?.trim() || env.GEMINI_MODEL?.trim() || undefined;
      return new GeminiPdfExtractionProvider({
        apiKey: requireServerSecret(env, "GEMINI_API_KEY"),
        modelName,
        apiBaseUrl: env.GEMINI_API_BASE_URL,
        fetchImpl: options.fetchImpl,
      });
    }
    case "grok": {
      const grokKey = env.GROK_API_KEY?.trim() || env.XAI_API_KEY?.trim();
      if (!grokKey) {
        throw new Error(
          "Missing server-only secret GROK_API_KEY or XAI_API_KEY. See docs/LIVE-AI-PROVIDER-SETUP.md",
        );
      }
      return new OpenAiCompatiblePdfExtractionProvider({
        providerName: "grok",
        modelName: env.GROK_MODEL?.trim() || env.XAI_MODEL?.trim() || "grok-2-latest",
        apiKey: grokKey,
        baseUrl: env.GROK_API_BASE_URL?.trim() || env.XAI_API_BASE_URL?.trim() || "https://api.x.ai/v1",
        fetchImpl: options.fetchImpl,
      });
    }
    case "groq":
      return new OpenAiCompatiblePdfExtractionProvider({
        providerName: "groq",
        modelName: env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
        apiKey: requireServerSecret(env, "GROQ_API_KEY"),
        baseUrl: env.GROQ_API_BASE_URL?.trim() || "https://api.groq.com/openai/v1",
        fetchImpl: options.fetchImpl,
      });
    case "qwen":
      return new OpenAiCompatiblePdfExtractionProvider({
        providerName: "qwen",
        modelName: env.QWEN_MODEL?.trim() || "qwen-vl-max",
        apiKey: requireServerSecret(env, "QWEN_API_KEY"),
        baseUrl:
          env.QWEN_API_BASE_URL?.trim() ||
          "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        fetchImpl: options.fetchImpl,
      });
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unhandled provider: ${_exhaustive}`);
    }
  }
}

/**
 * Resolve extraction provider(s).
 * DS-005 APPROVED — live providers are registered. Default remains `mock`.
 * Primary + fallbacks: TRANSPORT_ORDER_PROVIDER + TRANSPORT_ORDER_FALLBACK_PROVIDERS
 * (default fallbacks: grok,qwen,manual). Mock/manual skip the live fallback chain.
 */
export function resolveExtractionProvider(
  options: RegistryResolveOptions = {},
): PdfExtractionProvider {
  const env = options.env ?? process.env;
  const raw = (env[TRANSPORT_ORDER_PROVIDER_ENV] ?? DEFAULT_PROVIDER_NAME).toLowerCase();
  const primaryName = normalizeProviderName(raw);
  if (!primaryName) {
    throw new Error(
      `Unknown TRANSPORT_ORDER_PROVIDER='${raw}'. Allowed: mock, gemini, grok, groq, qwen, manual, xai`,
    );
  }

  const primary = buildNamedProvider(primaryName, options);
  const withFallbacks = options.withFallbacks ?? true;
  if (!withFallbacks || primaryName === "mock" || primaryName === "manual") {
    return primary;
  }

  const fallbackNames = parseFallbackList(env).filter((n) => n !== primaryName);
  if (fallbackNames.length === 0) return primary;

  const chain = [primary, ...fallbackNames.map((n) => buildNamedProvider(n, options))];
  return new ChainedPdfExtractionProvider(chain);
}
