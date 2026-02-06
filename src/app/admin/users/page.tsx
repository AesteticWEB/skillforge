"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  login: string;
  role: "admin" | "user";
  createdAt: string;
  updatedAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to load users");
      }
      const data = await response.json();
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Users</h1>
        <p className="text-sm text-slate-400">Accounts and roles.</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">User list</h2>
          <button
            type="button"
            onClick={loadUsers}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-800/80">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Login</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={4}>
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={4}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="bg-slate-950/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{user.login}</div>
                      <div className="text-xs text-slate-500">{user.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{user.role}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(user.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
