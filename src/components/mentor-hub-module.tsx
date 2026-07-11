import { useEffect, useState, type FormEvent } from "react";
import { Loader2, UserPlus, Users2, Layers3, Pencil, X, Plus } from "lucide-react";
import type { Mentor, MentorshipBatch, Track } from "@/lib/admin-types";
import {
  createMentor,
  listMentors,
  updateMentorProfile,
  createMentorshipBatch,
  listMentorshipBatches,
  updateMentorshipBatch,
} from "@/server-functions/admin";

type AdminUser = { getIdToken: () => Promise<string> };

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

export function MentorHubModule({ adminUser }: { adminUser: AdminUser }) {
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [batches, setBatches] = useState<MentorshipBatch[] | null>(null);

  async function refreshMentors() {
    const token = await adminUser.getIdToken();
    const { mentors: rows } = await listMentors({ data: { token } });
    setMentors(rows as Mentor[]);
  }

  async function refreshBatches() {
    const token = await adminUser.getIdToken();
    const { batches: rows } = await listMentorshipBatches({ data: { token } });
    setBatches(rows as MentorshipBatch[]);
  }

  useEffect(() => {
    refreshMentors();
    refreshBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser]);

  return (
    <div>
      <ModuleHeader
        title="Mentor Allocation & Schedule Hub"
        subtitle="Onboard mentors, edit their profiles, and build mentorship batches."
      />

      <MentorOnboardingForm adminUser={adminUser} onCreated={refreshMentors} />
      <MentorList mentors={mentors} adminUser={adminUser} onSaved={refreshMentors} />
      <MentorshipBatchCreator mentors={mentors} adminUser={adminUser} onCreated={refreshBatches} />
      <MentorshipBatchList batches={batches} mentors={mentors} adminUser={adminUser} onSaved={refreshBatches} />
    </div>
  );
}

