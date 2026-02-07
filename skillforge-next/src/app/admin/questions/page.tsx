"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type QuestionOption = {
  id: string;
  text: string;
  explanation: string;
  isCorrect: boolean;
};

type Question = {
  id: string;
  profession: string | null;
  text: string;
  tagsJson: string;
  difficulty: number | null;
  enabled: boolean;
  options: QuestionOption[];
};

type QuestionForm = {
  id: string;
  profession: string;
  text: string;
  tagsJson: string;
  difficulty: string;
  enabled: boolean;
  options: QuestionOption[];
};

const createOption = (): QuestionOption => ({
  id: "",
  text: "",
  explanation: "",
  isCorrect: false,
});

const EMPTY_FORM: QuestionForm = {
  id: "",
  profession: "",
  text: "",
  tagsJson: "[]",
  difficulty: "",
  enabled: true,
  options: [createOption(), createOption()],
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterProfession, setFilterProfession] = useState("");

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProfession) {
        params.set("profession", filterProfession);
      }
      const query = params.toString();
      const response = await fetch(`/api/admin/questions${query ? `?${query}` : ""}`);
      if (!response.ok) {
        throw new Error("Failed to load questions");
      }
      const data = await response.json();
      setQuestions(data.questions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filterProfession]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (question: Question) => {
    setEditingId(question.id);
    setForm({
      id: question.id,
      profession: question.profession ?? "",
      text: question.text,
      tagsJson: question.tagsJson,
      difficulty: question.difficulty === null ? "" : String(question.difficulty),
      enabled: question.enabled,
      options: question.options.length ? question.options : [createOption(), createOption()],
    });
  };

  const updateOption = (index: number, patch: Partial<QuestionOption>) => {
    setForm((current) => {
      const options = current.options.map((option, idx) =>
        idx === index ? { ...option, ...patch } : option,
      );
      return { ...current, options };
    });
  };

  const addOption = () => {
    setForm((current) => ({ ...current, options: [...current.options, createOption()] }));
  };

  const removeOption = (index: number) => {
    setForm((current) => {
      if (current.options.length <= 2) {
        return current;
      }
      const options = current.options.filter((_, idx) => idx !== index);
      return { ...current, options };
    });
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingId ? `/api/admin/questions/${editingId}` : "/api/admin/questions",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save question");
      }
      await loadQuestions();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?") ) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete question");
      }
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Questions</h1>
        <p className="text-sm text-slate-400">Manage question bank and answers.</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
        <form
          onSubmit={submitForm}
          className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit question" : "Create question"}
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
            <span className="text-slate-300">Profession (optional)</span>
            <input
              value={form.profession}
              onChange={(event) => setForm({ ...form, profession: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Text</span>
            <textarea
              value={form.text}
              onChange={(event) => setForm({ ...form, text: event.target.value })}
              rows={3}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Tags JSON</span>
            <textarea
              value={form.tagsJson}
              onChange={(event) => setForm({ ...form, tagsJson: event.target.value })}
              rows={2}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-emerald-400/60"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Difficulty (optional)</span>
            <input
              value={form.difficulty}
              onChange={(event) => setForm({ ...form, difficulty: event.target.value })}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
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

          <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Answers
              </div>
              <button
                type="button"
                onClick={addOption}
                className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500"
              >
                Add
              </button>
            </div>
            {form.options.map((option, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-slate-800/70 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Answer {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={form.options.length <= 2}
                    className="text-xs text-slate-500 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Text</span>
                  <input
                    value={option.text}
                    onChange={(event) => updateOption(index, { text: event.target.value })}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Explanation</span>
                  <textarea
                    value={option.explanation}
                    onChange={(event) => updateOption(index, { explanation: event.target.value })}
                    rows={2}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400/60"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={option.isCorrect}
                    onChange={(event) => updateOption(index, { isCorrect: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                  />
                  Correct
                </label>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Create question"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Question list</h2>
              <p className="text-xs text-slate-500">Filter by profession if needed.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <input
                value={filterProfession}
                onChange={(event) => setFilterProfession(event.target.value)}
                placeholder="Profession"
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-slate-100"
              />
              <button
                type="button"
                onClick={loadQuestions}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
              >
                Apply
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Text</th>
                  <th className="px-4 py-3">Profession</th>
                  <th className="px-4 py-3">Enabled</th>
                  <th className="px-4 py-3">Answers</th>
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
                ) : questions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={5}>
                      No questions found.
                    </td>
                  </tr>
                ) : (
                  questions.map((question) => {
                    const correctCount = question.options.filter((option) => option.isCorrect).length;
                    return (
                      <tr key={question.id} className="bg-slate-950/40">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-100">{question.text}</div>
                          <div className="text-xs text-slate-500">{question.id}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {question.profession ?? "Any"}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {question.enabled ? "Yes" : "No"}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {question.options.length} ({correctCount} correct)
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(question)}
                              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteQuestion(question.id)}
                              className="rounded-lg border border-rose-500/60 px-3 py-1 text-xs text-rose-200 hover:border-rose-400"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
