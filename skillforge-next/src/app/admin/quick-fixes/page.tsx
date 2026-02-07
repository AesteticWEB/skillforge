"use client";

import { useEffect, useState, type FormEvent } from "react";

type QuickFix = {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  enabled: boolean;
};

type QuickFixForm = {
  id: string;
  title: string;
  description: string;
  rewardCoins: string;
  enabled: boolean;
};

const EMPTY_FORM: QuickFixForm = {
  id: "",
  title: "",
  description: "",
  rewardCoins: "10",
  enabled: true,
};

export default function AdminQuickFixesPage() {
  const [quickFixes, setQuickFixes] = useState<QuickFix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<QuickFixForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadQuickFixes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/quick-fixes");
      if (!response.ok) {
        throw new Error("Failed to load quick fixes");
      }
      const data = await response.json();
      setQuickFixes(data.quickFixes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuickFixes();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (quickFix: QuickFix) => {
    setEditingId(quickFix.id);
    setForm({
      id: quickFix.id,
      title: quickFix.title,
      description: quickFix.description,
      rewardCoins: String(quickFix.rewardCoins ?? 0),
      enabled: quickFix.enabled,
    });
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingId ? `/api/admin/quick-fixes/${editingId}` : "/api/admin/quick-fixes",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save quick fix");
      }
      await loadQuickFixes();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuickFix = async (quickFixId: string) => {
    if (!confirm("Delete this quick fix?")) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/admin/quick-fixes/${quickFixId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete quick fix");
      }
      await loadQuickFixes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Quick Fixes</h1>
        <p className="text-sm text-slate-400">Safety net micro-contracts.</p>
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
              {editingId ? "Edit quick fix" : "Create quick fix"}
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
            <span className="text-slate-300">Reward coins</span>
            <input
              value={form.rewardCoins}
              onChange={(event) => setForm({ ...form, rewardCoins: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
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
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Create quick fix"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quick fix list</h2>
            <button
              type="button"
              onClick={loadQuickFixes}
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
                  <th className="px-4 py-3">Reward</th>
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
                ) : quickFixes.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>
                      No quick fixes yet.
                    </td>
                  </tr>
                ) : (
                  quickFixes.map((quickFix) => (
                    <tr key={quickFix.id} className="bg-slate-950/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{quickFix.title}</div>
                        <div className="text-xs text-slate-500">{quickFix.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{quickFix.rewardCoins} coins</td>
                      <td className="px-4 py-3 text-slate-300">
                        {quickFix.enabled ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(quickFix)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteQuickFix(quickFix.id)}
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
