"use client";

import { useEffect, useState, useTransition } from "react";
import {
  correctAssignment,
  createAssignment,
  deleteAssignment,
  endAssignment,
  getAssignmentAsOf,
  listAssignments,
  type AssignmentRow,
} from "@/lib/assignments/actions";
import { listCustomers, listDrivers, listVehicles } from "@/lib/masters/actions";
import type { AppError } from "@/lib/assignments/errors";
import type { CustomerRow, DriverRow, VehicleRow } from "@/lib/masters/schemas";

export default function AssignmentsSettingsPage() {
  const [rows, setRows] = useState<AssignmentRow[] | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [asOfVehicleId, setAsOfVehicleId] = useState("");
  const [asOfDate, setAsOfDate] = useState("");
  const [asOfResult, setAsOfResult] = useState<AssignmentRow | null | undefined>(undefined);

  function reload() {
    startTransition(async () => {
      const [a, v, d, c] = await Promise.all([
        listAssignments(),
        listVehicles(),
        listDrivers(),
        listCustomers(),
      ]);
      if (!a.ok) {
        setRows([]);
        setError(a.error);
      } else {
        setRows(a.data);
        setError(null);
      }
      if (v.ok) setVehicles(v.data);
      if (d.ok) setDrivers(d.data);
      if (c.ok) setCustomers(c.data);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <section>
      <h2>Vehicle assignments</h2>
      {error ? (
        <p role="alert" style={{ color: error.code === "ASSIGNMENT_OVERLAP" ? "#a40" : "#b00020" }}>
          [{error.httpStatus}] {error.code}: {error.message}
        </p>
      ) : null}
      {success ? <p style={{ color: "#0a0" }}>{success}</p> : null}
      {rows === null || pending ? <p>Loading…</p> : null}
      {rows && rows.length === 0 && !error ? <p>No assignments yet.</p> : null}
      <ul>
        {(rows ?? []).map((row) => (
          <li key={row.id}>
            {row.vehicle_id.slice(0, 8)}… {row.valid_from} → {row.valid_until ?? "open"}{" "}
            <button
              type="button"
              onClick={() => {
                setEditId(row.id);
                setVehicleId(row.vehicle_id);
                setDriverId(row.driver_id ?? "");
                setCustomerId(row.customer_id ?? "");
                setValidFrom(row.valid_from);
                setValidUntil(row.valid_until ?? "");
              }}
            >
              Correct
            </button>{" "}
            <button
              type="button"
              onClick={() => {
                const until = window.prompt("End date (YYYY-MM-DD)", row.valid_from);
                if (!until) return;
                startTransition(async () => {
                  const result = await endAssignment({ id: row.id, validUntil: until });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setSuccess("Assignment ended (history preserved).");
                  reload();
                });
              }}
            >
              End
            </button>
          </li>
        ))}
      </ul>

      <h3>{editId ? "Correct assignment (in-place)" : "Create assignment"}</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            setSuccess(null);
            const payload = {
              id: editId ?? undefined,
              vehicleId,
              driverId: driverId || null,
              customerId: customerId || null,
              validFrom,
              validUntil: validUntil || null,
            };
            const result = editId
              ? await correctAssignment({ ...payload, id: editId })
              : await createAssignment(payload);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSuccess(editId ? "Assignment corrected." : "Assignment created.");
            setEditId(null);
            setValidFrom("");
            setValidUntil("");
            reload();
          });
        }}
      >
        <label>
          Vehicle{" "}
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
            <option value="">Select…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Driver{" "}
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">—</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Customer{" "}
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">—</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          From{" "}
          <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required />
        </label>{" "}
        <label>
          Until{" "}
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </label>{" "}
        <button type="submit" disabled={pending}>
          {editId ? "Save correction" : "Create"}
        </button>
      </form>

      <h3>As-of lookup</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await getAssignmentAsOf({
              vehicleId: asOfVehicleId,
              asOfDate,
            });
            if (!result.ok) {
              setError(result.error);
              setAsOfResult(undefined);
              return;
            }
            setError(null);
            setAsOfResult(result.data);
          });
        }}
      >
        <label>
          Vehicle{" "}
          <select
            value={asOfVehicleId}
            onChange={(e) => setAsOfVehicleId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          As of{" "}
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            required
          />
        </label>{" "}
        <button type="submit" disabled={pending}>
          Resolve
        </button>
      </form>
      {asOfResult === null ? <p>No assignment effective on that date.</p> : null}
      {asOfResult ? (
        <p>
          Effective: {asOfResult.valid_from} → {asOfResult.valid_until ?? "open"} (
          {asOfResult.id.slice(0, 8)}…)
        </p>
      ) : null}

      <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#666" }}>
        Hard delete is disabled.{" "}
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              const result = await deleteAssignment();
              setError(result.ok ? null : result.error);
            })
          }
        >
          Probe DELETE path
        </button>
      </p>
    </section>
  );
}
