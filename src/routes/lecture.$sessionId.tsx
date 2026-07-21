import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  Send,
  User2,
  FileText,
  Star as StarIcon,
  CheckCircle2,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import { VideoPlayer } from "@/components/clay-video-player";
import { ClayStarRating } from "@/components/clay-star-rating";
import {
  getLectureSessionForStudent,
  listLectureCommentsForStudent,
  postLectureCommentAsStudent,
  updateLectureProgress,
  getMyLectureProgress,
  submitSessionReview,
  getMySessionReview,
  listMentorNotesForStudent,
} from "@/server-functions/batch-hub";

export const Route = createFileRoute("/lecture/$sessionId")({
  component: LecturePage,
});

type LectureSession = {
  id: string;
  batchId: string;
  batchName: string;
  mentorName: string | null;
  lectureTitle: string;
  lectureUrl: string;
  scheduledAt: string;
};

type Comment = {
  id: string;
  isMentor: boolean;
  mentorId: string | null;
  studentUid: string | null;
  studentName: string;
  profilePictureUrl: string | null;
  body: string;
  isOwn: boolean;
  hidden: boolean;
  createdAt: string | null;
};

type NoteRow = { id: string; fileName: string; fileUrl: string; watermarkApplied: boolean };

function LecturePage() {
  const { sessionId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<LectureSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [notes, setNotes] = useState<NoteRow[] | null>(null);
  const [initialTime, setInitialTime] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function refreshComments(token: string) {
    const { comments: rows } = await listLectureCommentsForStudent({ data: { token, sessionId } });
    setComments(rows as Comment[]);
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      try {
        const { session: s } = await getLectureSessionForStudent({ data: { token, sessionId } });
        setSession(s);

        const [{ progress }, { notes: n }] = await Promise.all([
          getMyLectureProgress({ data: { token, sessionId } }),
          listMentorNotesForStudent({ data: { token, batchId: s.batchId } }),
        ]);
        if (progress) {
          setInitialTime(progress.watchedSeconds);
          setCompleted(progress.completed);
        }
        setNotes(n);
        await refreshComments(token);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load this lecture.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  async function handleProgress(currentTime: number, duration: number) {
    if (!user) return;
    const token = await user.getIdToken();
    const result = await updateLectureProgress({
      data: { token, sessionId, watchedSeconds: currentTime, durationSeconds: duration },
    });
    if (result.completed) setCompleted(true);
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-60 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--teal-soft)] opacity-60 blur-3xl" />
      </div>

      <AppHeader user={user} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <button
          onClick={() =>
            session
              ? navigate({ to: "/course/$kind/$id", params: { kind: "mentorship", id: session.batchId } })
              : navigate({ to: "/dashboard" })
          }
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/60 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to batch
        </button>

        {loadError ? (
          <div className="clay p-8 text-center text-sm text-foreground/60">{loadError}</div>
        ) : !session ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ── Left: video, meta, notes, rating ─────────────────────── */}
            <div className="space-y-6 lg:col-span-2">
              <div className="clay p-3">
                <VideoPlayer
                  src={session.lectureUrl}
                  initialTime={initialTime}
                  onProgress={handleProgress}
                  onEnded={() => setCompleted(true)}
                />
              </div>

              <div className="clay p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {session.lectureTitle}
                    </h1>
                    <p className="mt-1 text-sm text-foreground/60">
                      {session.batchName}
                      {session.mentorName && ` · ${session.mentorName}`}
                    </p>
                  </div>
                  {completed && (
                    <span className="clay-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--sky-deep)]" />
                      Watched
                    </span>
                  )}
                </div>
              </div>

              {notes && notes.length > 0 && (
                <div className="clay p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-foreground/60" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
                      Notes for this batch
                    </h2>
                  </div>
                  <ul className="space-y-2">
                    {notes.map((n) => (
                      <li key={n.id}>
                        <a
                          href={n.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="clay-inset flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-foreground/5"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-foreground/40" />
                          <span className="truncate text-sm font-medium text-foreground">{n.fileName}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <RatingPanel sessionId={sessionId} batchId={session.batchId} />
            </div>

            {/* ── Right: locked-height discussion panel ─────────────────── */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-20">
                <DiscussionPanel
                  sessionId={sessionId}
                  comments={comments}
                  onRefresh={() => user.getIdToken().then(refreshComments)}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Rating panel ────────────────────────────────────────────────────────────
function RatingPanel({ sessionId, batchId }: { sessionId: string; batchId: string }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const { review } = await getMySessionReview({ data: { token, sessionId } });
      if (review) {
        setRating(review.rating);
        setReviewText(review.reviewText);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleSave() {
    if (!user || rating === 0) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      await submitSessionReview({ data: { token, sessionId, batchId, rating, reviewText } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="clay p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <StarIcon className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Rate this lecture
        </h2>
      </div>
      <ClayStarRating value={rating} onChange={setRating} size="lg" />
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Optional — what worked, what could be clearer…"
        rows={3}
        className="clay-inset mt-3 w-full resize-none rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
      />
      <button
        onClick={handleSave}
        disabled={rating === 0 || saving}
        className="clay-btn mt-3 flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? "Saved!" : "Save rating"}
      </button>
    </div>
  );
}

// ─── Discussion panel — height-locked with its own internal scroll ─────────
// Mentor comments (isMentor: true) are always sorted to the top server-side
// (see listLectureCommentsForStudent) and rendered with a distinct pinned
// style: verified badge, tinted background, and the mentor's name links to
// their full public profile page.
function DiscussionPanel({
  sessionId,
  comments,
  onRefresh,
}: {
  sessionId: string;
  comments: Comment[] | null;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!draft.trim() || !user) return;

    setSending(true);
    try {
      const token = await user.getIdToken();
      await postLectureCommentAsStudent({ data: { token, sessionId, body: draft.trim() } });
      setDraft("");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post your comment. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="clay flex h-[32rem] flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-foreground/10 px-5 py-4">
        <MessageSquare className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Discussion
        </h2>
      </div>

      {/* This is the ONLY scrollable region — the outer container's height
          is fixed (h-[32rem]), so the page itself never grows past the
          player + panels above. */}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
        {comments === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-foreground/50">No comments yet — ask a question or share a thought.</p>
        ) : (
          comments.map((c) =>
            c.isMentor ? (
              <div
                key={c.id}
                className="clay flex gap-2.5 border-2 border-[var(--sky-deep)]/30 bg-[var(--sky-soft)]/30 px-3.5 py-2.5"
              >
                <div className="clay flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  {c.profilePictureUrl ? (
                    <img src={c.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User2 className="h-3 w-3 text-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    {c.mentorId ? (
                      <Link
                        to="/mentor-profile/$mentorId"
                        params={{ mentorId: c.mentorId }}
                        className="text-xs font-bold text-foreground hover:underline"
                      >
                        {c.studentName}
                      </Link>
                    ) : (
                      <p className="text-xs font-bold text-foreground">{c.studentName}</p>
                    )}
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-[var(--sky-deep)] text-white" />
                    <span className="rounded-full bg-[var(--sky-deep)]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--sky-deep)]">
                      Mentor
                    </span>
                    <p className="text-[10px] text-foreground/40">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-foreground/80">{c.body}</p>
                </div>
              </div>
            ) : (
              <div key={c.id} className={`clay-inset flex gap-2.5 px-3.5 py-2.5 ${c.hidden ? "opacity-50" : ""}`}>
                <div className="clay flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                  <User2 className="h-3 w-3 text-foreground/40" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-semibold text-foreground">{c.isOwn ? "You" : c.studentName}</p>
                    <p className="text-[10px] text-foreground/40">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                    </p>
                    {c.hidden && (
                      <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-foreground/50">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-foreground/80">{c.body}</p>
                </div>
              </div>
            ),
          )
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-foreground/10 p-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question…"
            className="clay-inset flex-1 rounded-2xl px-3.5 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="clay-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-70"
            aria-label="Post comment"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </form>
        {error && <p className="mt-2 text-xs font-medium text-[var(--destructive)]">{error}</p>}
      </div>
    </div>
  );
}