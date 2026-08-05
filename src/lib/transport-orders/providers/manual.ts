import { EXTRACTION_SCHEMA_VERSION, PROMPT_VERSION_MANUAL } from "@/lib/transport-orders/schema";
import { manualSkeletonExtraction } from "@/lib/transport-orders/providers/normalize";
import type {
  PdfExtractionProvider,
  ProviderExtractInput,
  ProviderExtractOutcome,
} from "@/lib/transport-orders/providers/types";

/**
 * Final fallback: no external AI. Creates a null-heavy skeleton working order
 * for human field entry / confirmation.
 */
export class ManualPdfExtractionProvider implements PdfExtractionProvider {
  readonly providerName = "manual";
  readonly modelName = "manual-human-v1";
  readonly promptVersion = PROMPT_VERSION_MANUAL;
  readonly supportsNativePdf = false;
  readonly supportsStructuredOutput = true;

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async extractPdf(input: ProviderExtractInput): Promise<ProviderExtractOutcome> {
    const started = Date.now();
    return {
      ok: true,
      result: manualSkeletonExtraction(input.filename),
      providerName: this.providerName,
      modelName: this.modelName,
      promptVersion: this.promptVersion,
      schemaVersion: EXTRACTION_SCHEMA_VERSION,
      latencyMs: Date.now() - started,
    };
  }
}
