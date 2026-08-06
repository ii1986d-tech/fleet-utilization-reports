"use client";

import { useState, useTransition } from "react";
import type { ExportFormat, ExportStatusFilter } from "@/lib/export/types";

export type ExportPanelProps = {
  isAdminOrManager: boolean;
  isViewer: boolean;
  /** Optional dispatcher options for the filter dropdown. */
  dispatcherOptions?: string[];
};

export function buildExportRequestBody(input: {
  format: ExportFormat;
  dateFrom: string;
  dateTo: string;
  status: string;
  dispatcherId: string;
  includeKmComparison: boolean;
  includeStops: boolean;
  includeOriginalPdf: boolean;
}) {
  return {
    format: input.format,
    dateFrom: input.dateFrom || undefined,
    dateTo: input.dateTo || undefined,
    status: (input.status || "all") as ExportStatusFilter,
    dispatcherId: input.dispatcherId || undefined,
    includeKmComparison: input.includeKmComparison,
    includeStops: input.includeStops,
    includeOriginalPdf: input.includeOriginalPdf,
  };
}

export function ExportPanel(props: ExportPanelProps) {
  const { isAdminOrManager, isViewer, dispatcherOptions = [] } = props;
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [dispatcherId, setDispatcherId] = useState("");
  const [includeKmComparison, setIncludeKmComparison] = useState(true);
  const [includeStops, setIncludeStops] = useState(true);
  const [includeOriginalPdf, setIncludeOriginalPdf] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function download(format: ExportFormat) {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      try {
        const body = buildExportRequestBody({
          format,
          dateFrom,
          dateTo,
          status,
          dispatcherId,
          includeKmComparison,
          includeStops,
          includeOriginalPdf,
        });
        const res = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const json: unknown = await res.json().catch(() => null);
          if (
            json &&
            typeof json === "object" &&
            "code" in json &&
            "message" in json
          ) {
            const err = json as { code: string; message: string };
            setError(`[${err.code}] ${err.message}`);
          } else {
            setError("Export fehlgeschlagen.");
          }
          return;
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = /filename="([^"]+)"/.exec(disposition);
        const filename =
          match?.[1] ??
          (format === "excel"
            ? "transport-orders.xlsx"
            : "transport-orders.pdf");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setMessage("Export erfolgreich heruntergeladen");
      } catch {
        setError("Export fehlgeschlagen.");
      }
    });
  }

  return (
    <section
      aria-labelledby="export-panel-heading"
      style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #ddd" }}
    >
      <h3 id="export-panel-heading">Export (PACK-008)</h3>
      <p style={{ color: "#555", fontSize: "0.9rem" }}>
        Excel und PDF Export mit Filtern. Alle Rollen können exportieren
        {isViewer ? " (Viewer: nur Lesen/Export)" : null}
        {isAdminOrManager ? " (Admin/Manager)" : null}. Keine Live-AI.
      </p>

      <fieldset style={{ border: "1px solid #ccc", padding: "0.75rem", marginBottom: "0.75rem" }}>
        <legend>Filter</legend>
        <div style={{ display: "grid", gap: "0.5rem", maxWidth: 480 }}>
          <label>
            Datum von{" "}
            <input
              type="date"
              value={dateFrom}
              disabled={pending}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label>
            Datum bis{" "}
            <input
              type="date"
              value={dateTo}
              disabled={pending}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <label>
            Status{" "}
            <select
              value={status}
              disabled={pending}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Alle</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label>
            Dispatcher{" "}
            <select
              value={dispatcherId}
              disabled={pending}
              onChange={(e) => setDispatcherId(e.target.value)}
            >
              <option value="">Alle</option>
              {dispatcherOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid #ccc", padding: "0.75rem", marginBottom: "0.75rem" }}>
        <legend>Optionen</legend>
        <label style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={includeKmComparison}
            disabled={pending}
            onChange={(e) => setIncludeKmComparison(e.target.checked)}
          />{" "}
          Include KM comparison
        </label>
        <label style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={includeStops}
            disabled={pending}
            onChange={(e) => setIncludeStops(e.target.checked)}
          />{" "}
          Include stops
        </label>
        <label style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={includeOriginalPdf}
            disabled={pending}
            onChange={(e) => setIncludeOriginalPdf(e.target.checked)}
          />{" "}
          Include original PDF (default unchecked)
        </label>
      </fieldset>

      <p>
        <button
          type="button"
          disabled={pending}
          onClick={() => download("excel")}
        >
          Excel exportieren
        </button>{" "}
        <button type="button" disabled={pending} onClick={() => download("pdf")}>
          PDF exportieren
        </button>
        {pending ? <span style={{ marginLeft: 8 }}>Export läuft…</span> : null}
      </p>
      {message ? (
        <p role="status" style={{ color: "#0a5" }}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
