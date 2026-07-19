import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Megaphone, Mail, MailCheck, MailWarning, Users2 } from "lucide-react";
import type { MentorAnnouncement } from "@/lib/admin-types";
import {
  postMentorAnnouncement,
  listMentorAnnouncements,
  listMyAssignedBatches,
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

export function MentorAnnouncementModule({ mentorToken }: { mentorToken: string }) {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [announcements, setAnnouncements] = useState<MentorAnnouncement[] | null>(null);

  useEffect(() => {
    (async () => {
      const { batches: rows } = await listMyAssignedBatches({ data: { token: mentorToken } });
      setBatches(rows);
      if (rows.length > 0) setSelectedBatchId(rows[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorToken]);

  async function refreshAnnouncements(batchId: string) {
    if (!batchId) return;
    const { announcements: rows } = await listMentorAnnouncements({
      data: { token: mentorToken, batchId },
    });
    setAnnouncements(rows);
  }

  useEffect(() => {
    if (selectedBatchId) refreshAnnouncements(selectedBatchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId]);

  return (
    <div>
      <ModuleHeader
        title="Targeted Batch Announcement Engine"
        subtitle="Broadcast a message to your allocated mentorship batch, with an optional email trigger."
      />

      {batches === null ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
        </div>
      ) : batches.length === 0 ? (
        <div className="clay p-6 text-center text-sm text-foreground/60">
          No mentorship batches are assigned to you yet. Once an admin assigns you a batch, it will
          appear here.
        </div>
      ) : (
        <>
          <div className="mb-6">
            <ClayField label="Target batch">
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className={inputClass + " appearance-none"}
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.track}
                  </option>
                ))}
              </select>
            </ClayField>
          </div>

          <BroadcastPanel
            mentorToken={mentorToken}
            batchId={selectedBatchId}
            onPosted={() => refreshAnnouncements(selectedBatchId)}
          />

          <AnnouncementLog announcements={announcements} />
        </>
      )}
    </div>
  );
}

function BroadcastPanel({
  mentorToken,
  batchId,
  onPosted,
}: {
  mentorToken: string;
  batchId: string;
  onPosted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [triggerEmail, setTriggerEmail] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ emailStatus: string; recipientCount: number } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLastResult(null);

    if (!title.trim()) return setError("Give this announcement a title.");
    if (!message.trim()) return setError("Write the announcement message.");
    if (!batchId) return setError("Select a batch first.");

    setPosting(true);
    try {
      const result = await postMentorAnnouncement({
        data: { token: mentorToken, announcement: { batchId, title, message, triggerEmail } },
      });
      setLastResult({ emailStatus: result.emailStatus, recipientCount: result.recipientCount });
      setTitle("");
      setMessage("");
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the announcement. Try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="clay mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Draft a broadcast
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ClayField label="Announcement title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Revised schedule for next week's sessions"
            className={inputClass}
          />
        </ClayField>

        <ClayField label="Message body">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Write the full announcement…"
            className="clay-inset w-full resize-none rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
        </ClayField>

        <label className="clay-inset flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3">
          <input
            type="checkbox"
            checked={triggerEmail}
            onChange={(e) => setTriggerEmail(e.target.checked)}
            className="h-4 w-4 accent-[var(--sky-deep)]"
          />
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Mail className="h-4 w-4 text-foreground/50" />
            Also email every student onboarded in this batch
          </div>
        </label>

        {error && (
          <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
            {error}
          </p>
        )}

        {lastResult && (
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-medium text-foreground ${
              lastResult.emailStatus === "sent"
                ? "bg-[var(--mint-soft)]/60"
                : lastResult.emailStatus === "failed"
                  ? "bg-[var(--coral-soft)]/50"
                  : "bg-foreground/5"
            }`}
          >
            {lastResult.emailStatus === "sent" ? (
              <MailCheck className="h-4 w-4" />
            ) : lastResult.emailStatus === "failed" ? (
              <MailWarning className="h-4 w-4" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
            Posted to feed for {lastResult.recipientCount} student
            {lastResult.recipientCount === 1 ? "" : "s"}.
            {lastResult.emailStatus === "sent" && " Email broadcast sent."}
            {lastResult.emailStatus === "failed" && " Email broadcast could not be sent."}
          </div>
        )}

        <button
          type="submit"
          disabled={posting}
          className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post announcement"}
        </button>
      </form>
    </div>
  );
}

function AnnouncementLog({ announcements }: { announcements: MentorAnnouncement[] | null }) {
  return (
    <div className="clay p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Users2 className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Announcement history for this batch
        </h2>
      </div>

      {announcements === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-foreground/60">Nothing posted to this batch yet.</p>
      ) : (
        <ul className="space-y-2">
          {announcements.map((a) => (
            <li key={a.id} className="clay-inset px-4 py-3.5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <span className="text-xs text-foreground/40">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                </span>
              </div>
              <p className="mb-2 text-sm text-foreground/70">{a.message}</p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
                <span className="rounded-full bg-foreground/5 px-2.5 py-1 text-foreground/50">
                  {a.recipientCount ?? 0} recipient{a.recipientCount === 1 ? "" : "s"}
                </span>
                {a.emailTriggered && (
                  <span
                    className={`rounded-full px-2.5 py-1 ${
                      a.emailStatus === "sent"
                        ? "bg-[var(--mint-soft)]/60 text-foreground"
                        : a.emailStatus === "failed"
                          ? "bg-[var(--coral-soft)]/50 text-foreground"
                          : "bg-foreground/5 text-foreground/50"
                    }`}
                  >
                    Email {a.emailStatus}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}