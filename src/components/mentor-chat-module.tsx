import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Loader2,
  MessageSquare,
  Send,
  Lock,
  Unlock,
  FileUp,
  ShieldCheck,
  FileText,
  Clock,
  Plus,
  X,
} from "lucide-react";
import {
  listMyAssignedBatches,
  listChatThreads,
  listChatMessages,
  sendChatMessage,
  getChatLockWindow,
  setChatLockWindow,
  uploadMentorNote,
  listMentorNotes,
  listBatchStudents,
} from "@/server-functions/mentor-portal";

const inputClass =
  "clay-inset w-full rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none";

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

function ModuleHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-foreground/60">{subtitle}</p>
    </div>
  );
}

type Batch = { id: string; name: string; track: string };
type Thread = {
  studentUid: string;
  studentName: string;
  lastMessage: string;
  lastMessageAt: string | null;
  lastSender: "mentor" | "student";
};
type ChatMessage = { id: string; sender: "mentor" | "student"; body: string; createdAt: string | null };
type Student = { uid: string; fullName: string; email: string | null };

export function MentorChatModule({ mentorToken }: { mentorToken: string }) {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [batchId, setBatchId] = useState("");

  useEffect(() => {
    (async () => {
      const { batches: rows } = await listMyAssignedBatches({ data: { token: mentorToken } });
      setBatches(rows);
      if (rows.length > 0) setBatchId(rows[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorToken]);

  return (
    <div>
      <ModuleHeader
        title="Student Chat Desk"
        subtitle="Split-pane DM canvas with a lockable daily messaging window, plus watermark-gated note uploads."
      />

      {batches === null ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
        </div>
      ) : batches.length === 0 ? (
        <div className="clay p-6 text-center text-sm text-foreground/60">
          No mentorship batches are assigned to you yet.
        </div>
      ) : (
        <>
          <div className="mb-6">
            <ClayField label="Batch">
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputClass + " appearance-none"}>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.track}
                  </option>
                ))}
              </select>
            </ClayField>
          </div>

          {batchId && (
            <>
              <ChatLockControl mentorToken={mentorToken} batchId={batchId} />
              <ChatCanvas mentorToken={mentorToken} batchId={batchId} />
              <NoteUploadGate mentorToken={mentorToken} batchId={batchId} />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Interval lock/unlock control ───────────────────────────────────────────
function ChatLockControl({ mentorToken, batchId }: { mentorToken: string; batchId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [openFrom, setOpenFrom] = useState("09:00");
  const [openUntil, setOpenUntil] = useState("18:00");
  const [isLockedNow, setIsLockedNow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const { window: w, isLockedNow: locked } = await getChatLockWindow({ data: { token: mentorToken, batchId } });
    setEnabled(Boolean(w));
    if (w) {
      setOpenFrom(w.openFrom);
      setOpenUntil(w.openUntil);
    }
    setIsLockedNow(locked);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  async function toggle() {
    setSaving(true);
    try {
      await setChatLockWindow({
        data: { token: mentorToken, batchId, enabled: !enabled, openFrom, openUntil },
      });
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveWindow() {
    setSaving(true);
    try {
      await setChatLockWindow({ data: { token: mentorToken, batchId, enabled: true, openFrom, openUntil } });
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="clay mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          <Clock className="h-4 w-4" /> Daily messaging window
        </h2>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all disabled:opacity-70 ${
            enabled ? "clay-btn text-white" : "clay-btn-ghost text-foreground/70"
          }`}
        >
          {enabled ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          {enabled ? "Window active" : "No restriction"}
        </button>
      </div>

      {enabled && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <ClayField label="Open from">
            <input type="time" value={openFrom} onChange={(e) => setOpenFrom(e.target.value)} className={inputClass} />
          </ClayField>
          <ClayField label="Open until">
            <input type="time" value={openUntil} onChange={(e) => setOpenUntil(e.target.value)} className={inputClass} />
          </ClayField>
          <button
            onClick={saveWindow}
            disabled={saving}
            className="clay-btn-ghost rounded-full px-4 py-2.5 text-xs font-semibold text-foreground/70 disabled:opacity-70"
          >
            Save window
          </button>
        </div>
      )}

      {enabled && (
        <p
          className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${
            isLockedNow ? "text-[var(--destructive)]" : "text-foreground/50"
          }`}
        >
          {isLockedNow ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          {isLockedNow
            ? "Messaging is currently locked outside your open window."
            : `Messaging is open now (${openFrom}–${openUntil} daily).`}
        </p>
      )}
    </div>
  );
}

// ─── Split-pane chat canvas ──────────────────────────────────────────────────
function ChatCanvas({ mentorToken, batchId }: { mentorToken: string; batchId: string }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [activeStudentUid, setActiveStudentUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refreshThreads() {
    const { threads: rows } = await listChatThreads({ data: { token: mentorToken, batchId } });
    setThreads(rows);
  }

  async function refreshMessages(studentUid: string) {
    const { messages: rows } = await listChatMessages({ data: { token: mentorToken, batchId, studentUid } });
    setMessages(rows);
  }

  useEffect(() => {
    setActiveStudentUid(null);
    setMessages(null);
    refreshThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  useEffect(() => {
    if (activeStudentUid) refreshMessages(activeStudentUid);
    else setMessages(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!draft.trim() || !activeStudentUid) return;

    setSending(true);
    try {
      await sendChatMessage({ data: { token: mentorToken, batchId, studentUid: activeStudentUid, body: draft } });
      setDraft("");
      await refreshMessages(activeStudentUid);
      await refreshThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Try again.");
    } finally {
      setSending(false);
    }
  }

  function handleThreadStarted(studentUid: string) {
    setShowNewMessage(false);
    refreshThreads();
    setActiveStudentUid(studentUid);
  }

  const activeThread = threads?.find((t) => t.studentUid === activeStudentUid);

  return (
    <div className="clay mb-6 grid grid-cols-1 overflow-hidden sm:grid-cols-[220px_1fr]">
      {/* ── Thread list (left pane) ─────────────────────────────────── */}
      <div className="border-b border-foreground/10 sm:border-b-0 sm:border-r">
        <div className="flex items-center justify-between gap-2 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-foreground/60" />
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Threads</span>
          </div>
          <button
            onClick={() => setShowNewMessage(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
            aria-label="Start a new conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {threads === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />
          </div>
        ) : threads.length === 0 ? (
          <div className="px-4 pb-4">
            <p className="mb-2 text-xs text-foreground/50">No conversations yet.</p>
            <button
              onClick={() => setShowNewMessage(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sky-deep)] hover:underline"
            >
              <Plus className="h-3 w-3" /> Start a conversation
            </button>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto pb-2 sm:max-h-[26rem]">
            {threads.map((t) => (
              <li key={t.studentUid}>
                <button
                  onClick={() => setActiveStudentUid(t.studentUid)}
                  className={`w-full px-4 py-2.5 text-left transition-colors ${
                    activeStudentUid === t.studentUid ? "bg-[var(--sky-soft)]/50" : "hover:bg-foreground/5"
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-foreground">{t.studentName}</p>
                  <p className="truncate text-xs text-foreground/50">
                    {t.lastSender === "mentor" ? "You: " : ""}
                    {t.lastMessage}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── DM interface (right pane) ────────────────────────────────── */}
      <div className="flex min-h-[24rem] flex-col">
        <div className="border-b border-foreground/10 px-4 py-3.5">
          <p className="text-sm font-semibold text-foreground">
            {activeThread?.studentName ?? "Select a thread, or start a new one"}
          </p>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {!activeStudentUid ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-foreground/40">
              <MessageSquare className="h-8 w-8" strokeWidth={1.5} />
              <p className="text-xs">Pick a conversation on the left, or tap + to message a student.</p>
            </div>
          ) : messages === null ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-foreground/50">No messages yet — say hello.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "mentor" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.sender === "mentor" ? "clay-btn text-white" : "clay-inset text-foreground"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {activeStudentUid && (
          <form onSubmit={handleSend} className="border-t border-foreground/10 p-3">
            {error && (
              <p className="mb-2 rounded-2xl bg-[var(--coral-soft)]/50 px-3 py-1.5 text-xs font-medium text-foreground">
                {error}
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className={inputClass + " flex-1"}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="clay-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-70"
                aria-label="Send"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}
      </div>

      {showNewMessage && (
        <NewMessageModal
          mentorToken={mentorToken}
          batchId={batchId}
          existingThreadUids={(threads ?? []).map((t) => t.studentUid)}
          onClose={() => setShowNewMessage(false)}
          onSent={handleThreadStarted}
        />
      )}
    </div>
  );
}

// ─── New message modal — the missing "first message" entry point ──────────
function NewMessageModal({
  mentorToken,
  batchId,
  existingThreadUids,
  onClose,
  onSent,
}: {
  mentorToken: string;
  batchId: string;
  existingThreadUids: string[];
  onClose: () => void;
  onSent: (studentUid: string) => void;
}) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentUid, setStudentUid] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { students: rows } = await listBatchStudents({ data: { token: mentorToken, batchId } });
      setStudents(rows);
      if (rows.length > 0) setStudentUid(rows[0].uid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentUid) return setError("Select a student.");
    if (!message.trim()) return setError("Write a message first.");

    setSending(true);
    try {
      await sendChatMessage({ data: { token: mentorToken, batchId, studentUid, body: message } });
      onSent(studentUid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="clay w-full max-w-md p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">New message</h3>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground/70">
            <X className="h-4 w-4" />
          </button>
        </div>

        {students === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-foreground/60">No students have purchased this batch yet.</p>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <ClayField label="Student">
              <select value={studentUid} onChange={(e) => setStudentUid(e.target.value)} className={inputClass + " appearance-none"}>
                {students.map((s) => (
                  <option key={s.uid} value={s.uid}>
                    {s.fullName}
                    {existingThreadUids.includes(s.uid) ? " (existing thread)" : ""}
                  </option>
                ))}
              </select>
            </ClayField>

            <ClayField label="Message">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Type your first message…"
                className="clay-inset w-full resize-none rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
              />
            </ClayField>

            {error && (
              <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="clay-btn flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Anti-Piracy Document Gate ──────────────────────────────────────────────
function NoteUploadGate({ mentorToken, batchId }: { mentorToken: string; batchId: string }) {
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState<
    { id: string; fileName: string; fileUrl: string; watermarkApplied: boolean; createdAt: string | null }[] | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { notes: rows } = await listMentorNotes({ data: { token: mentorToken, batchId } });
    setNotes(rows);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fileName.trim() || !fileUrl.trim()) return setError("Provide the uploaded PDF's name and URL.");
    if (!acknowledged) return setError("You must check the copyright safety toggle before uploading.");
    if (!fileUrl.toLowerCase().endsWith(".pdf")) return setError("Only .pdf files are accepted here.");

    setSaving(true);
    try {
      await uploadMentorNote({
        data: { token: mentorToken, batchId, fileName: fileName.trim(), fileUrl: fileUrl.trim(), copyrightAcknowledged: acknowledged },
      });
      setFileName("");
      setFileUrl("");
      setAcknowledged(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="clay p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <FileUp className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Upload notes — watermark compliance gate
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ClayField label="File name">
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Organic Chemistry Notes — Unit 4.pdf"
              className={inputClass}
            />
          </ClayField>
          <ClayField label="Uploaded PDF URL">
            <input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://…/notes.pdf"
              className={inputClass}
            />
          </ClayField>
        </div>

        <label className="clay-inset flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--sky-deep)]"
          />
          <div className="flex items-start gap-2 text-sm text-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" />
            <span>
              I confirm this document is copyright-safe to share, and understand the system will
              automatically append a diagonal "Edurack" background watermark across every page
              before it reaches students.
            </span>
          </div>
        </label>

        {error && (
          <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !acknowledged}
          className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload note"}
        </button>
      </form>

      <div className="mt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Uploaded notes for this batch
        </h3>
        {notes === null ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-foreground/50">No notes uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="clay-inset flex items-center justify-between gap-3 px-4 py-2.5">
                <a href={n.fileUrl} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-foreground/40" />
                  <span className="truncate text-sm text-foreground">{n.fileName}</span>
                </a>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    n.watermarkApplied ? "bg-[var(--mint-soft)]/60 text-foreground" : "bg-foreground/5 text-foreground/50"
                  }`}
                >
                  {n.watermarkApplied ? "Watermarked" : "Pending watermark"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}