"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { AppError } from "@/lib/assignments/errors";
import {
  completeTransportOrderReviewAction,
  confirmTransportOrderStopOrderAction,
  getTransportOrderAction,
  getTransportOrderReviewSessionAction,
  mutateTransportOrderReviewAction,
  reorderTransportOrderStopsAction,
} from "@/lib/transport-orders/review/actions";
import { isWeiterEnabledInUi } from "@/lib/transport-orders/review/gate";
import {
  NOT_APPLICABLE_CONFIRM_MESSAGE,
  needsNotApplicableConfirmation,
  reviewChipStyle,
} from "@/lib/transport-orders/review/ui-helpers";
import type { FieldReview, WorkingTransportOrder } from "@/lib/transport-orders/types";

function isError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "httpStatus" in value &&
    "message" in value
  );
}

export default function TransportOrderReviewPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [order, setOrder] = useState<WorkingTransportOrder | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [dirty, setDirty] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [canReview, setCanReview] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const [session, result] = await Promise.all([
        getTransportOrderReviewSessionAction(),
        getTransportOrderAction(orderId),
      ]);
      if (isError(session)) {
        setError(session);
        setOrder(null);
        setCanReview(false);
        return;
      }
      setCanReview(session.canReview);
      if (isError(result)) {
        setError(result);
        setOrder(null);
        return;
      }
      setError(null);
      setOrder(result);
      setDirty(false);
      setDrafts({});
    });
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const weiterEnabled = useMemo(() => {
    if (!order || dirty || !canReview) return false;
    return isWeiterEnabledInUi({
      header: order.header,
      stops: order.stops,
      partialLoadPositions: order.partialLoadPositions,
      legs: order.legs,
      fieldReviews: order.fieldReviews,
      expectedVersion: order.header.version,
    });
  }, [order, dirty, canReview]);

  const mutateDisabled = pending || dirty || !canReview;
  const mutateDisabledReason = !canReview
    ? "Nur Admin/Manager können prüfen (Viewer schreibgeschützt)"
    : dirty
      ? "Zuerst speichern (ungespeicherte Änderungen)"
      : pending
        ? "Bitte warten…"
        : undefined;

  function fieldKey(fr: FieldReview): string {
    return `${fr.identity.entityType}:${fr.identity.entityId}:${fr.identity.fieldName}`;
  }

  function savePatches() {
    if (!order || !canReview) return;
    const patches = Object.entries(drafts).map(([key, value]) => {
      const [entityType, entityId, fieldName] = key.split(":");
      return {
        identity: {
          entityType: entityType as FieldReview["identity"]["entityType"],
          entityId,
          fieldName,
        },
        currentValue: value === "" ? null : value,
      };
    });
    startTransition(async () => {
      const result = await mutateTransportOrderReviewAction({
        orderId: order.header.orderId,
        expectedVersion: order.header.version,
        patches,
        confirms: [],
        markMissing: [],
        markNotApplicable: [],
      });
      if (isError(result)) {
        setError(result);
        return;
      }
      setOrder(result);
      setDrafts({});
      setDirty(false);
    });
  }

  function confirmField(fr: FieldReview) {
    if (!order || !canReview) return;
    startTransition(async () => {
      const result = await mutateTransportOrderReviewAction({
        orderId: order.header.orderId,
        expectedVersion: order.header.version,
        patches: [],
        confirms: [fr.identity],
        markMissing: [],
        markNotApplicable: [],
      });
      if (isError(result)) {
        setError(result);
        return;
      }
      setOrder(result);
    });
  }

  function markMissing(fr: FieldReview) {
    if (!order || !canReview) return;
    startTransition(async () => {
      const result = await mutateTransportOrderReviewAction({
        orderId: order.header.orderId,
        expectedVersion: order.header.version,
        patches: [],
        confirms: [],
        markMissing: [fr.identity],
        markNotApplicable: [],
      });
      if (isError(result)) {
        setError(result);
        return;
      }
      setOrder(result);
    });
  }

  function markNotApplicable(fr: FieldReview) {
    if (!order || !canReview) return;
    if (needsNotApplicableConfirmation(fr)) {
      const ok = window.confirm(NOT_APPLICABLE_CONFIRM_MESSAGE);
      if (!ok) return;
    }
    startTransition(async () => {
      const result = await mutateTransportOrderReviewAction({
        orderId: order.header.orderId,
        expectedVersion: order.header.version,
        patches: [],
        confirms: [],
        markMissing: [],
        markNotApplicable: [fr.identity],
      });
      if (isError(result)) {
        setError(result);
        return;
      }
      setOrder(result);
    });
  }

  function moveStop(stopId: string, direction: -1 | 1) {
    if (!order || !canReview) return;
    const ordered = order.stops
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => s.stopId);
    const idx = ordered.indexOf(stopId);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    const next = ordered.slice();
    const tmp = next[idx];
    next[idx] = next[swap];
    next[swap] = tmp;
    startTransition(async () => {
      const result = await reorderTransportOrderStopsAction({
        orderId: order.header.orderId,
        expectedVersion: order.header.version,
        orderedStopIds: next,
      });
      if (isError(result)) {
        setError(result);
        return;
      }
      setOrder(result);
    });
  }

  function onDragReorder(fromId: string, toId: string) {
    if (!order || fromId === toId || !canReview) return;
    const ordered = order.stops
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => s.stopId);
    const from = ordered.indexOf(fromId);
    const to = ordered.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = ordered.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    startTransition(async () => {
      const result = await reorderTransportOrderStopsAction({
        orderId: order.header.orderId,
        expectedVersion: order.header.version,
        orderedStopIds: next,
      });
      if (isError(result)) {
        setError(result);
        return;
      }
      setOrder(result);
    });
  }

  function confirmStopOrder() {
    if (!order || !canReview) return;
    startTransition(async () => {
      const result = await confirmTransportOrderStopOrderAction({
        orderId: order.header.orderId,
        expectedVersion: order.header.version,
      });
      if (isError(result)) {
        setError(result);
        return;
      }
      setOrder(result);
    });
  }

  function completeReview() {
    if (!order || !canReview) return;
    startTransition(async () => {
      const result = await completeTransportOrderReviewAction({
        orderId: order.header.orderId,
        expectedVersion: order.header.version,
      });
      if (isError(result)) {
        setError(result);
        return;
      }
      setOrder(result);
    });
  }

  if (!order) {
    return (
      <div>
        <p>
          <Link href="/settings/orders">← Orders</Link>
        </p>
        {error ? (
          <p role="alert">
            [{error.httpStatus}] {error.code}: {error.message}
          </p>
        ) : (
          <p>Loading…</p>
        )}
      </div>
    );
  }

  const stopOrderChip = reviewChipStyle(order.header.stopOrderReviewStatus);
  const orderedStops = order.stops.slice().sort((a, b) => a.sequence - b.sequence);

  return (
    <div>
      <p>
        <Link href="/settings/orders">← Orders</Link>
      </p>
      <h2>Review {order.header.businessIdentifier ?? order.header.orderId}</h2>
      <p>
        Version <strong>{order.header.version}</strong>
        {order.header.reviewCompletedAt ? " · Review completed" : null}
        {dirty ? " · Unsaved changes" : null}
        {!canReview ? " · Read-only (Viewer)" : null}
      </p>
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          [{error.httpStatus}] {error.code}: {error.message}
          {error.details && "unresolved" in error.details ? (
            <span> — unresolved targets listed in response details (no sensitive PDF content).</span>
          ) : null}
        </p>
      ) : null}

      <p>
        <button
          type="button"
          disabled={pending || !dirty || !canReview}
          onClick={savePatches}
          title={!canReview ? mutateDisabledReason : undefined}
        >
          Speichern
        </button>{" "}
        <button
          type="button"
          disabled={pending || !weiterEnabled}
          onClick={completeReview}
          title={weiterEnabled ? "Weiter" : mutateDisabledReason ?? "Weiter disabled until review complete and saved"}
        >
          Weiter
        </button>
        {!weiterEnabled ? (
          <span style={{ marginLeft: 8, color: "#555" }}>
            Weiter disabled until review complete and saved
          </span>
        ) : null}
      </p>

      {order.header.mapsStaticUrl ? (
        <p>
          Static Maps link:{" "}
          <a href={order.header.mapsStaticUrl} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>{" "}
          (no routing API)
        </p>
      ) : null}

      <h3>Stops</h3>
      <p>
        Stop order:{" "}
        <span
          style={{
            background: stopOrderChip.background,
            color: stopOrderChip.color,
            padding: "0.15rem 0.4rem",
          }}
          aria-label={`${stopOrderChip.indicator} ${stopOrderChip.label}`}
        >
          <span aria-hidden="true">{stopOrderChip.indicator}</span> {stopOrderChip.label}
        </span>{" "}
        <button
          type="button"
          disabled={pending || !canReview}
          onClick={confirmStopOrder}
          title={!canReview ? mutateDisabledReason : undefined}
        >
          Stoppreihenfolge bestätigen
        </button>
      </p>
      <ol>
        {orderedStops.map((stop) => (
          <li
            key={stop.stopId}
            draggable={canReview}
            onDragStart={(e) => e.dataTransfer.setData("text/stop-id", stop.stopId)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = e.dataTransfer.getData("text/stop-id");
              onDragReorder(from, stop.stopId);
            }}
          >
            <strong>#{stop.sequence}</strong> {stop.type} — {stop.address.city ?? stop.address.rawAddressText}{" "}
            <button
              type="button"
              aria-label="Move stop up"
              disabled={!canReview || pending}
              onClick={() => moveStop(stop.stopId, -1)}
              title={!canReview ? mutateDisabledReason : undefined}
            >
              Up
            </button>{" "}
            <button
              type="button"
              aria-label="Move stop down"
              disabled={!canReview || pending}
              onClick={() => moveStop(stop.stopId, 1)}
              title={!canReview ? mutateDisabledReason : undefined}
            >
              Down
            </button>
          </li>
        ))}
      </ol>

      <h3>Fields</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Field</th>
            <th align="left">Value</th>
            <th align="left">Status</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {order.fieldReviews.map((fr) => {
            const key = fieldKey(fr);
            const chip = reviewChipStyle(fr.reviewStatus);
            const display =
              drafts[key] ??
              (fr.currentValue === null || fr.currentValue === undefined
                ? ""
                : String(fr.currentValue));
            const alreadyNa = fr.reviewStatus === "not_applicable";
            return (
              <tr key={key} style={{ borderTop: "1px solid #ddd" }}>
                <td>
                  {fr.identity.entityType}.{fr.identity.fieldName}
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>
                    extracted: {String(fr.extractedValue)} · provider {fr.provider}/{fr.model}
                  </div>
                </td>
                <td>
                  <input
                    value={display}
                    disabled={!canReview || pending}
                    readOnly={!canReview}
                    title={!canReview ? mutateDisabledReason : undefined}
                    onChange={(e) => {
                      setDrafts((d) => ({ ...d, [key]: e.target.value }));
                      setDirty(true);
                    }}
                  />
                </td>
                <td>
                  <span
                    style={{
                      background: chip.background,
                      color: chip.color,
                      padding: "0.15rem 0.4rem",
                    }}
                    aria-label={`${chip.indicator} ${chip.label}${chip.terminal ? " (abgeschlossen)" : ""}`}
                    data-review-status={fr.reviewStatus}
                    data-terminal={chip.terminal ? "true" : "false"}
                  >
                    <span aria-hidden="true">{chip.indicator}</span> {chip.label}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    disabled={mutateDisabled}
                    title={mutateDisabledReason}
                    aria-label={`Bestätigen: ${fr.identity.fieldName}`}
                    onClick={() => confirmField(fr)}
                  >
                    Bestätigen
                  </button>{" "}
                  <button
                    type="button"
                    disabled={mutateDisabled}
                    title={mutateDisabledReason}
                    aria-label={`Fehlend bestätigen: ${fr.identity.fieldName}`}
                    onClick={() => markMissing(fr)}
                  >
                    Fehlt
                  </button>{" "}
                  <button
                    type="button"
                    disabled={mutateDisabled || alreadyNa}
                    title={
                      alreadyNa
                        ? "Bereits als nicht zutreffend markiert"
                        : mutateDisabledReason
                    }
                    aria-label={`Nicht zutreffend: ${fr.identity.fieldName}`}
                    data-action="not_applicable"
                    onClick={() => markNotApplicable(fr)}
                  >
                    Nicht zutreffend
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>Audit</h3>
      <ul>
        {order.auditEvents
          .slice()
          .reverse()
          .slice(0, 30)
          .map((ev) => (
            <li key={ev.id}>
              {ev.timestamp} · {ev.action}
              {ev.reasonCode ? ` (${ev.reasonCode})` : ""} · v{ev.versionBefore}→{ev.versionAfter}
            </li>
          ))}
      </ul>

      {order.snapshot ? (
        <p style={{ color: "#555", fontSize: "0.9rem" }}>
          Immutable snapshot {order.snapshot.extractionId} retained (provider{" "}
          {order.snapshot.provider}/{order.snapshot.model}).
        </p>
      ) : null}
    </div>
  );
}
