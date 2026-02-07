"use client";

import { useEffect, useState, type FormEvent } from "react";

type Item = {
  id: string;
  title: string;
  description: string;
  priceCoins: number;
  priceCash: number | null;
  rarity: string;
  effectsJson: string;
  enabled: boolean;
};

type ItemForm = {
  id: string;
  title: string;
  description: string;
  priceCoins: string;
  priceCash: string;
  rarity: string;
  effectsJson: string;
  enabled: boolean;
};

const EMPTY_FORM: ItemForm = {
  id: "",
  title: "",
  description: "",
  priceCoins: "0",
  priceCash: "",
  rarity: "",
  effectsJson: "{}",
  enabled: true,
};

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/items");
      if (!response.ok) {
        throw new Error("Failed to load items");
      }
      const data = await response.json();
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      title: item.title,
      description: item.description,
      priceCoins: String(item.priceCoins ?? 0),
      priceCash: item.priceCash === null ? "" : String(item.priceCash),
      rarity: item.rarity,
      effectsJson: item.effectsJson,
      enabled: item.enabled,
    });
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      priceCash: form.priceCash === "" ? null : form.priceCash,
    };

    try {
      const response = await fetch(
        editingId ? `/api/admin/items/${editingId}` : "/api/admin/items",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save item");
      }
      await loadItems();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/admin/items/${itemId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete item");
      }
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const toggleEnabled = async (item: Item) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          priceCash: item.priceCash === null ? null : item.priceCash,
          enabled: !item.enabled,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update item");
      }
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Items</h1>
        <p className="text-sm text-slate-400">Manage shop items and buffs.</p>
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
              {editingId ? "Edit item" : "Create item"}
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
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Price coins</span>
              <input
                value={form.priceCoins}
                onChange={(event) => setForm({ ...form, priceCoins: event.target.value })}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Price cash</span>
              <input
                value={form.priceCash}
                onChange={(event) => setForm({ ...form, priceCash: event.target.value })}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Rarity</span>
            <input
              value={form.rarity}
              onChange={(event) => setForm({ ...form, rarity: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Effects JSON</span>
            <textarea
              value={form.effectsJson}
              onChange={(event) => setForm({ ...form, effectsJson: event.target.value })}
              rows={4}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-emerald-400/60"
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
            {saving ? "Saving..." : editingId ? "Save changes" : "Create item"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Items list</h2>
            <button
              type="button"
              onClick={loadItems}
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
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Rarity</th>
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
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={5}>
                      No items yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="bg-slate-950/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.priceCoins}c
                        {item.priceCash !== null ? ` / ${item.priceCash}$` : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{item.rarity}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleEnabled(item)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.enabled
                              ? "bg-emerald-400/20 text-emerald-200"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {item.enabled ? "Enabled" : "Disabled"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
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
