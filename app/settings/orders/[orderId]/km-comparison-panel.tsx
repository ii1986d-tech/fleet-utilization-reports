"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { KmComparisonResult } from "@/lib/maps/km-delta-types";
import type { RouteCorridor } from "@/lib/maps/corridor-types";

type ApiError = { code: string; message: string };

function statusStyle(status: KmComparisonResult["status"]): {
  background: string;
  color: string;
} {
  switch (status) {
    case "ok":
      return { background: "#e8f5e9", color: "#1b5e20" };
    case "warning":
      return { background: "#fff8e1", color: "#e65100" };
    case "error":
      return { background: "#ffebee", color: "#b71c1c" };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function formatKm(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)} km`;
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}

export function KmComparisonPanel(props: {
  orderId: string;
  canReview: boolean;
}) {
  const { orderId, canReview } = props;
  const [comparison, setComparison] = useState<KmComparisonResult | null>(null);
  const [corridors, setCorridors] = useState<RouteCorridor[]>([]);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [paidManualDraft, setPaidManualDraft] = useState("");
  const [actualManualDraft, setActualManualDraft] = useState("");
  const [routeManualDraft, setRouteManualDraft] = useState("");

  const load = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const [corrRes, kmRes] = await Promise.all([
        fetch("/api/route-corridors", { cache: "no-store" }),
        fetch(`/api/transport-orders/${orderId}/km-delta`, { cache: "no-store" }),
      ]);

      const corrJson: unknown = await corrRes.json().catch(() => null);
      if (corrRes.ok && corrJson && typeof corrJson === "object" && "corridors" in corrJson) {
        setCorridors((corrJson as { corridors: RouteCorridor[] }).corridors);
      } else if (!corrRes.ok && isApiError(corrJson)) {
        setError(`[${corrJson.code}] ${corrJson.message}`);
      }

      if (kmRes.status === 404) {
        setComparison(null);
        return;
      }
      const kmJson: unknown = await kmRes.json().catch(() => null);
      if (!kmRes.ok) {
        if (isApiError(kmJson)) setError(`[${kmJson.code}] ${kmJson.message}`);
        else setError("Failed to load KM comparison.");
        return;
      }
      const result = kmJson as KmComparisonResult;
      setComparison(result);
      setSelectedCorridorId(result.corridorId ?? "");
      setPaidManualDraft(
        result.paidKmManual !== null && result.paidKmManual !== undefined
          ? String(result.paidKmManual)
          : "",
      );
      setActualManualDraft(
        result.actualKmManual !== null && result.actualKmManual !== undefined
          ? String(result.actualKmManual)
          : "",
      );
      setRouteManualDraft(result.manualRouteUrl ?? "");
    });
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  function calculate() {
    if (!canReview) return;
    startTransition(async () => {
      setError(null);
      const body = {
        corridorId: selectedCorridorId === "" ? null : selectedCorridorId,
      };
      const res = await fetch(`/api/transport-orders/${orderId}/km-delta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        if (isApiError(json)) setError(`[${json.code}] ${json.message}`);
        else setError("KM calculation failed.");
        return;
      }
      const result = json as KmComparisonResult;
      setComparison(result);
      setSelectedCorridorId(result.corridorId ?? "");
    });
  }

  function saveOverrides() {
    if (!canReview) return;
    startTransition(async () => {
      setError(null);
      const body: Record<string, unknown> = {};
      if (paidManualDraft.trim() === "") body.paidKmManual = null;
      else {
        const n = Number(paidManualDraft);
        if (!Number.isFinite(n) || n < 0) {
          setError("Paid KM manual must be a non-negative number.");
          return;
        }
        body.paidKmManual = n;
      }
      if (actualManualDraft.trim() === "") body.actualKmManual = null;
      else {
        const n = Number(actualManualDraft);
        if (!Number.isFinite(n) || n < 0) {
          setError("Actual KM manual must be a non-negative number.");
          return;
        }
        body.actualKmManual = n;
      }
      body.manualRouteUrl =
        routeManualDraft.trim() === "" ? null : routeManualDraft.trim();

      const res = await fetch(`/api/transport-orders/${orderId}/km-delta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        if (isApiError(json)) setError(`[${json.code}] ${json.message}`);
        else setError("Failed to save manual overrides.");
        return;
      }
      const result = json as KmComparisonResult;
      setComparison(result);
    });
  }

  const chip = comparison ? statusStyle(comparison.status) : null;
  const highlightDelta =
    comparison?.deltaPercent !== null &&
    comparison?.deltaPercent !== undefined &&
    Math.abs(comparison.deltaPercent) > 10;

  return (
    <section aria-labelledby="km-comparison-heading" style={{ marginTop: "1.5rem" }}>
      <h3 id="km-comparison-heading">KM comparison (PACK-007)</h3>
      <p style={{ color: "#555", fontSize: "0.9rem" }}>
        Paid (PDF) vs actual (Maps) vs direct (haversine when coords exist). Works with
        Maps kill switch / fallback when API is disabled.
      </p>
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      ) : null}

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="corridor-select">
          Route corridor{" "}
          <select
            id="corridor-select"
            value={selectedCorridorId}
            disabled={!canReview || pending}
            onChange={(e) => setSelectedCorridorId(e.target.value)}
          >
            <option value="">Direct route (from stops)</option>
            {corridors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <button
          type="button"
          disabled={!canReview || pending}
          onClick={calculate}
          title={!canReview ? "Viewer read-only" : undefined}
        >
          Calculate KM
        </button>
      </div>

      {comparison ? (
        <>
          <p>
            Status:{" "}
            <span
              style={{
                background: chip?.background,
                color: chip?.color,
                padding: "0.15rem 0.4rem",
              }}
            >
              {comparison.status}
            </span>{" "}
            · Source: <code>{comparison.source}</code>
            {comparison.errorMessage ? (
              <span style={{ color: "#b00020" }}> — {comparison.errorMessage}</span>
            ) : null}
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
            <thead>
              <tr>
                <th align="left">Metric</th>
                <th align="left">Effective</th>
                <th align="left">Extracted / calculated</th>
                <th align="left">Manual</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: "1px solid #ddd" }}>
                <td>Paid KM</td>
                <td>{formatKm(comparison.paidKm)}</td>
                <td>{formatKm(comparison.paidKmExtracted)}</td>
                <td>{formatKm(comparison.paidKmManual)}</td>
              </tr>
              <tr style={{ borderTop: "1px solid #ddd" }}>
                <td>Actual KM</td>
                <td>{formatKm(comparison.actualKm)}</td>
                <td>{formatKm(comparison.actualKmCalculated)}</td>
                <td>{formatKm(comparison.actualKmManual)}</td>
              </tr>
              <tr style={{ borderTop: "1px solid #ddd" }}>
                <td>Direct KM</td>
                <td colSpan={3}>{formatKm(comparison.directKm)}</td>
              </tr>
              <tr style={{ borderTop: "1px solid #ddd" }}>
                <td>Delta (paid − actual)</td>
                <td
                  colSpan={3}
                  style={highlightDelta ? { color: "#b71c1c", fontWeight: 600 } : undefined}
                >
                  {formatKm(comparison.deltaKm)}
                  {comparison.deltaPercent !== null
                    ? ` (${comparison.deltaPercent.toFixed(2)}%)`
                    : ""}
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Route link:{" "}
            {comparison.routeUrl ? (
              <a href={comparison.routeUrl} target="_blank" rel="noreferrer">
                Open in Google Maps
              </a>
            ) : (
              "—"
            )}
            {comparison.manualRouteUrl ? " (manual override active)" : null}
          </p>

          <h4>Manual overrides</h4>
          {!canReview ? (
            <p style={{ color: "#555" }}>Viewer: read-only (manual values visible).</p>
          ) : null}
          <div style={{ display: "grid", gap: "0.5rem", maxWidth: 520 }}>
            <label>
              Paid KM manual{" "}
              <input
                type="number"
                min={0}
                step="0.01"
                value={paidManualDraft}
                disabled={!canReview || pending}
                readOnly={!canReview}
                onChange={(e) => setPaidManualDraft(e.target.value)}
                placeholder="leave empty to clear"
              />
            </label>
            <label>
              Actual KM manual{" "}
              <input
                type="number"
                min={0}
                step="0.01"
                value={actualManualDraft}
                disabled={!canReview || pending}
                readOnly={!canReview}
                onChange={(e) => setActualManualDraft(e.target.value)}
                placeholder="leave empty to clear"
              />
            </label>
            <label>
              Manual Google Maps link{" "}
              <input
                type="url"
                style={{ width: "100%" }}
                value={routeManualDraft}
                disabled={!canReview || pending}
                readOnly={!canReview}
                onChange={(e) => setRouteManualDraft(e.target.value)}
                placeholder="https://www.google.com/maps/dir/..."
              />
            </label>
            <button
              type="button"
              disabled={!canReview || pending}
              onClick={saveOverrides}
              title={!canReview ? "Viewer read-only" : undefined}
            >
              Save manual overrides
            </button>
          </div>
        </>
      ) : (
        <p style={{ color: "#555" }}>
          No KM comparison yet. Select a corridor (optional) and click Calculate KM.
        </p>
      )}
    </section>
  );
}
