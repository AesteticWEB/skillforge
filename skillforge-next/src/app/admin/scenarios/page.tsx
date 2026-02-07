"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type ScenarioOption = {
  id: string;
  text: string;
  isCorrect: boolean;
  effectsJson: string;
};

type Scenario = {
  id: string;
  profession: string;
  stage: string;
  title: string;
  description: string;
  rewardXp: number;
  rewardCoins: number;
  enabled: boolean;
  options: ScenarioOption[];
};

type ScenarioForm = {
  id: string;
  profession: string;
  stage: string;
  title: string;
  description: string;
  rewardXp: string;
  rewardCoins: string;
  enabled: boolean;
  options: ScenarioOption[];
};

const createEmptyOptions = (): ScenarioOption[] =>
  Array.from({ length: 4 }).map(() => ({
    id: "",
    text: "",
    effectsJson: "{}",
    isCorrect: false,
  }));

const EMPTY_FORM: ScenarioForm = {
  id: "",
  profession: "",
  stage: "",
  title: "",
  description: "",
  rewardXp: "0",
  rewardCoins: "0",
  enabled: true,
  options: createEmptyOptions(),
};

const normalizeOptions = (options: ScenarioOption[]): ScenarioOption[] => {
  const normalized = options.slice(0, 4).map((option) => ({
    id: option.id ?? "",
    text: option.text ?? "",
    effectsJson: option.effectsJson ?? "{}",
    isCorrect: Boolean(option.isCorrect),
  }));
  while (normalized.length < 4) {
    normalized.push({ id: "", text: "", effectsJson: "{}", isCorrect: false });
  }
  return normalized;
};

export default function AdminScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ScenarioForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterProfession, setFilterProfession] = useState("");
  const [filterStage, setFilterStage] = useState("");

  const loadScenarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProfession) {
        params.set("profession", filterProfession);
      }
      if (filterStage) {
        params.set("stage", filterStage);
      }
      const query = params.toString();
      const response = await fetch(`/api/admin/scenarios${query ? `?${query}` : ""}`);
      if (!response.ok) {
        throw new Error("Failed to load scenarios");
      }
      const data = await response.json();
      setScenarios(data.scenarios ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filterProfession, filterStage]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (scenario: Scenario) => {
    setEditingId(scenario.id);
    setForm({
      id: scenario.id,
      profession: scenario.profession,
      stage: scenario.stage,
      title: scenario.title,
      description: scenario.description,
      rewardXp: String(scenario.rewardXp ?? 0),
      rewardCoins: String(scenario.rewardCoins ?? 0),
      enabled: scenario.enabled,
      options: normalizeOptions(scenario.options ?? []),
    });
  };

  const updateOption = (index: number, patch: Partial<ScenarioOption>) => {
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
        editingId ? `/api/admin/scenarios/${editingId}` : "/api/admin/scenarios",
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
        throw new Error(data?.error || "Failed to save scenario");
      }
      await loadScenarios();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const deleteScenario = async (scenarioId: string) => {
    if (!confirm("Delete this scenario?")) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/admin/scenarios/${scenarioId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete scenario");
      }
      await loadScenarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Scenarios</h1>
        <p className="text-sm text-slate-400">Manage scenarios and answer options.</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <form
          onSubmit={submitForm}
          className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit scenario" : "Create scenario"}
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
            <span className="text-slate-300">Profession</span>
            <input
              value={form.profession}
              onChange={(event) => setForm({ ...form, profession: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Stage</span>
            <input
              value={form.stage}
              onChange={(event) => setForm({ ...form, stage: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              required
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
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Reward XP</span>
              <input
                value={form.rewardXp}
                onChange={(event) => setForm({ ...form, rewardXp: event.target.value })}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Reward coins</span>
              <input
                value={form.rewardCoins}
                onChange={(event) => setForm({ ...form, rewardCoins: event.target.value })}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              />
            </label>
          </div>
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
              Options (4)
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
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={option.isCorrect}
                    onChange={(event) => updateOption(index, { isCorrect: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                  />
                  Correct
                </label>
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Create scenario"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Scenario list</h2>
              <p className="text-xs text-slate-500">Filter by profession or stage.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <input
                value={filterProfession}
                onChange={(event) => setFilterProfession(event.target.value)}
                placeholder="Profession"
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-slate-100"
              />
              <input
                value={filterStage}
                onChange={(event) => setFilterStage(event.target.value)}
                placeholder="Stage"
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-slate-100"
              />
              <button
                type="button"
                onClick={loadScenarios}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800/80">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Enabled</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-400" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                ) : scenarios.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={5}>
                      No scenarios found.
                    </td>
                  </tr>
                ) : (
                  scenarios.map((scenario) => (
                    <tr key={scenario.id} className="bg-slate-950/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{scenario.title}</div>
                        <div className="text-xs text-slate-500">{scenario.profession}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{scenario.stage}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {scenario.rewardXp} XP / {scenario.rewardCoins} coins
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {scenario.enabled ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(scenario)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteScenario(scenario.id)}
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
