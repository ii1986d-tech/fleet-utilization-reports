"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ExportPanel } from "@/components/export/ExportPanel";
import { appError, type AppError } from "@/lib/assignments/errors";
import type { AppRole } from "@/lib/auth/roles";
import { MAX_PDF_BYTES, MAX_PDF_PAGES } from "@/lib/transport-orders/constants";
import {
  extractTransportOrderAction,
  getTransportOrderReviewSessionAction,
  listTransportOrdersAction,
  uploadTransportOrderPdfAction,
} from "@/lib/transport-orders/review/actions";

function isError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "httpStatus" in value &&
    "message" in value
  );
}

/** Minimal valid PDF for browser demo upload (synthetic only). */
function makeSyntheticPdfBase64(): string {
  const body = "%PDF-1.4\n%synthetic-ui\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n";
  if (typeof btoa === "function") {
    return btoa(body);
  }
  return Buffer.from(body, "utf8").toString("base64");
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function TransportOrdersPage() {
  const [rows, setRows] = useState<
    Array<{ orderId: string; businessIdentifier: string | null; version: number }>
  >([]);
  const [error, setError] = useState<AppError | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [canUpload, setCanUpload] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reload() {
    startTransition(async () => {
      const result = await listTransportOrdersAction();
      if (isError(result)) {
        setError(result);
        setRows([]);
        return;
      }
      setError(null);
      setRows(result);
    });
  }

  useEffect(() => {
    startTransition(async () => {
      const session = await getTransportOrderReviewSessionAction();
      if (isError(session)) {
        setError(session);
        setCanUpload(false);
        setRole(null);
        setSessionLoaded(true);
        return;
      }
      setCanUpload(session.canReview);
      setRole(session.role);
      setSessionLoaded(true);
      const result = await listTransportOrdersAction();
      if (isError(result)) {
        setError(result);
        setRows([]);
        return;
      }
      setError(null);
      setRows(result);
    });
  }, []);

  function createSyntheticOrder() {
    startTransition(async () => {
      setError(null);
      setStatus("Uploading synthetic PDF…");
      const key = `upload-${crypto.randomUUID()}`;
      const uploaded = await uploadTransportOrderPdfAction({
        idempotencyKey: key,
        filename: "synthetic-order.pdf",
        mimeType: "application/pdf",
        bytesBase64: makeSyntheticPdfBase64(),
      });
      if (isError(uploaded)) {
        setStatus(null);
        setError(uploaded);
        return;
      }
      setStatus("Extracting (mock)…");
      const extracted = await extractTransportOrderAction({
        documentId: uploaded.documentId,
        idempotencyKey: `extract-${key}`,
        mockMode: "success_simple",
      });
      if (isError(extracted)) {
        setStatus(null);
        setError(extracted);
        return;
      }
      setStatus("Synthetic order created.");
      reload();
    });
  }

  function processPdfFile(file: File) {
    startTransition(async () => {
      setError(null);
      setStatus(null);

      const nameOk = file.name.toLowerCase().endsWith(".pdf");
      const mimeOk = !file.type || file.type === "application/pdf";
      if (!nameOk || !mimeOk) {
        setError(appError("INVALID_PDF", "Only PDF files are accepted."));
        return;
      }
      if (file.size <= 0) {
        setError(appError("INVALID_PDF", "Empty file."));
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        setError(appError("INVALID_PDF", `PDF exceeds ${MAX_PDF_BYTES} bytes (max 20 MiB).`));
        return;
      }

      setStatus(`Uploading ${file.name}…`);
      const key = `upload-${crypto.randomUUID()}`;
      let bytesBase64: string;
      try {
        bytesBase64 = await fileToBase64(file);
      } catch {
        setStatus(null);
        setError(appError("INVALID_PDF", "Could not read PDF file."));
        return;
      }

      const uploaded = await uploadTransportOrderPdfAction({
        idempotencyKey: key,
        filename: file.name,
        mimeType: file.type || "application/pdf",
        bytesBase64,
      });
      if (isError(uploaded)) {
        setStatus(null);
        setError(uploaded);
        return;
      }

      setStatus("Extracting…");
      const extracted = await extractTransportOrderAction({
        documentId: uploaded.documentId,
        idempotencyKey: `extract-${key}`,
      });
      if (isError(extracted)) {
        setStatus(null);
        setError(extracted);
        return;
      }

      setStatus(
        `Order ready: ${extracted.header.businessIdentifier ?? extracted.header.orderId}`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      reload();
    });
  }

  function onFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    processPdfFile(file);
  }

  return (
    <div>
      <h2>Transport orders (PACK-006)</h2>
      <p style={{ color: "#555" }}>
        Admin/manager can upload a PDF (max 20 MiB, max {MAX_PDF_PAGES} pages) or create a
        synthetic mock order. Viewer is read-only. Extraction uses the configured server
        provider (default mock).
      </p>
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          [{error.httpStatus}] {error.code}: {error.message}
        </p>
      ) : null}
      {status ? (
        <p role="status" style={{ color: "#0a5" }}>
          {status}
        </p>
      ) : null}

      {sessionLoaded && canUpload ? (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (pending) return;
            onFileChange(e.dataTransfer.files);
          }}
          style={{
            margin: "1rem 0",
            padding: "1.25rem",
            border: dragOver ? "2px solid #246" : "2px dashed #99a",
            background: dragOver ? "#f0f6ff" : "#fafafa",
            maxWidth: "36rem",
          }}
        >
          <p style={{ marginTop: 0 }}>
            <strong>Upload transport-order PDF</strong>
          </p>
          <p style={{ color: "#555", fontSize: "0.95rem" }}>
            Drag and drop a `.pdf` here, or choose a file. Max 20 MiB · max {MAX_PDF_PAGES} pages.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            disabled={pending}
            onChange={(e) => onFileChange(e.target.files)}
          />
        </div>
      ) : null}

      {sessionLoaded && !canUpload ? (
        <p style={{ color: "#555" }}>Read-only (Viewer) — PDF upload is admin/manager only.</p>
      ) : null}

      <p>
        {canUpload ? (
          <>
            <button type="button" disabled={pending} onClick={createSyntheticOrder}>
              Create synthetic order (mock extract)
            </button>{" "}
          </>
        ) : null}
        <button type="button" disabled={pending} onClick={reload}>
          Refresh
        </button>
      </p>
      <ul>
        {rows.map((r) => (
          <li key={r.orderId}>
            <Link href={`/settings/orders/${r.orderId}`}>
              {r.businessIdentifier ?? r.orderId} (v{r.version})
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p>No orders yet.</p> : null}

      {sessionLoaded && role ? (
        <ExportPanel
          isAdminOrManager={role === "admin" || role === "manager"}
          isViewer={role === "viewer"}
        />
      ) : null}
    </div>
  );
}
