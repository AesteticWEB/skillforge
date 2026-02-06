"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Неверный логин или пароль");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Не удалось выполнить вход");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <main className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-left">
        <h1 className="text-2xl font-semibold">Вход</h1>
        <p className="mt-2 text-sm text-slate-400">
          Используй <span className="font-semibold text-slate-200">admin1</span> /{" "}
          <span className="font-semibold text-slate-200">admin1</span> для первого входа.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Логин</span>
            <input
              type="text"
              name="login"
              autoComplete="username"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Пароль</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Входим..." : "Войти"}
          </button>
        </form>
      </main>
    </div>
  );
}
