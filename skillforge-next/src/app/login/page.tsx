"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [loginValue, setLoginValue] = useState("admin1");
  const [loginPassword, setLoginPassword] = useState("admin1");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginValue, password: loginPassword }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setLoginError(data?.error || "Неверный логин или пароль");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setLoginError("Не удалось войти");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">Вход в админку</h1>
            <p className="text-sm text-slate-400">
              Доступ только по учётной записи{" "}
              <span className="font-semibold text-slate-200">admin1</span> /{" "}
              <span className="font-semibold text-slate-200">admin1</span>
            </p>
          </div>
          <form className="mt-6 grid gap-4" onSubmit={onLogin}>
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Логин</span>
              <input
                type="text"
                name="login"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
                value={loginValue}
                onChange={(event) => setLoginValue(event.target.value)}
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
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </label>
            {loginError ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {loginError}
              </div>
            ) : null}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Вход..." : "Войти"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
