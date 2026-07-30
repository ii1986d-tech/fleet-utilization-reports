"use client";

import { useState, useTransition } from "react";
import {
  confirmAssignmentImport,
  downloadImportErrorReport,
  getImportJob,
  uploadAssignmentImport,
  type ImportJobRowView,
  type ImportJobSummary,
} from "@/lib/imports/assignments/actions";
import type { AppError } from "@/lib/assignments/errors";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function AssignmentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [createNewMasters, setCreateNewMasters] = useState(false);
  const [job, setJob] = useState<ImportJobSummary | null>(null);
  const [rows, setRows] = useState<ImportJobRowView[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [phase, setPhase] = useState<
    "empty" | "selected" | "uploading" | "preview" | "confirming" | "done" | "failed"
  >("empty");
  const [downloading, setDownloading] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = pending || downloading;

  return (
    <section>
      <h2>Assignment Excel import</h2>
      <p style={{ color: "#555", fontSize: "0.9rem" }}>
        .xlsx only · max 5 MiB / 2000 rows · exactly one non-empty sheet · create masters default
        OFF · vehicles never auto-created
      </p>

      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          [{error.httpStatus}] {error.code}: {error.message}
        </p>
      ) : null}

      {phase === "empty" || phase === "selected" || phase === "failed" ? (
        <div>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPhase(f ? "selected" : "empty");
              setError(null);
              setJob(null);
              setRows([]);
            }}
          />
          {file ? (
            <p>
              Selected: {file.name} ({file.size} bytes)
            </p>
          ) : (
            <p>No file selected.</p>
          )}
          <label style={{ display: "block", margin: "0.75rem 0" }}>
            <input
              type="checkbox"
              checked={createNewMasters}
              onChange={(e) => setCreateNewMasters(e.target.checked)}
            />{" "}
            Create missing drivers/customers on confirm (default OFF)
          </label>
          <button
            type="button"
            disabled={!file || busy}
            onClick={() => {
              if (!file) return;
              startTransition(async () => {
                setPhase("uploading");
                setError(null);
                try {
                  const bytesBase64 = await fileToBase64(file);
                  const result = await uploadAssignmentImport({
                    filename: file.name,
                    bytesBase64,
                    createNewMasters,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    setPhase("failed");
                    return;
                  }
                  setJob(result.data.job);
                  setRows(result.data.rows);
                  setPhase("preview");
                } catch (e) {
                  setError({
                    code: "INTERNAL_ERROR",
                    message: e instanceof Error ? e.message : "Upload failed",
                    httpStatus: 500,
                  });
                  setPhase("failed");
                }
              });
            }}
          >
            Upload &amp; validate
          </button>
        </div>
      ) : null}

      {phase === "uploading" || busy ? <p>Uploading / parsing…</p> : null}

      {job ? (
        <div style={{ marginTop: "1rem" }}>
          <h3>Job {job.id.slice(0, 8)}… — {job.status}</h3>
          <p>
            File: {job.source_filename} · Sheet: {job.worksheet_name ?? "—"}
          </p>
          <p>
            total {job.total_rows} · valid {job.valid_rows} · invalid {job.invalid_rows} ·
            skipped {job.skipped_rows} · persisted {job.persisted_rows} · failed {job.failed_rows}
          </p>

          {job.status === "validated" ? (
            <button
              type="button"
              disabled={busy}
              aria-busy={busy}
              onClick={() => {
                if (busy) return;
                startTransition(async () => {
                  setPhase("confirming");
                  setError(null);
                  const result = await confirmAssignmentImport({
                    jobId: job.id,
                    createNewMasters,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    if (result.error.code === "IMPORT_ALREADY_CONFIRMED") {
                      const refreshed = await getImportJob(job.id);
                      if (refreshed.ok) {
                        setJob(refreshed.data.job);
                        setRows(refreshed.data.rows);
                        setPhase("done");
                      } else {
                        setPhase("failed");
                      }
                      return;
                    }
                    setPhase("failed");
                    return;
                  }
                  setJob(result.data.job);
                  setRows(result.data.rows);
                  setPhase("done");
                });
              }}
            >
              Confirm import
            </button>
          ) : null}

          {rows.some(
            (r) => r.validation_status === "invalid" || r.persistence_status === "failed",
          ) ? (
            <button
              type="button"
              style={{ marginLeft: "0.75rem" }}
              disabled={busy}
              aria-label="Download import error report"
              aria-busy={downloading}
              onClick={() => {
                if (busy) return;
                setDownloading(true);
                setError(null);
                void (async () => {
                  try {
                    const result = await downloadImportErrorReport({ jobId: job.id });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    const binary = atob(result.data.bytesBase64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                      bytes[i] = binary.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], {
                      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    });
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = result.data.filename;
                    anchor.click();
                    URL.revokeObjectURL(url);
                  } finally {
                    setDownloading(false);
                  }
                })();
              }}
            >
              {downloading ? "Downloading…" : "Download error report"}
            </button>
          ) : null}

          {phase === "confirming" ? <p>Confirming (CAS + per-row persist)…</p> : null}

          {phase === "done" ? (
            <p style={{ color: "#0a0" }}>
              {job.status === "completed"
                ? "Import completed."
                : job.status === "completed_with_errors"
                  ? "Import finished with errors (partial success)."
                  : `Status: ${job.status}`}
            </p>
          ) : null}

          <table style={{ width: "100%", marginTop: "1rem", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                <th>Row</th>
                <th>Validation</th>
                <th>Persist</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r) => (
                <tr key={r.id}>
                  <td>{r.source_row_number}</td>
                  <td>{r.validation_status}</td>
                  <td>{r.persistence_status}</td>
                  <td>
                    {JSON.stringify(r.validation_errors)}{" "}
                    {JSON.stringify(r.validation_warnings)}{" "}
                    {JSON.stringify(r.persistence_errors ?? [])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 200 ? <p>Showing first 200 of {rows.length} rows.</p> : null}

          <button
            type="button"
            style={{ marginTop: "1rem" }}
            onClick={() => {
              setFile(null);
              setJob(null);
              setRows([]);
              setError(null);
              setPhase("empty");
              setCreateNewMasters(false);
            }}
          >
            New upload
          </button>
        </div>
      ) : null}
    </section>
  );
}
