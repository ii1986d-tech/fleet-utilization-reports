import { EXTRACTION_SCHEMA_VERSION, PROMPT_VERSION_LIVE } from "@/lib/transport-orders/schema";
import { classifyHttpStatus, fetchWithTimeout, type FetchLike } from "@/lib/transport-orders/providers/http";
import { normalizeProviderExtraction } from "@/lib/transport-orders/providers/normalize";
import { buildExtractionPrompt, extractJsonObject } from "@/lib/transport-orders/providers/prompt";
import type {
  PdfExtractionProvider,
  ProviderExtractInput,
  ProviderExtractOutcome,
} from "@/lib/transport-orders/providers/types";

export type OpenAiCompatibleConfig = {
  providerName: string;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  fetchImpl?: FetchLike;
};

/**
 * OpenAI-compatible chat completions adapter (Grok/xAI, Groq, Qwen-compatible endpoints).
 * Never logs request/response bodies or PDF bytes.
 */
export class OpenAiCompatiblePdfExtractionProvider implements PdfExtractionProvider {
  readonly providerName: string;
  readonly modelName: string;
  readonly promptVersion = PROMPT_VERSION_LIVE;
  readonly supportsNativePdf = true;
  readonly supportsStructuredOutput = true;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl?: FetchLike;

  constructor(config: OpenAiCompatibleConfig) {
    this.providerName = config.providerName;
    this.modelName = config.modelName;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.fetchImpl = config.fetchImpl;
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.apiKey && this.baseUrl && this.modelName);
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
      const b64 = input.documentBytes.toString("base64");
      const body = {
        model: this.modelName,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildExtractionPrompt(input.filename) },
              {
                type: "file",
                file: {
                  filename: input.filename,
                  file_data: `data:application/pdf;base64,${b64}`,
                },
              },
            ],
          },
        ],
      };

      const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        timeoutMs: input.timeoutMs,
        fetchImpl: this.fetchImpl,
      });

      if (!res.ok) {
        return {
          ok: false,
          errorClass: classifyHttpStatus(res.status),
          message: `Provider HTTP ${res.status}`,
          ...meta,
        };
      }

      const payload = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const text = payload.choices?.[0]?.message?.content;
      if (!text) {
        return {
          ok: false,
          errorClass: "retryable",
          message: "Provider returned empty content.",
          ...meta,
        };
      }
      const json = extractJsonObject(text);
      const result = normalizeProviderExtraction(json);
      return {
        ok: true,
        result,
        latencyMs: Date.now() - started,
        ...meta,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Provider request failed";
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
