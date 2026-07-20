import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, ArrowLeft, MessageSquare, Send, User2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import { VideoPlayer } from "@/components/clay-video-player";
import {
  getLectureSessionForStudent,
  listLectureCommentsForStudent,
  postLectureCommentAsStudent,
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
  studentUid: string;
  studentName: string;
  body: string;
  isOwn: boolean;
  hidden: boolean;
  createdAt: string | null;
};

function LecturePage() {
  const { sessionId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<LectureSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function refreshComments(token: string) {
    const { comments: rows } = await listLectureCommentsForStudent({ data: { token, sessionId } });
    setComments(rows);
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      try {
        const { session: s } = await getLectureSessionForStudent({ data: { token, sessionId } });
        setSession(s);
        await refreshComments(token);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load this lecture.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

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

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <button
          onClick={() => (session ? navigate({ to: "/course/$kind/$id", params: { kind: "mentorship", id: session.batchId } }) : navigate({ to: "/dashboard" }))}
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
          <>
            <div className="clay mb-6 p-3">
              <VideoPlayer src={session.lectureUrl} />
            </div>

            <div className="clay mb-6 p-5 sm:p-6">
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {session.lectureTitle}
              </h1>
              <p className="mt-1 text-sm text-foreground/60">
                {session.batchName}
                {session.mentorName && ` · ${session.mentorName}`}
              </p>
            </div>

            <CommentSection
              sessionId={sessionId}
              comments={comments}
              onRefresh={() => user.getIdToken().then(refreshComments)}
            />
          </>
        )}
      </main>
    </div>
  );
}

function CommentSection({
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
    <div className="clay p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Discussion
        </h2>
      </div>

      <div className="mb-4 max-h-96 space-y-3 overflow-y-auto pr-1">
        {comments === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-foreground/50">No comments yet — ask a question or share a thought.</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={`clay-inset flex gap-3 px-4 py-3 ${c.hidden ? "opacity-50" : ""}`}
            >
              <div className="clay flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <User2 className="h-3.5 w-3.5 text-foreground/40" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-foreground">
                    {c.isOwn ? "You" : c.studentName}
                  </p>
                  <p className="text-[10px] text-foreground/40">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                  </p>
                  {c.hidden && (
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-foreground/50">
                      Hidden by mentor
                    </span>
                  )}
                </div>
                <p className="mt-0.5 break-words text-sm text-foreground/80">{c.body}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question about this lecture…"
          className="clay-inset flex-1 rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="clay-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-70"
          aria-label="Post comment"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>

      {error && (
        <p className="mt-2 rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
          {error}
        </p>
      )}
    </div>
  );
}