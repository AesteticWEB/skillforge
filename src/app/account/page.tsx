"use client";

import { useState, type FormEvent } from "react";

type Message = { type: "error" | "success"; text: string } | null;

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (newPassword !== confirm) {
      setMessage({ type: "error", text: "Пароли не совпадают." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirm }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Не удалось сменить пароль");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setMessage({ type: "success", text: "Пароль обновлён." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Ошибка",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <main className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-left">
        <h1 className="text-2xl font-semibold">Аккаунт</h1>
        <p className="mt-2 text-sm text-slate-400">Смена пароля для текущего пользователя.</p>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Текущий пароль</span>
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Новый пароль</span>
            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Подтверждение</span>
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </label>
          {message ? (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-200"
              }`}
            >
              {message.text}
            </div>
          ) : null}
          <button
            type="submit"
            className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={saving}
          >
            {saving ? "Сохраняем..." : "Сменить пароль"}
          </button>
        </form>
      </main>
    </div>
  );
}
