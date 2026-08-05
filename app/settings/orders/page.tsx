"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { AppError } from "@/lib/assignments/errors";
import {
  extractTransportOrderAction,
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

export default function TransportOrdersPage() {
  const [rows, setRows] = useState<
    Array<{ orderId: string; businessIdentifier: string | null; version: number }>
  >([]);
  const [error, setError] = useState<AppError | null>(null);
  const [pending, startTransition] = useTransition();

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
    reload();
  }, []);

  function createSyntheticOrder() {
    startTransition(async () => {
      setError(null);
      const key = `upload-${crypto.randomUUID()}`;
      const uploaded = await uploadTransportOrderPdfAction({
        idempotencyKey: key,
        filename: "synthetic-order.pdf",
        mimeType: "application/pdf",
        bytesBase64: makeSyntheticPdfBase64(),
      });
      if (isError(uploaded)) {
        setError(uploaded);
        return;
      }
      const extracted = await extractTransportOrderAction({
        documentId: uploaded.documentId,
        idempotencyKey: `extract-${key}`,
        mockMode: "success_simple",
      });
      if (isError(extracted)) {
        setError(extracted);
        return;
      }
      reload();
    });
  }

  return (
    <div>
      <h2>Transport orders (PACK-006)</h2>
      <p style={{ color: "#555" }}>
        Non-provider Apply: mock extraction only. DS-005 blocks live Gemini/xAI. Admin/manager can
        upload and review; viewer is read-only.
      </p>
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          [{error.httpStatus}] {error.code}: {error.message}
        </p>
      ) : null}
      <p>
        <button type="button" disabled={pending} onClick={createSyntheticOrder}>
          Create synthetic order (mock extract)
        </button>{" "}
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
    </div>
  );
}
