import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Trophy, Clock, CheckCircle2, XCircle, MinusCircle, Medal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getTestAttempt, getLeaderboard } from "@/server-functions/test-results";
import { SmartContent } from "@/lib/smart-content";

export const Route = createFileRoute("/test-result/$attemptId")({
  component: TestResultPage,
});

type OptionKey = "A" | "B" | "C" | "D";

type SubjectBreakdown = { subject: string; correct: number; incorrect: number; unanswered: number; marks: number };

type Attempt = {
  id: string;
  testId: string;
  testName: string;
  attemptNumber: number;
  score: number;
  totalMarks: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeTakenMinutes: number;
  subjectBreakdown: SubjectBreakdown[];
  submittedAt: string | null;
};

type ReviewQuestion = {
  questionNo: number;
  subject: string;
  body: string;
  options: Record<OptionKey, string>;
  solution: string;
  selectedOption: OptionKey | null;
  correctOption: OptionKey;
  isCorrect: boolean;
  marksAwarded: number;
};

type LeaderboardEntry = {
  rank: number;
  uid: string;
  name: string;
  score: number;
  totalMarks: number;
  isYou: boolean;
};

function TestResultPage() {
  const { attemptId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [review, setReview] = useState<ReviewQuestion[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<{
    top: LeaderboardEntry[];
    yourRank: { rank: number; score: number; totalMarks: number } | null;
    totalParticipants: number;
  } | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const { attempt: a, review: r } = await getTestAttempt({ data: { token, attemptId } });
        setAttempt(a);
        setReview(r);
        const lb = await getLeaderboard({ data: { token, testId: a.testId } });
        setLeaderboard(lb);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load this result.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, attemptId]);

  if (loading || !user || (attempt === null && !loadError)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (loadError || !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="clay max-w-md p-8 text-center">
          <p className="font-display text-lg font-bold text-foreground">Can't show this result</p>
          <p className="mt-2 text-sm text-foreground/60">{loadError}</p>
        </div>
      </div>
    );
  }

  const percentage = attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 100) : 0;
  const filteredReview = (review ?? []).filter((q) => subjectFilter === "All" || q.subject === subjectFilter);
  const subjects = ["All", ...attempt.subjectBreakdown.map((s) => s.subject)];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-60 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--teal-soft)] opacity-60 blur-3xl" />
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Hero score card */}
        <div className="clay mb-6 p-6 text-center sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            {attempt.testName}
            {attempt.attemptNumber > 1 && (
              <span className="ml-1.5 rounded-full bg-[var(--sky-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
                Attempt {attempt.attemptNumber}
              </span>
            )}
          </p>
          <p className="font-display mt-2 text-5xl font-bold text-foreground">
            {attempt.score} <span className="text-xl text-foreground/40">/ {attempt.totalMarks}</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--sky-deep)]">{percentage}%</p>

          <div className="mt-6 grid grid-cols-4 gap-3 text-sm">
            <StatBox icon={CheckCircle2} color="text-[var(--mint-soft)]" value={attempt.correctCount} label="Correct" />
            <StatBox icon={XCircle} color="text-[var(--coral-soft)]" value={attempt.incorrectCount} label="Incorrect" />
            <StatBox icon={MinusCircle} color="text-foreground/40" value={attempt.unansweredCount} label="Skipped" />
            <StatBox icon={Clock} color="text-foreground/40" value={attempt.timeTakenMinutes} label="Minutes" />
          </div>
        </div>

        {/* Subject-wise breakdown */}
        <div className="clay mb-6 p-5 sm:p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/50">Subject-wise breakdown</p>
          <div className="space-y-3">
            {attempt.subjectBreakdown.map((s) => {
              const subjectTotal = (s.correct + s.incorrect + s.unanswered) * 4;
              const subjectPct = subjectTotal > 0 ? Math.max(0, Math.round((s.marks / subjectTotal) * 100)) : 0;
              return (
                <div key={s.subject}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{s.subject}</span>
                    <span className="text-foreground/60">
                      {s.marks} marks · {s.correct}✓ {s.incorrect}✗ {s.unanswered}–
                    </span>
                  </div>
                  <div className="clay-inset h-2.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-[var(--sky-deep)] transition-all"
                      style={{ width: `${subjectPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard && (
          <div className="clay mb-6 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-foreground/60" />
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                Leaderboard · {leaderboard.totalParticipants} participants
              </p>
            </div>

            {leaderboard.yourRank && leaderboard.yourRank.rank > 20 && (
              <div className="clay-inset mb-3 flex items-center justify-between rounded-2xl px-4 py-2.5">
                <span className="text-sm font-semibold text-foreground">Your rank: #{leaderboard.yourRank.rank}</span>
                <span className="text-sm text-foreground/60">
                  {leaderboard.yourRank.score} / {leaderboard.yourRank.totalMarks}
                </span>
              </div>
            )}

            <ul className="space-y-1.5">
              {leaderboard.top.map((entry) => (
                <li
                  key={entry.uid}
                  className={`flex items-center justify-between rounded-2xl px-4 py-2.5 ${
                    entry.isYou ? "clay-inset ring-2 ring-[var(--sky-deep)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        entry.rank === 1
                          ? "bg-[var(--sky-deep)] text-white"
                          : entry.rank <= 3
                            ? "bg-[var(--sky-soft)] text-foreground"
                            : "bg-foreground/10 text-foreground/60"
                      }`}
                    >
                      {entry.rank <= 3 ? <Medal className="h-3.5 w-3.5" /> : entry.rank}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {entry.name}
                      {entry.isYou && <span className="ml-1.5 text-xs text-foreground/40">(You)</span>}
                    </span>
                  </div>
                  <span className="text-sm text-foreground/60">
                    {entry.score} / {entry.totalMarks}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Question-by-question review */}
        <div className="clay p-5 sm:p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/50">Question review</p>

          <div className="mb-4 flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSubjectFilter(s)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  subjectFilter === s ? "clay-btn text-white" : "clay-chip text-foreground/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredReview.map((q) => (
              <div key={`${q.subject}-${q.questionNo}`} className="clay-inset rounded-2xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground/50">
                    Q{q.questionNo} · {q.subject}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      q.isCorrect
                        ? "bg-[var(--mint-soft)] text-foreground"
                        : q.selectedOption
                          ? "bg-[var(--coral-soft)] text-foreground"
                          : "bg-foreground/10 text-foreground/50"
                    }`}
                  >
                    {q.isCorrect ? "Correct" : q.selectedOption ? "Incorrect" : "Skipped"} · {q.marksAwarded > 0 ? "+" : ""}
                    {q.marksAwarded}
                  </span>
                </div>

                <SmartContent value={q.body} className="mb-3 text-sm text-foreground" />

                <div className="space-y-1.5">
                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const isSelected = q.selectedOption === opt;
                    const isCorrectOpt = q.correctOption === opt;
                    return (
                      <div
                        key={opt}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                          isCorrectOpt
                            ? "bg-[var(--mint-soft)]/50"
                            : isSelected
                              ? "bg-[var(--coral-soft)]/50"
                              : "bg-transparent"
                        }`}
                      >
                        <span className="font-semibold text-foreground/50">({opt})</span>
                        <SmartContent value={q.options[opt]} className="text-foreground" />
                        {isCorrectOpt && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-[var(--mint-soft)]" />}
                        {isSelected && !isCorrectOpt && <XCircle className="ml-auto h-4 w-4 shrink-0 text-[var(--coral-soft)]" />}
                      </div>
                    );
                  })}
                </div>

                {q.solution && (
                  <div className="clay-inset mt-3 rounded-xl px-4 py-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-foreground/40">Solution</p>
                    <SmartContent value={q.solution} className="text-sm text-foreground/80" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="clay-btn mt-6 w-full rounded-full px-6 py-3 text-sm font-semibold"
        >
          Back to dashboard
        </button>
      </main>
    </div>
  );
}

function StatBox({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: typeof CheckCircle2;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div className="clay-inset rounded-2xl px-3 py-3">
      <Icon className={`mx-auto mb-1 h-4 w-4 ${color}`} />
      <p className="font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-foreground/50">{label}</p>
    </div>
  );
}