"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type EventEntry = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const pickEventArray = (container: Record<string, unknown>): EventEntry[] | null => {
  const keys = ["events", "eventLog", "domainEvents", "recentEvents", "history", "eventHistory"];
  for (const key of keys) {
    const value = container[key];
    if (Array.isArray(value)) {
      return value as EventEntry[];
    }
  }
  return null;
};

const extractEvents = (state: unknown): EventEntry[] => {
  if (!isRecord(state)) {
    return [];
  }
  const direct = pickEventArray(state);
  if (direct) {
    return direct;
  }
  const debug = isRecord(state.debug) ? pickEventArray(state.debug) : null;
  if (debug) {
    return debug;
  }
  const analytics = isRecord(state.analytics) ? pickEventArray(state.analytics) : null;
  if (analytics) {
    return analytics;
  }
  const meta = isRecord(state.meta) ? pickEventArray(state.meta) : null;
  if (meta) {
    return meta;
  }
  return [];
};

const formatEventTitle = (event: EventEntry): string => {
  const type =
    event.type ?? event.eventType ?? event.name ?? event.action ?? event.id ?? "event";
  return String(type);
};

const formatEventTime = (event: EventEntry): string => {
  const time =
    event.timestamp ??
    event.time ??
    event.createdAt ??
    event.at ??
    event.unlockedAt ??
    event.date;
  if (!time) {
    return "";
  }
  return String(time);
};

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
};

export default function DebugPage() {
  const [loading, setLoading] = useState(true);
  const [stateJson, setStateJson] = useState<string | null>(null);
  const [parsedState, setParsedState] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    setParseError(null);
    try {
      const response = await fetch("/api/progress");
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to load progress");
      }
      const data = await response.json();
      const raw = typeof data.stateJson === "string" ? data.stateJson : null;
      setStateJson(raw);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setParsedState(parsed);
          setParseError(null);
        } catch {
          setParsedState(null);
          setParseError("State JSON is invalid.");
        }
      } else {
        setParsedState(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const events = useMemo(() => extractEvents(parsedState), [parsedState]);
  const recentEvents = useMemo(() => {
    if (!events.length) {
      return [];
    }
    return events.slice(-10).reverse();
  }, [events]);

  const onExport = () => {
    if (!stateJson) {
      return;
    }
    const blob = new Blob([stateJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `skillforge-save-${timestamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async () => {
    setImportError(null);
    setImportSuccess(null);
    const trimmed = importText.trim();
    if (!trimmed) {
      setImportError("Provide JSON to import.");
      return;
    }
    try {
      JSON.parse(trimmed);
    } catch {
      setImportError("Invalid JSON.");
      return;
    }
    setImporting(true);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateJson: trimmed }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to import state");
      }
      setImportSuccess("State imported successfully.");
      setImportText("");
      await loadState();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const onImportFile = async (file: File | null) => {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      setImportText(text);
    } catch {
      setImportError("Failed to read file.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Debug Console</h1>
          <p className="text-sm text-slate-400">
            Admin-only tools for inspecting and restoring user progress.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Current Progress State</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadState}
                  className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={onExport}
                  disabled={!stateJson}
                  className="rounded-lg border border-emerald-500/60 px-3 py-1 text-xs text-emerald-200 disabled:opacity-50"
                >
                  Export save JSON
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-sm text-slate-400">Loading...</div>
            ) : stateJson ? (
              <div className="space-y-3">
                {parseError ? (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {parseError}
                  </div>
                ) : null}
                <textarea
                  readOnly
                  value={stateJson}
                  rows={16}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-100"
                />
              </div>
            ) : (
              <div className="text-sm text-slate-500">No saved progress yet.</div>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold">Recent Domain Events</h2>
            {recentEvents.length === 0 ? (
              <div className="text-sm text-slate-500">No events found in state.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {recentEvents.map((event, index) => {
                  const title = formatEventTitle(event);
                  const time = formatEventTime(event);
                  const body = safeStringify(event);
                  return (
                    <div
                      key={`${title}-${index}`}
                      className="rounded-lg border border-slate-800/70 bg-slate-950/60 p-3"
                    >
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-semibold">{title}</span>
                        {time ? <span className="text-slate-500">{time}</span> : null}
                      </div>
                      {body ? (
                        <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-400">
                          {body}
                        </pre>
                      ) : (
                        <div className="mt-2 text-slate-500">Event payload not serializable.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Import Save JSON</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Paste a JSON save or upload a file. Validation happens before saving.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,220px]">
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              rows={8}
              placeholder="{ ... }"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-100"
            />
            <div className="space-y-3">
              <label className="grid gap-2 text-xs text-slate-400">
                Upload file
                <input
                  type="file"
                  accept="application/json"
                  onChange={(event) => onImportFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-slate-200"
                />
              </label>
              <button
                type="button"
                onClick={onImport}
                disabled={importing}
                className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {importing ? "Importing..." : "Import save JSON"}
              </button>
              {importError ? (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {importError}
                </div>
              ) : null}
              {importSuccess ? (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  {importSuccess}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
