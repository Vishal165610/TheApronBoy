import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/lib/auth-context";
import { getTestAnalysis } from "@/server-functions/test-results";
import { SmartContent } from "@/lib/smart-content";

export const Route = createFileRoute("/test-analysis/$testId")({
  component: TestAnalysisPage,
});

type AttemptRow = {
  id: string;
  attemptNumber: number;
  score: number;
  totalMarks: number;
  timeTakenMinutes: number;
  submittedAt: string | null;
};

type SubjectAccuracy = {
  subject: string;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracyPercent: number;
};

type RecurringMistake = {
  questionNo: number;
  subject: string;
  body: string;
  correctOption: "A" | "B" | "C" | "D";
  solution: string;
  wrongCount: number;
  totalSeen: number;
};

function TestAnalysisPage() {
  const { testId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [testName, setTestName] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null);
  const [subjectAccuracy, setSubjectAccuracy] = useState<SubjectAccuracy[]>([]);
  const [recurringMistakes, setRecurringMistakes] = useState<RecurringMistake[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const data = await getTestAnalysis({ data: { token, testId } });
      setTestName(data.testName);
      setAttempts(data.attempts);
      setSubjectAccuracy(data.subjectAccuracy);
      setRecurringMistakes(data.recurringMistakes);
    })();
  }, [user, testId]);

  if (loading || !user || attempts === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="clay max-w-md p-8 text-center">
          <p className="font-display text-lg font-bold text-foreground">No attempts yet</p>
          <p className="mt-2 text-sm text-foreground/60">Take this test at least once to see your analysis here.</p>
        </div>
      </div>
    );
  }

  const chartData = attempts.map((a) => ({
    attempt: `#${a.attemptNumber}`,
    score: a.score,
  }));

  const weakestSubject = [...subjectAccuracy].sort((a, b) => a.accuracyPercent - b.accuracyPercent)[0];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-60 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--teal-soft)] opacity-60 blur-3xl" />
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {testName}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Your performance across {attempts.length} attempt{attempts.length > 1 ? "s" : ""}.
          </p>
        </div>

        {/* Score trend */}
        <div className="clay mb-6 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-foreground/60" />
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Score over attempts</p>
          </div>
          {attempts.length > 1 ? (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="attempt" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--sky-deep)" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-foreground/60">
              Take this test again to start seeing your score trend over time.
            </p>
          )}
        </div>

        {/* Attempt history */}
        <div className="clay mb-6 p-5 sm:p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/50">Attempt history</p>
          <ul className="space-y-2">
            {attempts.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => navigate({ to: "/test-result/$attemptId", params: { attemptId: a.id } })}
                  className="clay-inset flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:brightness-95"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">Attempt {a.attemptNumber}</p>
                    <p className="text-xs text-foreground/50">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : ""} · {a.timeTakenMinutes} min
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {a.score} / {a.totalMarks}
                    </span>
                    <ChevronRight className="h-4 w-4 text-foreground/30" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Subject-wise accuracy */}
        <div className="clay mb-6 p-5 sm:p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Subject-wise accuracy (across all attempts)
          </p>
          <div className="space-y-3">
            {subjectAccuracy.map((s) => (
              <div key={s.subject}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{s.subject}</span>
                  <span className="text-foreground/60">
                    {s.accuracyPercent}% · {s.correct}✓ {s.incorrect}✗ {s.unanswered}–
                  </span>
                </div>
                <div className="clay-inset h-2.5 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.accuracyPercent < 50 ? "bg-[var(--coral-soft)]" : "bg-[var(--sky-deep)]"
                    }`}
                    style={{ width: `${s.accuracyPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {weakestSubject && weakestSubject.accuracyPercent < 60 && (
            <div className="clay-inset mt-4 flex items-start gap-2 rounded-2xl bg-[var(--coral-soft)]/30 px-4 py-3 text-xs text-foreground/70">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <strong>{weakestSubject.subject}</strong> is your weakest area at {weakestSubject.accuracyPercent}%
                accuracy — consider spending extra revision time there.
              </p>
            </div>
          )}
        </div>

        {/* Recurring mistakes */}
        {recurringMistakes.length > 0 && (
          <div className="clay p-5 sm:p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Questions you keep getting wrong
            </p>
            <div className="space-y-3">
              {recurringMistakes.map((q) => (
                <div key={`${q.subject}-${q.questionNo}`} className="clay-inset rounded-2xl p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground/50">
                      Q{q.questionNo} · {q.subject}
                    </span>
                    <span className="rounded-full bg-[var(--coral-soft)]/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
                      Wrong {q.wrongCount} of {q.totalSeen}
                    </span>
                  </div>
                  <SmartContent value={q.body} className="mb-2 text-sm text-foreground" />
                  <div className="clay-inset rounded-xl px-3 py-2 text-xs text-foreground/70">
                    <span className="font-semibold">Correct answer: {q.correctOption}</span>
                    {q.solution && (
                      <div className="mt-1">
                        <SmartContent value={q.solution} className="text-foreground/70" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}