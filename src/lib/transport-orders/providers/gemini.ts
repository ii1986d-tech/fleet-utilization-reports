import { EXTRACTION_SCHEMA_VERSION, PROMPT_VERSION_LIVE } from "@/lib/transport-orders/schema";
import { classifyHttpStatus, fetchWithTimeout, type FetchLike } from "@/lib/transport-orders/providers/http";
import { normalizeProviderExtraction } from "@/lib/transport-orders/providers/normalize";
import { buildExtractionPrompt, extractJsonObject } from "@/lib/transport-orders/providers/prompt";
import type {
  PdfExtractionProvider,
  ProviderExtractInput,
  ProviderExtractOutcome,
} from "@/lib/transport-orders/providers/types";

export type GeminiProviderOptions = {
  apiKey: string;
  modelName?: string;
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
};

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiPdfExtractionProvider implements PdfExtractionProvider {
  readonly providerName = "gemini";
  readonly modelName: string;
  readonly promptVersion = PROMPT_VERSION_LIVE;
  readonly supportsNativePdf = true;
  readonly supportsStructuredOutput = true;

  private readonly apiKey: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl?: FetchLike;

  constructor(options: GeminiProviderOptions) {
    this.apiKey = options.apiKey;
    this.modelName = options.modelName?.trim() || DEFAULT_GEMINI_MODEL;
    this.apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_GEMINI_BASE).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl;
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async extractPdf(input: ProviderExtractInput): Promise<ProviderExtractOutcome> {
    const started = Date.now();
    const meta = {
      providerName: this.providerName,
      modelName: this.modelName,
      promptVersion: this.promptVersion,
      schemaVersion: EXTRACTION_SCHEMA_VERSION,
    };
    try {
      const url = `${this.apiBaseUrl}/models/${encodeURIComponent(this.modelName)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
      const body = {
        contents: [
          {
            role: "user",
            parts: [
              { text: buildExtractionPrompt(input.filename) },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: input.documentBytes.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      };

      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: input.timeoutMs,
        fetchImpl: this.fetchImpl,
      });

      if (!res.ok) {
        return {
          ok: false,
          errorClass: classifyHttpStatus(res.status),
          message: `Gemini HTTP ${res.status}`,
          ...meta,
        };
      }

      const payload = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text.trim()) {
        return {
          ok: false,
          errorClass: "retryable",
          message: "Gemini returned empty content.",
          ...meta,
        };
      }
      const result = normalizeProviderExtraction(extractJsonObject(text));
      return {
        ok: true,
        result,
        latencyMs: Date.now() - started,
        ...meta,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gemini request failed";
      const retryable = /timed out|Timeout|ECONNRESET|ENOTFOUND|fetch failed/i.test(message);
      return {
        ok: false,
        errorClass: retryable ? "retryable" : "non_retryable",
        message,
        ...meta,
      };
    }
  }
}
