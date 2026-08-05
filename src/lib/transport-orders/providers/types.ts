import type { ExtractionResult } from "@/lib/transport-orders/schema";

export type ProviderErrorClass = "retryable" | "non_retryable";

export type ProviderExtractInput = {
  documentBytes: Buffer;
  filename: string;
  timeoutMs: number;
};

export type ProviderExtractSuccess = {
  ok: true;
  result: ExtractionResult;
  providerName: string;
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
  latencyMs: number;
};

export type ProviderExtractFailure = {
  ok: false;
  errorClass: ProviderErrorClass;
  message: string;
  providerName: string;
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
};

export type ProviderExtractOutcome = ProviderExtractSuccess | ProviderExtractFailure;

export interface PdfExtractionProvider {
  providerName: string;
  modelName: string;
  promptVersion: string;
  supportsNativePdf: boolean;
  supportsStructuredOutput: boolean;
  extractPdf(input: ProviderExtractInput): Promise<ProviderExtractOutcome>;
  healthCheck(): Promise<boolean>;
}
