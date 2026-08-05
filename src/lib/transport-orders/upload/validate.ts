import { createHash, randomUUID } from "node:crypto";
import { appError, type AppError } from "@/lib/assignments/errors";
import { MAX_PDF_BYTES } from "@/lib/transport-orders/constants";

const PDF_MAGIC = Buffer.from("%PDF");

export type ValidatedPdfUpload = {
  bytes: Buffer;
  sha256Hex: string;
  sanitizedFilename: string;
  storageKey: string;
  sizeBytes: number;
};

function sanitizeFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "upload.pdf";
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180);
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function validatePdfUpload(input: {
  filename: string;
  mimeType: string | null | undefined;
  bytes: Buffer;
}): ValidatedPdfUpload | AppError {
  const lowerName = input.filename.toLowerCase();
  if (!lowerName.endsWith(".pdf")) {
    return appError("INVALID_PDF", "Only PDF files are accepted.", { reason: "extension" });
  }
  const mime = (input.mimeType ?? "").trim().toLowerCase();
  if (!mime) {
    return appError("INVALID_PDF", "MIME type is required.", { reason: "mime_missing" });
  }
  if (mime !== "application/pdf" && mime !== "application/x-pdf") {
    return appError("INVALID_PDF", "MIME type must be application/pdf.", { reason: "mime" });
  }
  if (input.bytes.length === 0) {
    return appError("INVALID_PDF", "Empty file.", { reason: "empty" });
  }
  if (input.bytes.length > MAX_PDF_BYTES) {
    return appError("INVALID_PDF", `PDF exceeds ${MAX_PDF_BYTES} bytes.`, {
      reason: "size",
      size: input.bytes.length,
    });
  }
  if (input.bytes.length < 5 || !input.bytes.subarray(0, 4).equals(PDF_MAGIC)) {
    return appError("INVALID_PDF", "Invalid PDF file signature.", { reason: "magic" });
  }

  const sanitizedFilename = sanitizeFilename(input.filename);
  const hash = sha256Hex(input.bytes);
  const storageKey = `transport-orders/${hash.slice(0, 2)}/${hash}-${randomUUID()}.pdf`;

  return {
    bytes: input.bytes,
    sha256Hex: hash,
    sanitizedFilename,
    storageKey,
    sizeBytes: input.bytes.length,
  };
}

/** Minimal synthetic PDF bytes for tests (valid %PDF magic). */
export function syntheticPdfBytes(label = "synthetic"): Buffer {
  const body = `%PDF-1.4\n%${label}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}