function MentorOnboardingForm({
  adminUser,
  onCreated,
}: {
  adminUser: AdminUser;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!username.trim()) return setError("Enter a username.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!secretCode.trim()) return setError("Enter a personal secret code for this mentor.");
    if (!name.trim()) return setError("Enter the mentor's name.");

    setSaving(true);
    try {
      const token = await adminUser.getIdToken();
      await createMentor({
        data: {
          token,
          mentor: { username: username.trim(), password, secretCode: secretCode.trim(), name: name.trim() },
        },
      });
      setSuccess(true);
      setUsername("");
      setPassword("");
      setSecretCode("");
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not onboard this mentor. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="clay mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Onboard a mentor
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ClayField label="Mentor name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
          </ClayField>
          <ClayField label="Username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="login username"
              className={inputClass}
            />
          </ClayField>
          <ClayField label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 8 characters"
              className={inputClass}
            />
          </ClayField>
          <ClayField label="Personal secret code">
            <input
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="e.g. MNT-2027-045"
              className={inputClass}
            />
          </ClayField>
        </div>

        <p className="text-xs text-foreground/40">
          The password is hashed before it's stored — it's never saved or displayed in plain text,
          even here in the admin panel.
        </p>

        {error && (
          <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-2xl bg-[var(--mint-soft)]/60 px-4 py-2 text-xs font-medium text-foreground">
            Mentor onboarded.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Onboard mentor"}
        </button>
      </form>
    </div>
  );
}

function MentorList({
  mentors,
  adminUser,
  onSaved,
}: {
  mentors: Mentor[] | null;
  adminUser: AdminUser;
  onSaved: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [trackingIndex, setTrackingIndex] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(m: Mentor) {
    setEditingId(m.id);
    setName(m.name);
    setProfilePictureUrl(m.profilePictureUrl ?? "");
    setTrackingIndex(m.trackingIndex ?? "");
  }

  async function save(id: string) {
    setSaving(true);
    try {
      const token = await adminUser.getIdToken();
      await updateMentorProfile({
        data: {
          token,
          id,
          profile: { name, profilePictureUrl: profilePictureUrl.trim() || null, trackingIndex },
        },
      });
      setEditingId(null);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="clay mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Users2 className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Mentor directory
        </h2>
      </div>

      {mentors === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
        </div>
      ) : mentors.length === 0 ? (
        <p className="text-sm text-foreground/60">No mentors onboarded yet.</p>
      ) : (
        <ul className="space-y-2">
          {mentors.map((m) => (
            <li key={m.id} className="clay-inset px-4 py-3">
              {editingId === m.id ? (
                <div className="space-y-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={inputClass} />
                  <input
                    value={profilePictureUrl}
                    onChange={(e) => setProfilePictureUrl(e.target.value)}
                    placeholder="Profile picture URL"
                    className={inputClass}
                  />
                  <input
                    value={trackingIndex}
                    onChange={(e) => setTrackingIndex(e.target.value)}
                    placeholder="Tracking index (e.g. performance ref)"
                    className={inputClass}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => save(m.id)}
                      disabled={saving}
                      className="clay-btn rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-70"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs font-semibold text-foreground/50 hover:text-foreground/70"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="clay-inset flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
                      {m.profilePictureUrl ? (
                        <img src={m.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-foreground/50">
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.name}</p>
                      <p className="text-xs text-foreground/50">
                        @{m.username} {m.trackingIndex && `· ${m.trackingIndex}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(m)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sky-deep)] hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MentorshipBatchCreator({
  mentors,
  adminUser,
  onCreated,
}: {
  mentors: Mentor[] | null;
  adminUser: AdminUser;
  onCreated: () => void;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [name, setName] = useState("");
  const [highlights, setHighlights] = useState<string[]>(["", ""]);
  const [track, setTrack] = useState<Track>("Dropper");
  const [sellingPrice, setSellingPrice] = useState("");
  const [crossedPrice, setCrossedPrice] = useState("");
  const [assignedMentorId, setAssignedMentorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateHighlight(i: number, value: string) {
    const next = [...highlights];
    next[i] = value;
    setHighlights(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim()) return setError("Enter a batch name.");
    const cleanHighlights = highlights.map((h) => h.trim()).filter(Boolean);
    if (cleanHighlights.length < 2) return setError("Add at least 2 core highlights.");
    const selling = Number(sellingPrice);
    const crossed = Number(crossedPrice);
    if (!selling || selling <= 0) return setError("Enter a valid selling price.");
    if (!crossed || crossed <= selling) return setError("Crossed price must be higher than the selling price.");

    setSaving(true);
    try {
      const token = await adminUser.getIdToken();
      await createMentorshipBatch({
        data: {
          token,
          batch: {
            thumbnailUrl: thumbnailUrl.trim() || null,
            name: name.trim(),
            highlights: cleanHighlights,
            track,
            sellingPrice: selling,
            crossedPrice: crossed,
            assignedMentorId: assignedMentorId || null,
          },
        },
      });
      setSuccess(true);
      setThumbnailUrl("");
      setName("");
      setHighlights(["", ""]);
      setSellingPrice("");
      setCrossedPrice("");
      setAssignedMentorId("");
      onCreated();
    } catch {
      setError("Could not create the batch. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="clay mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Layers3 className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Create mentorship batch
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ClayField label="Batch thumbnail URL">
          <input
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://…/thumbnail.jpg"
            className={inputClass}
          />
        </ClayField>

        <ClayField label="Batch name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dropper 1:1 Mentorship — 2027"
            className={inputClass}
          />
        </ClayField>

        <ClayField label="Core highlights (2-3)">
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={h}
                  onChange={(e) => updateHighlight(i, e.target.value)}
                  placeholder={`Highlight ${i + 1}`}
                  className={inputClass}
                />
                {highlights.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setHighlights(highlights.filter((_, idx) => idx !== i))}
                    className="text-foreground/40 hover:text-foreground/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {highlights.length < 3 && (
              <button
                type="button"
                onClick={() => setHighlights([...highlights, ""])}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sky-deep)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add highlight
              </button>
            )}
          </div>
        </ClayField>

        <ClayField label="Target audience">
          <div className="grid grid-cols-3 gap-2">
            {(["11th", "12th", "Dropper"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrack(t)}
                className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  track === t ? "clay-btn text-white" : "clay-btn-ghost text-foreground/70"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </ClayField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ClayField label="Selling price (₹)">
            <input
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              inputMode="numeric"
              placeholder="4999"
              className={inputClass}
            />
          </ClayField>
          <ClayField label="Dummy crossed price (₹)">
            <input
              value={crossedPrice}
              onChange={(e) => setCrossedPrice(e.target.value)}
              inputMode="numeric"
              placeholder="7999"
              className={inputClass}
            />
          </ClayField>
        </div>

        <ClayField label="Assign to mentor">
          <select
            value={assignedMentorId}
            onChange={(e) => setAssignedMentorId(e.target.value)}
            className={inputClass + " appearance-none"}
          >
            <option value="">Unassigned</option>
            {(mentors ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </ClayField>

        {error && (
          <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-2xl bg-[var(--mint-soft)]/60 px-4 py-2 text-xs font-medium text-foreground">
            Batch created.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create batch"}
        </button>
      </form>
    </div>
  );
}

function MentorshipBatchList({
  batches,
  mentors,
  adminUser,
  onSaved,
}: {
  batches: MentorshipBatch[] | null;
  mentors: Mentor[] | null;
  adminUser: AdminUser;
  onSaved: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [crossedPrice, setCrossedPrice] = useState("");
  const [assignedMentorId, setAssignedMentorId] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(b: MentorshipBatch) {
    setEditingId(b.id);
    setName(b.name);
    setSellingPrice(String(b.sellingPrice));
    setCrossedPrice(String(b.crossedPrice));
    setAssignedMentorId(b.assignedMentorId ?? "");
  }

  async function save(id: string) {
    setSaving(true);
    try {
      const token = await adminUser.getIdToken();
      await updateMentorshipBatch({
        data: {
          token,
          id,
          batch: {
            name,
            sellingPrice: Number(sellingPrice),
            crossedPrice: Number(crossedPrice),
            assignedMentorId: assignedMentorId || null,
          },
        },
      });
      setEditingId(null);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function mentorName(id: string | null) {
    if (!id) return "Unassigned";
    return mentors?.find((m) => m.id === id)?.name ?? "Unknown mentor";
  }

  return (
    <div className="clay p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Layers3 className="h-4 w-4 text-foreground/60" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Mentorship batches
        </h2>
      </div>

      {batches === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
        </div>
      ) : batches.length === 0 ? (
        <p className="text-sm text-foreground/60">No mentorship batches created yet.</p>
      ) : (
        <ul className="space-y-2">
          {batches.map((b) => (
            <li key={b.id} className="clay-inset px-4 py-3">
              {editingId === b.id ? (
                <div className="space-y-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      inputMode="numeric"
                      className={inputClass}
                    />
                    <input
                      value={crossedPrice}
                      onChange={(e) => setCrossedPrice(e.target.value)}
                      inputMode="numeric"
                      className={inputClass}
                    />
                  </div>
                  <select
                    value={assignedMentorId}
                    onChange={(e) => setAssignedMentorId(e.target.value)}
                    className={inputClass + " appearance-none"}
                  >
                    <option value="">Unassigned</option>
                    {(mentors ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => save(b.id)}
                      disabled={saving}
                      className="clay-btn rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-70"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs font-semibold text-foreground/50 hover:text-foreground/70"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{b.name}</p>
                    <p className="text-xs text-foreground/50">
                      {b.track} · ₹{b.sellingPrice}{" "}
                      <span className="line-through opacity-60">₹{b.crossedPrice}</span> ·{" "}
                      {mentorName(b.assignedMentorId)}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(b)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sky-deep)] hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}