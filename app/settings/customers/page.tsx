"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createCustomer,
  deactivateCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/masters/actions";
import type { CustomerRow } from "@/lib/masters/schemas";
import type { AppError } from "@/lib/assignments/errors";

export default function CustomersSettingsPage() {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function reload() {
    startTransition(async () => {
      const result = await listCustomers();
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
      <h2>Customers</h2>
      {error ? (
        <p role="alert">
          [{error.httpStatus}] {error.code}: {error.message}
        </p>
      ) : null}
      {success ? <p style={{ color: "#0a0" }}>{success}</p> : null}
      {rows === null || pending ? <p>Loading…</p> : null}
      {rows && rows.length === 0 && !error ? <p>No customers yet.</p> : null}
      <ul>
        {(rows ?? []).map((c) => (
          <li key={c.id}>
            {c.name} {c.active ? "(active)" : "(inactive)"}{" "}
            {c.active ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deactivateCustomer(c.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setSuccess("Customer deactivated.");
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
                    const result = await updateCustomer({ id: c.id, active: true });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setSuccess("Customer reactivated.");
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
      <h3>Create customer</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await createCustomer({ name });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSuccess("Customer created.");
            setName("");
            reload();
          });
        }}
      >
        <label>
          Name <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>{" "}
        <button type="submit" disabled={pending}>
          Create
        </button>
      </form>
    </section>
  );
}
