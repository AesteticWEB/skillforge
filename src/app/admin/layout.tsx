import Link from "next/link";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/admin/items", label: "Items" },
  { href: "/admin/scenarios", label: "Scenarios" },
  { href: "/admin/exams", label: "Exams" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/quick-fixes", label: "Quick Fixes" },
  { href: "/admin/incidents", label: "Incidents" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-slate-800/80 bg-slate-950/80 px-6 py-8">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</div>
          <h1 className="mt-2 text-lg font-semibold text-slate-100">SkillForge</h1>
          <nav className="mt-8 grid gap-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-slate-900/70 hover:text-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 border-t border-slate-800/60 pt-4 text-xs text-slate-500">
            <Link href="/" className="text-emerald-300 hover:text-emerald-200">
              Back to app
            </Link>
          </div>
        </aside>
        <main className="flex-1 px-8 py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
