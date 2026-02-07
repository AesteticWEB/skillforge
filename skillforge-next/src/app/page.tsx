"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function Home() {
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
        credentials: "include",
        body: JSON.stringify({
          login: login.trim(),
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const fallback = "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C";
        const message = data?.error === "Invalid credentials" ? fallback : data?.error || fallback;
        setError(message);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0443");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <main className="w-full max-w-xl rounded-2xl border border-slate-800/80 bg-slate-900/40 p-10">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">SkillForge</h1>
          <p className="text-sm text-slate-400">
            {"\u0412\u0445\u043E\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D\u043A\u0443"}
          </p>
        </div>

        <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">{"\u041B\u043E\u0433\u0438\u043D"}</span>
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
            <span className="text-slate-300">{"\u041F\u0430\u0440\u043E\u043B\u044C"}</span>
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
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "\u0412\u0445\u043E\u0434..."
              : "\u0412\u043E\u0439\u0442\u0438 \u0432 \u0430\u0434\u043C\u0438\u043D\u043A\u0443"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          {"\u0410\u0434\u043C\u0438\u043D \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E:"}{" "}
          <span className="font-semibold text-slate-200">admin1</span> /{" "}
          <span className="font-semibold text-slate-200">admin1</span>
        </p>
      </main>
    </div>
  );
}
