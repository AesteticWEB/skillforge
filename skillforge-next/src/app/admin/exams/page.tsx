"use client";

import { useEffect, useState, type FormEvent } from "react";

type Exam = {
  id: string;
  profession: string;
  stage: string;
  passScore: number;
  questionCount: number;
  enabled: boolean;
};

type ExamForm = {
  id: string;
  profession: string;
  stage: string;
  passScore: string;
  questionCount: string;
  enabled: boolean;
};

const EMPTY_FORM: ExamForm = {
  id: "",
  profession: "",
  stage: "",
  passScore: "70",
  questionCount: "10",
  enabled: true,
};

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/exams");
      if (!response.ok) {
        throw new Error("Failed to load exams");
      }
      const data = await response.json();
      setExams(data.exams ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (exam: Exam) => {
    setEditingId(exam.id);
    setForm({
      id: exam.id,
      profession: exam.profession,
      stage: exam.stage,
      passScore: String(exam.passScore ?? 0),
      questionCount: String(exam.questionCount ?? 0),
      enabled: exam.enabled,
    });
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingId ? `/api/admin/exams/${editingId}` : "/api/admin/exams",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save exam");
      }
      await loadExams();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const deleteExam = async (examId: string) => {
    if (!confirm("Delete this exam?")) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/admin/exams/${examId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete exam");
      }
      await loadExams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Exams</h1>
        <p className="text-sm text-slate-400">Configure exam rules per stage.</p>
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
              {editingId ? "Edit exam" : "Create exam"}
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
            <span className="text-slate-300">Profession</span>
            <input
              value={form.profession}
              onChange={(event) => setForm({ ...form, profession: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Stage</span>
            <input
              value={form.stage}
              onChange={(event) => setForm({ ...form, stage: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Pass score</span>
              <input
                value={form.passScore}
                onChange={(event) => setForm({ ...form, passScore: event.target.value })}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Question count</span>
              <input
                value={form.questionCount}
                onChange={(event) => setForm({ ...form, questionCount: event.target.value })}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              />
            </label>
          </div>
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
            {saving ? "Saving..." : editingId ? "Save changes" : "Create exam"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Exam list</h2>
            <button
              type="button"
              onClick={loadExams}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Pass</th>
                  <th className="px-4 py-3">Questions</th>
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
                ) : exams.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={5}>
                      No exams yet.
                    </td>
                  </tr>
                ) : (
                  exams.map((exam) => (
                    <tr key={exam.id} className="bg-slate-950/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{exam.stage}</div>
                        <div className="text-xs text-slate-500">{exam.profession}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{exam.passScore}%</td>
                      <td className="px-4 py-3 text-slate-300">{exam.questionCount}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {exam.enabled ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(exam)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExam(exam.id)}
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
