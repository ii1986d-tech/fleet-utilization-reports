"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createVehicle,
  deactivateVehicle,
  listVehicles,
  updateVehicle,
} from "@/lib/masters/actions";
import type { VehicleRow } from "@/lib/masters/schemas";
import type { AppError } from "@/lib/assignments/errors";

function StatusBanner({ error, success }: { error: AppError | null; success: string | null }) {
  if (error) {
    return (
      <p role="alert" style={{ color: error.code === "ASSIGNMENT_OVERLAP" ? "#a40" : "#b00020" }}>
        [{error.httpStatus}] {error.code}: {error.message}
      </p>
    );
  }
  if (success) {
    return <p style={{ color: "#0a0" }}>{success}</p>;
  }
  return null;
}

export default function VehiclesSettingsPage() {
  const [rows, setRows] = useState<VehicleRow[] | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [displayName, setDisplayName] = useState("");

  function reload() {
    startTransition(async () => {
      setError(null);
      const result = await listVehicles();
      if (!result.ok) {
        setRows([]);
        setError(result.error);
        return;
      }
      setRows(result.data);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <section>
      <h2>Vehicles</h2>
      <StatusBanner error={error} success={success} />
      {rows === null || pending ? <p>Loading…</p> : null}
      {rows && rows.length === 0 && !error ? <p>No vehicles yet.</p> : null}
      {rows && rows.length > 0 ? (
        <ul>
          {rows.map((v) => (
            <li key={v.id}>
              {v.registration_number} — {v.display_name}{" "}
              {v.active ? "(active)" : "(inactive)"}{" "}
              {v.active ? (
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      setSuccess(null);
                      const result = await deactivateVehicle(v.id);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setSuccess("Vehicle deactivated.");
                      reload();
                    });
                  }}
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      setSuccess(null);
                      const result = await updateVehicle({ id: v.id, active: true });
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setSuccess("Vehicle reactivated.");
                      reload();
                    });
                  }}
                >
                  Reactivate
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <h3>Create vehicle</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            setSuccess(null);
            setError(null);
            const result = await createVehicle({ registrationNumber, displayName });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSuccess("Vehicle created.");
            setRegistrationNumber("");
            setDisplayName("");
            reload();
          });
        }}
      >
        <label>
          Registration{" "}
          <input
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            required
          />
        </label>{" "}
        <label>
          Display name{" "}
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>{" "}
        <button type="submit" disabled={pending}>
          Create
        </button>
      </form>
    </section>
  );
}
