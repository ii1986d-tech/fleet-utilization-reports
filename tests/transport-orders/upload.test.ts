import { describe, expect, it } from "vitest";
import { MAX_PDF_BYTES } from "@/lib/transport-orders/constants";
import { syntheticPdfBytes, validatePdfUpload } from "@/lib/transport-orders/upload/validate";

describe("PACK-006 PDF upload validation", () => {
  it("accepts synthetic PDF with valid magic bytes", () => {
    const result = validatePdfUpload({
      filename: "order.pdf",
      mimeType: "application/pdf",
      bytes: syntheticPdfBytes("ok"),
    });
    expect("code" in result).toBe(false);
    if (!("code" in result)) {
      expect(result.sha256Hex).toHaveLength(64);
      expect(result.storageKey.startsWith("transport-orders/")).toBe(true);
    }
  });

  it("rejects non-PDF extension", () => {
    const result = validatePdfUpload({
      filename: "order.txt",
      mimeType: "application/pdf",
      bytes: syntheticPdfBytes(),
    });
    expect("code" in result && result.code).toBe("INVALID_PDF");
  });

  it("rejects missing MIME", () => {
    const result = validatePdfUpload({
      filename: "order.pdf",
      mimeType: "",
      bytes: syntheticPdfBytes(),
    });
    expect("code" in result && result.code).toBe("INVALID_PDF");
    if ("code" in result) {
      expect(result.details?.reason).toBe("mime_missing");
    }
  });

  it("rejects null MIME", () => {
    const result = validatePdfUpload({
      filename: "order.pdf",
      mimeType: null,
      bytes: syntheticPdfBytes(),
    });
    expect("code" in result && result.code).toBe("INVALID_PDF");
  });

  it("rejects MIME mismatch", () => {
    const result = validatePdfUpload({
      filename: "order.pdf",
      mimeType: "image/png",
      bytes: syntheticPdfBytes(),
    });
    expect("code" in result && result.code).toBe("INVALID_PDF");
  });

  it("rejects invalid signature", () => {
    const result = validatePdfUpload({
      filename: "order.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("not-a-pdf"),
    });
    expect("code" in result && result.code).toBe("INVALID_PDF");
  });

  it("rejects oversized file", () => {
    const bytes = Buffer.concat([syntheticPdfBytes(), Buffer.alloc(MAX_PDF_BYTES)]);
    const result = validatePdfUpload({
      filename: "order.pdf",
      mimeType: "application/pdf",
      bytes,
    });
    expect("code" in result && result.code).toBe("INVALID_PDF");
  });
});
