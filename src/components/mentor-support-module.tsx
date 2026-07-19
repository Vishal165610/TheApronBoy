import { useEffect, useState, type FormEvent } from "react";
import { Loader2, LifeBuoy, Send, Clock, CheckCircle2, MessageCircle } from "lucide-react";
import type { TicketCategory, MentorSupportTicket } from "@/lib/admin-types";
import { submitMentorTicket, listMyMentorTickets } from "@/server-functions/mentor-portal";

const inputClass =
  "clay-inset w-full rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none";

const textareaClass =
  "clay-inset w-full resize-none rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none";

const CATEGORIES: TicketCategory[] = ["Technical Issue", "Batch/Student Error", "Payout Queries", "General Doubts"];

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

export function MentorSupportModule({ mentorToken }: { mentorToken: string }) {
  const [tickets, setTickets] = useState<MentorSupportTicket[] | null>(null);

  async function refresh() {
    const { tickets: rows } = await listMyMentorTickets({ data: { token: mentorToken } });
    setTickets(rows);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorToken]);

  return (
    <div>
      <ModuleHeader
        title="Internal Operations Help Desk"
        subtitle="Raise an issue with Team Edurack and track its resolution here."
      />

      <TicketForm mentorToken={mentorToken} onSubmitted={refresh} />
      <TicketTimeline tickets={tickets} />
    </div>
  );
}

function TicketForm({ mentorToken, onSubmitted }: { mentorToken: string; onSubmitted: () => void }) {
  const [category, setCategory] = useState<TicketCategory>("Technical Issue");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!message.trim()) return setError("Describe the issue before submitting.");

    setSaving(true);
    try {
      await submitMentorTicket({ data: { token: mentorToken, category, message: message.trim() } });
      setSuccess(true);
      setMessage("");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the ticket. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="clay mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <LifeBuoy className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Raise a ticket
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ClayField label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            className={inputClass + " appearance-none"}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </ClayField>

        <ClayField label="Message">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe the issue in detail — what happened, when, and what you expected instead…"
            className={textareaClass}
          />
        </ClayField>

        {error && (
          <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-2xl bg-[var(--mint-soft)]/60 px-4 py-2 text-xs font-medium text-foreground">
            Ticket submitted. Team Edurack will respond here.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit ticket"}
        </button>
      </form>
    </div>
  );
}

function statusStyles(status: string) {
  switch (status) {
    case "Resolved":
      return "bg-[var(--mint-soft)]/60 text-foreground";
    case "In Progress":
      return "bg-[var(--lemon-soft)]/70 text-foreground";
    default:
      return "bg-foreground/5 text-foreground/60";
  }
}

function statusIcon(status: string) {
  if (status === "Resolved") return <CheckCircle2 className="h-3 w-3" />;
  if (status === "In Progress") return <Clock className="h-3 w-3" />;
  return <MessageCircle className="h-3 w-3" />;
}

function TicketTimeline({ tickets }: { tickets: MentorSupportTicket[] | null }) {
  return (
    <div className="clay p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Send className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Ticket log
        </h2>
      </div>

      {tickets === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
        </div>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-foreground/60">No tickets filed yet.</p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li key={t.id} className="clay-inset px-4 py-3.5">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="clay-chip px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
                  {t.category}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyles(t.status)}`}
                  >
                    {statusIcon(t.status)}
                    {t.status}
                  </span>
                  <span className="text-xs text-foreground/40">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                  </span>
                </div>
              </div>

              <p className="mb-2 text-sm text-foreground">{t.message}</p>

              {t.adminResponse ? (
                <div className="clay mt-2 rounded-2xl px-3.5 py-2.5">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sky-deep)]">
                    Team Edurack response
                    {t.respondedAt && ` · ${new Date(t.respondedAt).toLocaleString()}`}
                  </p>
                  <p className="text-sm text-foreground/80">{t.adminResponse}</p>
                </div>
              ) : (
                <p className="text-xs italic text-foreground/40">Awaiting a response from Team Edurack.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}