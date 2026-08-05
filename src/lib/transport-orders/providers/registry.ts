import { DEFAULT_PROVIDER_NAME, TRANSPORT_ORDER_PROVIDER_ENV } from "@/lib/transport-orders/constants";
import { MockPdfExtractionProvider, type MockProviderMode } from "@/lib/transport-orders/providers/mock";
import type { PdfExtractionProvider } from "@/lib/transport-orders/providers/types";

/**
 * Live Gemini/xAI adapters are intentionally not registered while DS-005 is OPEN.
 * Only mock is available for PACK-006 Apply.
 */
export function resolveExtractionProvider(options?: {
  mode?: MockProviderMode;
  env?: NodeJS.ProcessEnv;
}): PdfExtractionProvider {
  const env = options?.env ?? process.env;
  const name = (env[TRANSPORT_ORDER_PROVIDER_ENV] ?? DEFAULT_PROVIDER_NAME).toLowerCase();
  switch (name) {
    case "mock":
      return new MockPdfExtractionProvider(options?.mode ?? "success_simple");
    case "gemini":
    case "xai":
    case "grok":
      throw new Error(
        `Provider '${name}' is blocked by DS-005. Use TRANSPORT_ORDER_PROVIDER=mock until approved.`,
      );
    default:
      throw new Error(`Unknown TRANSPORT_ORDER_PROVIDER='${name}'. Allowed: mock`);
  }
}
