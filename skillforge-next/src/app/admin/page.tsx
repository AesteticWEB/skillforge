import Link from "next/link";

const LINKS = [
  { href: "/admin/items", title: "Items", description: "Shop catalog and balance." },
  { href: "/admin/scenarios", title: "Scenarios", description: "Scenario cards with options." },
  { href: "/admin/exams", title: "Exams", description: "Exam configs by stage." },
  { href: "/admin/questions", title: "Questions", description: "Question bank and answers." },
  { href: "/admin/quick-fixes", title: "Quick Fixes", description: "Safety net micro-contracts." },
  { href: "/admin/incidents", title: "Incidents", description: "Company incidents and options." },
  { href: "/admin/users", title: "Users", description: "Accounts and roles." },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Admin Console</h1>
        <p className="text-sm text-slate-400">
          Manage content and users. Changes are saved directly to the database.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900/70"
          >
            <h2 className="text-lg font-semibold text-slate-100">{link.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
