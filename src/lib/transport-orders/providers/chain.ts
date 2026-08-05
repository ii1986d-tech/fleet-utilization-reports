import { EXTRACTION_SCHEMA_VERSION } from "@/lib/transport-orders/schema";
import type {
  PdfExtractionProvider,
  ProviderExtractInput,
  ProviderExtractOutcome,
} from "@/lib/transport-orders/providers/types";

/**
 * Tries providers in order. Does not change store retry/CAS logic — one extractPdf
 * call may walk the chain. Silent fallback is forbidden at config level; each attempt
 * is distinct and the winning provider name is returned on success.
 */
export class ChainedPdfExtractionProvider implements PdfExtractionProvider {
  readonly providerName: string;
  readonly modelName: string;
  readonly promptVersion: string;
  readonly supportsNativePdf: boolean;
  readonly supportsStructuredOutput: boolean;

  constructor(private readonly providers: PdfExtractionProvider[]) {
    if (providers.length === 0) {
      throw new Error("ChainedPdfExtractionProvider requires at least one provider.");
    }
    const primary = providers[0];
    this.providerName = primary.providerName;
    this.modelName = primary.modelName;
    this.promptVersion = primary.promptVersion;
    this.supportsNativePdf = providers.some((p) => p.supportsNativePdf);
    this.supportsStructuredOutput = providers.some((p) => p.supportsStructuredOutput);
  }

  async healthCheck(): Promise<boolean> {
    for (const p of this.providers) {
      if (await p.healthCheck()) return true;
    }
    return false;
  }

  async extractPdf(input: ProviderExtractInput): Promise<ProviderExtractOutcome> {
    let lastFailure: ProviderExtractOutcome | null = null;
    for (const provider of this.providers) {
      const outcome = await provider.extractPdf(input);
      if (outcome.ok) return outcome;
      lastFailure = outcome;
    }
    return (
      lastFailure ?? {
        ok: false,
        errorClass: "non_retryable",
        message: "All providers in chain failed.",
        providerName: this.providerName,
        modelName: this.modelName,
        promptVersion: this.promptVersion,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
      }
    );
  }
}
