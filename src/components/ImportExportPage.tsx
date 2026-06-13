import { useState } from "react";
import { buildCsvExport, buildJsonExport } from "../services/exportService";
import { importJsonBundle } from "../services/importService";
import { NeonCheckbox } from "./ui/NeonCheckbox";

export function ImportExportPage() {
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleJsonExport() {
    setError("");
    try {
      setOutput(await buildJsonExport());
      setMessage("JSON export generated.");
    } catch (exportError: unknown) {
      setMessage("");
      setError(formatError(exportError, "Could not export JSON data."));
    }
  }

  async function handleCsvExport() {
    setError("");
    try {
      setOutput(await buildCsvExport());
      setMessage("CSV export generated.");
    } catch (exportError: unknown) {
      setMessage("");
      setError(formatError(exportError, "Could not export CSV data."));
    }
  }

  async function handleImport() {
    setError("");
    setMessage("");
    if (!input.trim()) {
      setError("Paste a JSON export before importing.");
      return;
    }
    if (overwrite && !window.confirm("Overwrite existing attempts, responses, review list, and settings?")) {
      return;
    }
    try {
      await importJsonBundle(input, overwrite);
      setMessage("Import complete.");
    } catch (importError: unknown) {
      setError(formatError(importError, "Could not import JSON data."));
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">Export</h2>
        <div className="mt-4 flex gap-3">
          <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleJsonExport()} type="button">JSON Export</button>
          <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => void handleCsvExport()} type="button">CSV Export</button>
        </div>
        <textarea className="mt-4 h-96 w-full rounded-md border border-line p-3 text-xs" readOnly value={output} />
      </section>
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">Import User Data</h2>
        <textarea className="mt-4 h-96 w-full rounded-md border border-line p-3 text-xs" onChange={(event) => {
          setInput(event.target.value);
          if (error) setError("");
        }} placeholder="Paste JSON export here" value={input} />
        {!input.trim() ? <div className="mt-2 text-xs text-muted">JSON export text is required to import user data.</div> : null}
        <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
          <NeonCheckbox ariaLabel="Overwrite existing user data" checked={overwrite} onChange={setOverwrite} />
          Overwrite existing user data
        </label>
        <button className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleImport()} type="button">JSON Import</button>
        {message ? <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">{message}</div> : null}
        {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
      </section>
    </div>
  );
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
