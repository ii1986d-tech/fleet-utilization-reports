"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createDriver,
  deactivateDriver,
  listDrivers,
  updateDriver,
} from "@/lib/masters/actions";
import type { DriverRow } from "@/lib/masters/schemas";
import type { AppError } from "@/lib/assignments/errors";

export default function DriversSettingsPage() {
  const [rows, setRows] = useState<DriverRow[] | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");

  function reload() {
    startTransition(async () => {
      const result = await listDrivers();
      if (!result.ok) {
        setRows([]);
        setError(result.error);
        return;
      }
      setError(null);
      setRows(result.data);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <section>
      <h2>Drivers</h2>
      {error ? (
        <p role="alert">
          [{error.httpStatus}] {error.code}: {error.message}
        </p>
      ) : null}
      {success ? <p style={{ color: "#0a0" }}>{success}</p> : null}
      {rows === null || pending ? <p>Loading…</p> : null}
      {rows && rows.length === 0 && !error ? <p>No drivers yet.</p> : null}
      <ul>
        {(rows ?? []).map((d) => (
          <li key={d.id}>
            {d.full_name} {d.active ? "(active)" : "(inactive)"}{" "}
            {d.active ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deactivateDriver(d.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setSuccess("Driver deactivated.");
                    reload();
                  })
                }
              >
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const result = await updateDriver({ id: d.id, active: true });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setSuccess("Driver reactivated.");
                    reload();
                  })
                }
              >
                Reactivate
              </button>
            )}
          </li>
        ))}
      </ul>
      <h3>Create driver</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await createDriver({ fullName });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSuccess("Driver created.");
            setFullName("");
            reload();
          });
        }}
      >
        <label>
          Full name{" "}
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>{" "}
        <button type="submit" disabled={pending}>
          Create
        </button>
      </form>
    </section>
  );
}
