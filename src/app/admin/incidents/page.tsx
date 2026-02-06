"use client";

import { useEffect, useState, type FormEvent } from "react";

type IncidentOption = {
  id: string;
  text: string;
  effectsJson: string;
};

type Incident = {
  id: string;
  title: string;
  description: string;
  severity: string;
  enabled: boolean;
  options: IncidentOption[];
};

type IncidentForm = {
  id: string;
  title: string;
  description: string;
  severity: string;
  enabled: boolean;
  options: IncidentOption[];
};

const createEmptyOptions = (): IncidentOption[] =>
  Array.from({ length: 3 }).map(() => ({ id: "", text: "", effectsJson: "{}" }));

const EMPTY_FORM: IncidentForm = {
  id: "",
  title: "",
  description: "",
  severity: "",
  enabled: true,
  options: createEmptyOptions(),
};

const normalizeOptions = (options: IncidentOption[]): IncidentOption[] => {
  const normalized = options.slice(0, 3).map((option) => ({
    id: option.id ?? "",
    text: option.text ?? "",
    effectsJson: option.effectsJson ?? "{}",
  }));
  while (normalized.length < 3) {
    normalized.push({ id: "", text: "", effectsJson: "{}" });
  }
  return normalized;
};

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<IncidentForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/incidents");
      if (!response.ok) {
        throw new Error("Failed to load incidents");
      }
      const data = await response.json();
      setIncidents(data.incidents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (incident: Incident) => {
    setEditingId(incident.id);
    setForm({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      enabled: incident.enabled,
      options: normalizeOptions(incident.options ?? []),
    });
  };

  const updateOption = (index: number, patch: Partial<IncidentOption>) => {
    setForm((current) => {
      const options = current.options.map((option, idx) =>
        idx === index ? { ...option, ...patch } : option,
      );
      return { ...current, options };
    });
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingId ? `/api/admin/incidents/${editingId}` : "/api/admin/incidents",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            options: normalizeOptions(form.options),
          }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save incident");
      }
      await loadIncidents();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const deleteIncident = async (incidentId: string) => {
    if (!confirm("Delete this incident?")) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/admin/incidents/${incidentId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete incident");
      }
      await loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Incidents</h1>
        <p className="text-sm text-slate-400">Company incidents and options.</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
        <form
          onSubmit={submitForm}
          className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit incident" : "Create incident"}
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Reset
              </button>
            ) : null}
          </div>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">ID (optional)</span>
            <input
              value={form.id}
              onChange={(event) => setForm({ ...form, id: event.target.value })}
              disabled={Boolean(editingId)}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60 disabled:opacity-60"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Severity</span>
            <input
              value={form.severity}
              onChange={(event) => setForm({ ...form, severity: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              required
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950"
            />
            Enabled
          </label>

          <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Options (3)
            </div>
            {form.options.map((option, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-slate-800/70 bg-slate-950/60 p-3">
                <div className="text-xs text-slate-400">Option {index + 1}</div>
                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Text</span>
                  <input
                    value={option.text}
                    onChange={(event) => updateOption(index, { text: event.target.value })}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Effects JSON</span>
                  <textarea
                    value={option.effectsJson}
                    onChange={(event) => updateOption(index, { effectsJson: event.target.value })}
                    rows={2}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-emerald-400/60"
                  />
                </label>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Create incident"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Incident list</h2>
            <button
              type="button"
              onClick={loadIncidents}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Enabled</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-400" colSpan={4}>
                      Loading...
                    </td>
                  </tr>
                ) : incidents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>
                      No incidents yet.
                    </td>
                  </tr>
                ) : (
                  incidents.map((incident) => (
                    <tr key={incident.id} className="bg-slate-950/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{incident.title}</div>
                        <div className="text-xs text-slate-500">{incident.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{incident.severity}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {incident.enabled ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(incident)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteIncident(incident.id)}
                            className="rounded-lg border border-rose-500/60 px-3 py-1 text-xs text-rose-200 hover:border-rose-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
