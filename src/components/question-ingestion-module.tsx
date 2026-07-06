import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Layers } from "lucide-react";
import type { TestSeriesBundle, TestCore, Question } from "@/lib/admin-types";
import {
  listBundles,
  listTestCoresForBundle,
  createQuestion,
  listQuestionsForTestSubject,
} from "@/server-functions/admin";
import { SmartContent } from "@/lib/smart-content";

type AdminUser = { getIdToken: () => Promise<string> };
type OptionKey = "A" | "B" | "C" | "D";

function ModuleHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-foreground/60">{subtitle}</p>
    </div>
  );
}

function ClayField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/50">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "clay-inset w-full rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none";

// A textarea paired with a live SmartContent preview underneath, since a
// question body/option/solution can be plain text, an image URL, or LaTeX —
// admins need to see which one they actually typed before saving.
function SmartInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <ClayField label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className={inputClass}
      />
      {value.trim() && (
        <div className="clay-inset mt-1.5 rounded-xl px-3 py-2">
          <SmartContent value={value} className="text-sm text-foreground" />
        </div>
      )}
    </ClayField>
  );
}

export function QuestionIngestionModule({ adminUser }: { adminUser: AdminUser }) {
  const [bundles, setBundles] = useState<TestSeriesBundle[] | null>(null);
  const [bundleId, setBundleId] = useState("");
  const [tests, setTests] = useState<TestCore[] | null>(null);
  const [testId, setTestId] = useState("");
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const [body, setBody] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState<OptionKey>("A");
  const [solution, setSolution] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [isPYQ, setIsPYQ] = useState(false);
  const [pyqYear, setPyqYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTest = tests?.find((t) => t.id === testId) ?? null;
  const nextQuestionNo = (questions?.length ?? 0) + 1;

  useEffect(() => {
    (async () => {
      const token = await adminUser.getIdToken();
      const { bundles: rows } = await listBundles({ data: { token } });
      setBundles(rows as TestSeriesBundle[]);
      if (rows.length > 0) setBundleId(rows[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser]);

  useEffect(() => {
    if (!bundleId) return;
    (async () => {
      const token = await adminUser.getIdToken();
      const { testCores } = await listTestCoresForBundle({ data: { token, bundleId } });
      setTests(testCores as TestCore[]);
      setTestId(testCores.length > 0 ? testCores[0].id : "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundleId]);

  useEffect(() => {
    if (!selectedTest) return;
    if (!selectedTest.subjects.includes(subject)) {
      setSubject(selectedTest.subjects[0] ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, selectedTest]);

  async function refreshQuestions() {
    if (!testId || !subject) return setQuestions([]);
    const token = await adminUser.getIdToken();
    const { questions: rows } = await listQuestionsForTestSubject({ data: { token, testId, subject } });
    setQuestions(rows as Question[]);
  }

  useEffect(() => {
    refreshQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, subject]);

  function resetQuestionFields() {
    setBody("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectOption("A");
    setSolution("");
    setDifficulty("Medium");
    setIsPYQ(false);
    setPyqYear("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!bundleId || !testId || !subject) return setError("Select a bundle, test, and subject first.");
    if (!body.trim()) return setError("Enter the question body.");
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      return setError("Fill in all four options.");
    }
    if (!solution.trim()) return setError("Enter the step-by-step solution.");
    if (isPYQ && !pyqYear.trim()) return setError("Enter the PYQ year (e.g. NEET 2024).");

    setSaving(true);
    try {
      const token = await adminUser.getIdToken();
      await createQuestion({
        data: {
          token,
          question: {
            bundleId,
            testId,
            subject,
            questionNo: nextQuestionNo,
            body: body.trim(),
            options: { A: optionA.trim(), B: optionB.trim(), C: optionC.trim(), D: optionD.trim() },
            correctOption,
            solution: solution.trim(),
            difficulty,
            isPYQ,
            pyqYear: isPYQ ? pyqYear.trim() : undefined,
          },
        },
      });
      resetQuestionFields();
      await refreshQuestions();
    } catch {
      setError("Could not save the question. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Question Ingestion Engine"
        subtitle="Select Bundle → Test → Subject, then add questions one at a time."
      />

      <div className="clay mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:p-6">
        <ClayField label="Bundle">
          <select
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value)}
            className={inputClass + " appearance-none"}
          >
            {(bundles ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </ClayField>
        <ClayField label="Test">
          <select
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            className={inputClass + " appearance-none"}
          >
            {tests === null || tests.length === 0 ? (
              <option>No tests in this bundle yet</option>
            ) : (
              tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </ClayField>
        <ClayField label="Subject">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass + " appearance-none"}
          >
            {(selectedTest?.subjects ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </ClayField>
      </div>

      {!testId || !subject ? (
        <div className="clay p-8 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 text-foreground/30" />
          <p className="text-sm text-foreground/60">
            Create a bundle and add a test with subjects first (Test Core Configurator), then come
            back here to add questions.
          </p>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="clay mb-6 space-y-5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="clay-chip inline-flex items-center px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground/70">
                Question No. {nextQuestionNo}
              </span>
              <span className="text-xs text-foreground/40">
                {subject} · {selectedTest?.name}
              </span>
            </div>

            <SmartInput
              label="Question body"
              value={body}
              onChange={setBody}
              placeholder="Type text, paste an image URL, or write LaTeX like $E = mc^2$"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SmartInput label="Option A" value={optionA} onChange={setOptionA} placeholder="Option A" />
              <SmartInput label="Option B" value={optionB} onChange={setOptionB} placeholder="Option B" />
              <SmartInput label="Option C" value={optionC} onChange={setOptionC} placeholder="Option C" />
              <SmartInput label="Option D" value={optionD} onChange={setOptionD} placeholder="Option D" />
            </div>

            <ClayField label="Correct option">
              <div className="grid grid-cols-4 gap-2">
                {(["A", "B", "C", "D"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCorrectOption(opt)}
                    className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      correctOption === opt ? "clay-btn text-white" : "clay-btn-ghost text-foreground/70"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </ClayField>

            <SmartInput
              label="Step-by-step solution"
              value={solution}
              onChange={setSolution}
              placeholder="Explain the solution — text, image, or LaTeX"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ClayField label="Difficulty">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                  className={inputClass + " appearance-none"}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </ClayField>

              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  Previous Year Question
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPYQ((v) => !v)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      isPYQ ? "bg-[var(--sky-deep)]" : "bg-foreground/10"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        isPYQ ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  {isPYQ && (
                    <input
                      value={pyqYear}
                      onChange={(e) => setPyqYear(e.target.value)}
                      placeholder="e.g. NEET 2024"
                      className={inputClass}
                    />
                  )}
                </div>
              </div>
            </div>

            {error && (
              <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Save Question ${nextQuestionNo}`}
            </button>
          </form>

          <div className="clay p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
              Questions added ({questions?.length ?? 0})
            </h2>
            {questions === null ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
              </div>
            ) : questions.length === 0 ? (
              <p className="text-sm text-foreground/60">No questions added for this subject yet.</p>
            ) : (
              <ul className="space-y-2">
                {questions.map((q) => (
                  <li key={q.id} className="clay-inset px-4 py-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground/50">Q{q.questionNo}</span>
                      <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
                        {q.difficulty}
                      </span>
                      {q.isPYQ && (
                        <span className="rounded-full bg-[var(--sky-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                          PYQ · {q.pyqYear}
                        </span>
                      )}
                    </div>
                    <SmartContent value={q.body} className="text-sm text-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}