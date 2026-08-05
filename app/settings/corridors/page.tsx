"use client";

import { useEffect, useState, useTransition } from "react";
import type { RouteCorridor } from "@/lib/maps/corridor-types";

type ApiError = { code: string; message: string };

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}

export default function RouteCorridorsSettingsPage() {
  const [corridors, setCorridors] = useState<RouteCorridor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [waypoints, setWaypoints] = useState("");
  const [description, setDescription] = useState("");

  function reload() {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/route-corridors?all=1", { cache: "no-store" });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        // Non-admin may not use all=1 — fall back to active list
        const fallback = await fetch("/api/route-corridors", { cache: "no-store" });
        const fbJson: unknown = await fallback.json().catch(() => null);
        if (!fallback.ok) {
          if (isApiError(fbJson)) setError(`[${fbJson.code}] ${fbJson.message}`);
          else setError("Failed to load corridors.");
          setCorridors([]);
          return;
        }
        setCorridors((fbJson as { corridors: RouteCorridor[] }).corridors);
        return;
      }
      setCorridors((json as { corridors: RouteCorridor[] }).corridors);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  function create() {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/route-corridors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          origin,
          destination,
          waypoints: waypoints
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          description: description.trim() || null,
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        if (isApiError(json)) setError(`[${json.code}] ${json.message}`);
        else setError("Create failed (admin only).");
        return;
      }
      setSuccess("Corridor created.");
      setName("");
      setOrigin("");
      setDestination("");
      setWaypoints("");
      setDescription("");
      reload();
    });
  }

  function deactivate(id: string) {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/route-corridors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deactivate: true }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        if (isApiError(json)) setError(`[${json.code}] ${json.message}`);
        else setError("Deactivate failed (admin only).");
        return;
      }
      setSuccess("Corridor deactivated.");
      reload();
    });
  }

  return (
    <section>
      <h2>Route corridors</h2>
      <p style={{ color: "#555", fontSize: "0.9rem" }}>
        Predefined corridors for KM comparison (FR-007-10). Admin can create/edit/deactivate.
        Manager/viewer: read-only. Soft-delete via deactivate (no hard DELETE).
      </p>
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      ) : null}
      {success ? <p style={{ color: "#0a0" }}>{success}</p> : null}
      {corridors === null || pending ? <p>Loading…</p> : null}

      <ul>
        {(corridors ?? []).map((c) => (
          <li key={c.id}>
            <strong>{c.name}</strong> — {c.origin} → {c.destination}
            {c.waypoints.length ? ` via ${c.waypoints.join(", ")}` : ""}{" "}
            {c.active ? "(active)" : "(inactive)"}{" "}
            {c.active ? (
              <button type="button" disabled={pending} onClick={() => deactivate(c.id)}>
                Deactivate
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <h3>Create corridor (admin)</h3>
      <div style={{ display: "grid", gap: "0.5rem", maxWidth: 480 }}>
        <label>
          Name{" "}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Origin{" "}
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} />
        </label>
        <label>
          Destination{" "}
          <input value={destination} onChange={(e) => setDestination(e.target.value)} />
        </label>
        <label>
          Waypoints (comma-separated){" "}
          <input value={waypoints} onChange={(e) => setWaypoints(e.target.value)} />
        </label>
        <label>
          Description{" "}
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button type="button" disabled={pending} onClick={create}>
          Create
        </button>
      </div>
    </section>
  );
}
