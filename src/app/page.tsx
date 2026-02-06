import pkg from "../../package.json";

export default function Home() {
  const nextVersion =
    pkg.dependencies?.next ?? pkg.devDependencies?.next ?? "unknown";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <main className="w-full max-w-xl rounded-2xl border border-slate-800/80 bg-slate-900/40 p-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">SkillForge</h1>
        <p className="mt-3 text-sm text-slate-400">
          Next.js версия: {nextVersion}
        </p>
      </main>
    </div>
  );
}
