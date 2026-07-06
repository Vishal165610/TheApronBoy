import { useEffect, useState, type FormEvent } from "react";
import {
  Loader2,
  Plus,
  X,
  Package,
  Megaphone,
  Calendar,
  ImageIcon,
  Pencil,
} from "lucide-react";
import type { Track, TestSeriesBundle } from "@/lib/admin-types";
import {
  createBundle,
  listBundles,
  updateBundle,
  postBundleAnnouncement,
  listBundleAnnouncements,
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

function ClayField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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

// ─── Module 1: Bundle Creation Form ──────────────────────────────────────────
export function BundleCreationModule({
  adminUser,
  onCreated,
}: {
  adminUser: AdminUser;
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState<Track>("Dropper");
  const [features, setFeatures] = useState<string[]>(["", ""]);
  const [sellingPrice, setSellingPrice] = useState("");
  const [crossedPrice, setCrossedPrice] = useState("");
  const [uploadWindowStart, setUploadWindowStart] = useState("");
  const [uploadWindowEnd, setUploadWindowEnd] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [syllabusPdfUrls, setSyllabusPdfUrls] = useState<string[]>([""]);
  const [plannerUrls, setPlannerUrls] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateListItem(list: string[], setList: (v: string[]) => void, i: number, value: string) {
    const next = [...list];
    next[i] = value;
    setList(next);
  }

  function addListItem(list: string[], setList: (v: string[]) => void, max: number) {
    if (list.length >= max) return;
    setList([...list, ""]);
  }

  function removeListItem(list: string[], setList: (v: string[]) => void, i: number) {
    setList(list.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim()) return setError("Enter a bundle title.");
    const cleanFeatures = features.map((f) => f.trim()).filter(Boolean);
    if (cleanFeatures.length < 2) return setError("Add at least 2 marketing feature pointers.");
    const selling = Number(sellingPrice);
    const crossed = Number(crossedPrice);
    if (!selling || selling <= 0) return setError("Enter a valid selling price.");
    if (!crossed || crossed <= selling) return setError("Crossed price must be higher than the selling price.");
    if (!uploadWindowStart || !uploadWindowEnd) return setError("Set the upload duration window.");
    if (!expiryDate) return setError("Set the access expiry date.");

    setSaving(true);
    try {
      const token = await adminUser.getIdToken();
      await createBundle({
        data: {
          token,
          bundle: {
            title: title.trim(),
            track,
            features: cleanFeatures,
            sellingPrice: selling,
            crossedPrice: crossed,
            uploadWindowStart,
            uploadWindowEnd,
            expiryDate,
            thumbnailUrl: thumbnailUrl.trim() || null,
            syllabusPdfUrls: syllabusPdfUrls.map((u) => u.trim()).filter(Boolean),
            plannerUrls: plannerUrls.map((u) => u.trim()).filter(Boolean),
          },
        },
      });
      setSuccess(true);
      setTitle("");
      setFeatures(["", ""]);
      setSellingPrice("");
      setCrossedPrice("");
      setUploadWindowStart("");
      setUploadWindowEnd("");
      setExpiryDate("");
      setThumbnailUrl("");
      setSyllabusPdfUrls([""]);
      setPlannerUrls([""]);
      onCreated?.();
    } catch {
      setError("Could not create the bundle. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Create Test Series Bundle"
        subtitle="Build a sellable bundle with pricing, timelines, and marketing assets."
      />

      <form onSubmit={handleSubmit} className="clay space-y-5 p-5 sm:p-6">
        <ClayField label="Bundle title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. NEET Dropper Rank Booster 2027"
            className={inputClass}
          />
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

        <ClayField label="Marketing feature pointers (2-3)">
          <div className="space-y-2">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={f}
                  onChange={(e) => updateListItem(features, setFeatures, i, e.target.value)}
                  placeholder={`Feature ${i + 1} (e.g. "45 full-length mock tests")`}
                  className={inputClass}
                />
                {features.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeListItem(features, setFeatures, i)}
                    className="text-foreground/40 hover:text-foreground/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {features.length < 3 && (
              <button
                type="button"
                onClick={() => addListItem(features, setFeatures, 3)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sky-deep)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add feature
              </button>
            )}
          </div>
        </ClayField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ClayField label="Selling price (₹)">
            <input
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              inputMode="numeric"
              placeholder="2999"
              className={inputClass}
            />
          </ClayField>
          <ClayField label="Dummy crossed price (₹)">
            <input
              value={crossedPrice}
              onChange={(e) => setCrossedPrice(e.target.value)}
              inputMode="numeric"
              placeholder="4999"
              className={inputClass}
            />
          </ClayField>
        </div>

        <div className="clay-inset rounded-2xl p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            <Calendar className="h-3.5 w-3.5" /> Timeline validity
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ClayField label="Upload window start">
              <input
                type="date"
                value={uploadWindowStart}
                onChange={(e) => setUploadWindowStart(e.target.value)}
                className={inputClass}
              />
            </ClayField>
            <ClayField label="Upload window end">
              <input
                type="date"
                value={uploadWindowEnd}
                onChange={(e) => setUploadWindowEnd(e.target.value)}
                className={inputClass}
              />
            </ClayField>
            <ClayField label="Access expiry date">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={inputClass}
              />
            </ClayField>
          </div>
        </div>

        <ClayField label="Bundle thumbnail URL">
          <input
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://…/thumbnail.jpg"
            className={inputClass}
          />
        </ClayField>

        <ClayField label="Syllabus PDF URLs">
          <div className="space-y-2">
            {syllabusPdfUrls.map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={u}
                  onChange={(e) => updateListItem(syllabusPdfUrls, setSyllabusPdfUrls, i, e.target.value)}
                  placeholder="https://…/syllabus.pdf"
                  className={inputClass}
                />
                {syllabusPdfUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeListItem(syllabusPdfUrls, setSyllabusPdfUrls, i)}
                    className="text-foreground/40 hover:text-foreground/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addListItem(syllabusPdfUrls, setSyllabusPdfUrls, 6)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sky-deep)] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add PDF
            </button>
          </div>
        </ClayField>

        <ClayField label="Planner URLs">
          <div className="space-y-2">
            {plannerUrls.map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={u}
                  onChange={(e) => updateListItem(plannerUrls, setPlannerUrls, i, e.target.value)}
                  placeholder="https://…/planner.pdf"
                  className={inputClass}
                />
                {plannerUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeListItem(plannerUrls, setPlannerUrls, i)}
                    className="text-foreground/40 hover:text-foreground/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addListItem(plannerUrls, setPlannerUrls, 6)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sky-deep)] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add planner
            </button>
          </div>
        </ClayField>

        <p className="text-xs text-foreground/40">
          Thumbnails and PDFs are stored as URLs for now — point them at any hosted file (e.g. a
          Firebase Storage or S3 link). A direct file-upload widget is a natural next addition
          once you have a storage bucket wired up.
        </p>

        {error && (
          <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-2xl bg-[var(--mint-soft)]/60 px-4 py-2 text-xs font-medium text-foreground">
            Bundle created.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create bundle"}
        </button>
      </form>
    </div>
  );
}

// ─── Module 2: Manage Bundles + Targeted Announcement Console ──────────────
export function BundleManagementModule({ adminUser }: { adminUser: AdminUser }) {
  const [bundles, setBundles] = useState<TestSeriesBundle[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<TestSeriesBundle>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [announceBundleId, setAnnounceBundleId] = useState<string>("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [announceThumbnail, setAnnounceThumbnail] = useState("");
  const [announceSendAt, setAnnounceSendAt] = useState("");
  const [posting, setPosting] = useState(false);
  const [announceError, setAnnounceError] = useState<string | null>(null);
  const [announceSuccess, setAnnounceSuccess] = useState(false);
  const [history, setHistory] = useState<
    { id: string; bundleId: string; message: string | null; thumbnailUrl: string | null; sendAt: string | null; createdAt: string | null }[] | null
  >(null);

  async function refreshBundles() {
    const token = await adminUser.getIdToken();
    const { bundles: rows } = await listBundles({ data: { token } });
    setBundles(rows as TestSeriesBundle[]);
    if (rows.length > 0 && !announceBundleId) setAnnounceBundleId(rows[0].id);
  }

  async function refreshHistory() {
    const token = await adminUser.getIdToken();
    const { announcements } = await listBundleAnnouncements({ data: { token } });
    setHistory(announcements);
  }

  useEffect(() => {
    refreshBundles();
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser]);

  function startEdit(b: TestSeriesBundle) {
    setEditingId(b.id);
    setEditDraft({ title: b.title, sellingPrice: b.sellingPrice, crossedPrice: b.crossedPrice });
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    try {
      const token = await adminUser.getIdToken();
      await updateBundle({ data: { token, id, bundle: editDraft } });
      setEditingId(null);
      await refreshBundles();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handlePostAnnouncement(e: FormEvent) {
    e.preventDefault();
    setAnnounceError(null);
    setAnnounceSuccess(false);

    if (!announceBundleId) return setAnnounceError("Select a bundle first.");
    if (!announceMessage.trim() && !announceThumbnail.trim()) {
      return setAnnounceError("Add a message, a thumbnail, or both.");
    }

    setPosting(true);
    try {
      const token = await adminUser.getIdToken();
      await postBundleAnnouncement({
        data: {
          token,
          announcement: {
            bundleId: announceBundleId,
            message: announceMessage.trim() || null,
            thumbnailUrl: announceThumbnail.trim() || null,
            sendAt: announceSendAt || null,
          },
        },
      });
      setAnnounceSuccess(true);
      setAnnounceMessage("");
      setAnnounceThumbnail("");
      setAnnounceSendAt("");
      await refreshHistory();
    } catch {
      setAnnounceError("Could not post. Try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Manage Bundles & Announcements"
        subtitle="Edit existing bundles and broadcast targeted notices to their buyers."
      />

      {/* Bundle list */}
      <div className="clay mb-6 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-foreground/60" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
            All bundles
          </h2>
        </div>

        {bundles === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : bundles.length === 0 ? (
          <p className="text-sm text-foreground/60">No bundles created yet.</p>
        ) : (
          <ul className="space-y-2">
            {bundles.map((b) => (
              <li key={b.id} className="clay-inset px-4 py-3">
                {editingId === b.id ? (
                  <div className="space-y-2">
                    <input
                      value={editDraft.title ?? ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                      className={inputClass}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editDraft.sellingPrice ?? ""}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, sellingPrice: Number(e.target.value) }))
                        }
                        inputMode="numeric"
                        placeholder="Selling price"
                        className={inputClass}
                      />
                      <input
                        value={editDraft.crossedPrice ?? ""}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, crossedPrice: Number(e.target.value) }))
                        }
                        inputMode="numeric"
                        placeholder="Crossed price"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(b.id)}
                        disabled={savingEdit}
                        className="clay-btn rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-70"
                      >
                        {savingEdit ? "Saving…" : "Save"}
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
                      <p className="text-sm font-semibold text-foreground">{b.title}</p>
                      <p className="text-xs text-foreground/50">
                        {b.track} · ₹{b.sellingPrice}{" "}
                        <span className="line-through opacity-60">₹{b.crossedPrice}</span> ·
                        expires {b.expiryDate}
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

      {/* Targeted announcement console */}
      <div className="clay mb-6 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-foreground/60" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
            Targeted announcement
          </h2>
        </div>

        <form onSubmit={handlePostAnnouncement} className="space-y-3">
          <ClayField label="Bundle">
            <select
              value={announceBundleId}
              onChange={(e) => setAnnounceBundleId(e.target.value)}
              className={inputClass + " appearance-none"}
            >
              {(bundles ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </ClayField>

          <ClayField label="Message (optional if sending thumbnail only)">
            <textarea
              value={announceMessage}
              onChange={(e) => setAnnounceMessage(e.target.value)}
              rows={3}
              placeholder="Write your announcement…"
              className={inputClass}
            />
          </ClayField>

          <ClayField label="Announcement thumbnail URL (optional if sending text only)">
            <input
              value={announceThumbnail}
              onChange={(e) => setAnnounceThumbnail(e.target.value)}
              placeholder="https://…/announcement.jpg"
              className={inputClass}
            />
          </ClayField>

          <ClayField label="Schedule (leave empty to send immediately)">
            <input
              type="datetime-local"
              value={announceSendAt}
              onChange={(e) => setAnnounceSendAt(e.target.value)}
              className={inputClass}
            />
          </ClayField>

          {announceError && (
            <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
              {announceError}
            </p>
          )}
          {announceSuccess && (
            <p className="rounded-2xl bg-[var(--mint-soft)]/60 px-4 py-2 text-xs font-medium text-foreground">
              Announcement saved.
            </p>
          )}

          <button
            type="submit"
            disabled={posting}
            className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post announcement"}
          </button>
        </form>

        <p className="mt-4 text-xs text-foreground/40">
          This records who the announcement is meant for (this bundle's buyers) and whether it's
          scheduled — but there's no <code>purchases</code> collection with confirmed Razorpay
          orders yet, so it doesn't actually filter delivery to real buyers until that exists.
          Right now this is a content + intent record, ready for a delivery job to pick up later.
        </p>
      </div>

      {/* History */}
      <div className="clay p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Recent targeted announcements
        </h2>
        {history === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-foreground/60">Nothing posted yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((a) => {
              const bundle = bundles?.find((b) => b.id === a.bundleId);
              return (
                <li key={a.id} className="clay-inset px-4 py-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[var(--sky-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                      {bundle?.title ?? "Unknown bundle"}
                    </span>
                    <span className="text-xs text-foreground/40">
                      {a.sendAt ? `Scheduled: ${new Date(a.sendAt).toLocaleString()}` : "Sent immediately"}
                    </span>
                  </div>
                  {a.message && <p className="text-sm text-foreground">{a.message}</p>}
                  {a.thumbnailUrl && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-foreground/50">
                      <ImageIcon className="h-3 w-3" /> {a.thumbnailUrl}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}