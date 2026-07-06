import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, ClipboardList, Pencil, AlertCircle, CheckCircle2 } from "lucide-react";
import type { TestSeriesBundle, TestCore, SubjectWeightage } from "@/lib/admin-types";
import { listBundles, createTestCore, listTestCoresForBundle, updateTestCore } from "@/server-functions/admin";

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

function parseSubjects(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

export function TestCoreModule({ adminUser }: { adminUser: AdminUser }) {
  const [bundles, setBundles] = useState<TestSeriesBundle[] | null>(null);
  const [bundleId, setBundleId] = useState("");
  const [tests, setTests] = useState<TestCore[] | null>(null);

  const [name, setName] = useState("");
  const [totalQuestions, setTotalQuestions] = useState("");
  const [subjectsRaw, setSubjectsRaw] = useState("");
  const [weightage, setWeightage] = useState<Record<string, string>>({});
  const [liveStart, setLiveStart] = useState("");
  const [liveEnd, setLiveEnd] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<TestCore>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const subjects = useMemo(() => parseSubjects(subjectsRaw), [subjectsRaw]);
  const total = Number(totalQuestions) || 0;
  const assignedSum = subjects.reduce((sum, s) => sum + (Number(weightage[s]) || 0), 0);
  const weightageBalanced = subjects.length > 0 && total > 0 && assignedSum === total;

  useEffect(() => {
    (async () => {
      const token = await adminUser.getIdToken();
      const { bundles: rows } = await listBundles({ data: { token } });
      setBundles(rows as TestSeriesBundle[]);
      if (rows.length > 0) setBundleId(rows[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser]);

  async function refreshTests(id: string) {
    if (!id) return setTests([]);
    const token = await adminUser.getIdToken();
    const { testCores } = await listTestCoresForBundle({ data: { token, bundleId: id } });
    setTests(testCores as TestCore[]);
  }

  useEffect(() => {
    if (bundleId) refreshTests(bundleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundleId]);

  function updateWeightage(subject: string, value: string) {
    setWeightage((w) => ({ ...w, [subject]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!bundleId) return setError("Select a bundle first.");
    if (!name.trim()) return setError("Enter a test name.");
    if (!total || total <= 0) return setError("Enter a valid total question count.");
    if (subjects.length === 0) return setError("Enter at least one subject.");
    if (!weightageBalanced) {
      return setError(
        `Subject weightage must add up to exactly ${total} (currently ${assignedSum}).`,
      );
    }
    if (!liveStart || !liveEnd) return setError("Set the live testing window.");
    if (new Date(liveEnd) <= new Date(liveStart)) return setError("Live end must be after live start.");

    setSaving(true);
    try {
      const token = await adminUser.getIdToken();
      const weightageList: SubjectWeightage[] = subjects.map((s) => ({
        subject: s,
        questionCount: Number(weightage[s]) || 0,
      }));
      await createTestCore({
        data: {
          token,
          testCore: {
            bundleId,
            name: name.trim(),
            totalQuestions: total,
            subjects,
            weightage: weightageList,
            liveStart,
            liveEnd,
            instructions,
          },
        },
      });
      setSuccess(true);
      setName("");
      setTotalQuestions("");
      setSubjectsRaw("");
      setWeightage({});
      setLiveStart("");
      setLiveEnd("");
      setInstructions("");
      await refreshTests(bundleId);
    } catch {
      setError("Could not save the test. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(t: TestCore) {
    setEditingId(t.id);
    setEditDraft({
      name: t.name,
      totalQuestions: t.totalQuestions,
      liveStart: t.liveStart,
      liveEnd: t.liveEnd,
      instructions: t.instructions,
    });
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    try {
      const token = await adminUser.getIdToken();
      await updateTestCore({ data: { token, id, testCore: editDraft } });
      setEditingId(null);
      await refreshTests(bundleId);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Test Core Configurator"
        subtitle="Append a test to a bundle with subject weightage and a live testing window."
      />

      <div className="clay mb-6 p-5 sm:p-6">
        <ClayField label="Bundle">
          <select
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value)}
            className={inputClass + " appearance-none"}
          >
            {bundles === null ? (
              <option>Loading…</option>
            ) : bundles.length === 0 ? (
              <option>No bundles yet — create one first</option>
            ) : (
              bundles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))
            )}
          </select>
        </ClayField>
      </div>

      <form onSubmit={handleSubmit} className="clay mb-6 space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ClayField label="Test name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Full Syllabus Mock #7"
              className={inputClass}
            />
          </ClayField>
          <ClayField label="Total questions">
            <input
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
              inputMode="numeric"
              placeholder="180"
              className={inputClass}
            />
          </ClayField>
        </div>

        <ClayField label="Subjects (comma separated)">
          <input
            value={subjectsRaw}
            onChange={(e) => setSubjectsRaw(e.target.value)}
            placeholder="Physics, Chemistry, Biology"
            className={inputClass}
          />
        </ClayField>

        {subjects.length > 0 && (
          <div className="clay-inset rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                Subject weightage
              </p>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  weightageBalanced ? "text-[var(--sky-deep)]" : "text-foreground/50"
                }`}
              >
                {weightageBalanced ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {assignedSum} / {total || "?"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {subjects.map((s) => (
                <ClayField key={s} label={s}>
                  <input
                    value={weightage[s] ?? ""}
                    onChange={(e) => updateWeightage(s, e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                    className={inputClass}
                  />
                </ClayField>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ClayField label="Live start">
            <input
              type="datetime-local"
              value={liveStart}
              onChange={(e) => setLiveStart(e.target.value)}
              className={inputClass}
            />
          </ClayField>
          <ClayField label="Live end">
            <input
              type="datetime-local"
              value={liveEnd}
              onChange={(e) => setLiveEnd(e.target.value)}
              className={inputClass}
            />
          </ClayField>
        </div>
        <p className="text-xs text-foreground/40">
          Between these times the test shows a LIVE badge on the student side. After the window
          closes, it automatically becomes a regular practice module.
        </p>

        <ClayField label="Test instructions">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="General instructions shown to students before they start…"
            className={inputClass}
          />
        </ClayField>

        {error && (
          <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-2xl bg-[var(--mint-soft)]/60 px-4 py-2 text-xs font-medium text-foreground">
            Test added to bundle.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !bundleId}
          className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add test to bundle"}
        </button>
      </form>

      <div className="clay p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-foreground/60" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
            Tests in this bundle
          </h2>
        </div>

        {tests === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : tests.length === 0 ? (
          <p className="text-sm text-foreground/60">No tests added to this bundle yet.</p>
        ) : (
          <ul className="space-y-2">
            {tests.map((t) => (
              <li key={t.id} className="clay-inset px-4 py-3">
                {editingId === t.id ? (
                  <div className="space-y-2">
                    <input
                      value={editDraft.name ?? ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                      className={inputClass}
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="datetime-local"
                        value={editDraft.liveStart ?? ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, liveStart: e.target.value }))}
                        className={inputClass}
                      />
                      <input
                        type="datetime-local"
                        value={editDraft.liveEnd ?? ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, liveEnd: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <textarea
                      value={editDraft.instructions ?? ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, instructions: e.target.value }))}
                      rows={3}
                      className={inputClass}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(t.id)}
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
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-foreground/50">
                        {t.totalQuestions} Qs · {t.subjects.join(", ")} ·{" "}
                        {new Date(t.liveStart).toLocaleString()} →{" "}
                        {new Date(t.liveEnd).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(t)}
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
    </div>
  );
}