import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Loader2,
  ShieldCheck,
  LayoutDashboard,
  FileText,
  Users,
  GraduationCap,
  Megaphone,
  LogOut,
  Users2,
  BookOpen,
  IndianRupee,
  ClipboardCheck,
  Smartphone,
  X,
  CalendarClock,
  Package,
  ClipboardList,
  ListChecks,
  Search,
} from "lucide-react";
import { useAdminClaim } from "@/lib/use-admin-claim";
import { signOutUser } from "@/lib/firebase";
import {
  getAdminAnalytics,
  listStudents,
  adminListDevicesForUser,
  createTestSeries,
  listTestSeriesAdmin,
  postAnnouncement,
  listAnnouncements,
} from "@/server-functions/admin";
import { BundleCreationModule, BundleManagementModule } from "@/components/bundle-modules";
import { TestCoreModule } from "@/components/test-core-module";
import { QuestionIngestionModule } from "@/components/question-ingestion-module";
import { BundleInspectorModule } from "@/components/bundle-inspector-module";
import { MentorHubModule } from "@/components/mentor-hub-module";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Command Center · The Apron Boy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboardPage,
});

type ModuleKey =
  | "overview"
  | "bundles"
  | "bundleManage"
  | "testCore"
  | "questions"
  | "inspector"
  | "tests"
  | "students"
  | "mentors"
  | "announcements";

const MODULES: { key: ModuleKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "bundles", label: "Create Bundle", icon: Package },
  { key: "bundleManage", label: "Manage Bundles", icon: Megaphone },
  { key: "testCore", label: "Test Core", icon: ClipboardList },
  { key: "questions", label: "Questions", icon: ListChecks },
  { key: "inspector", label: "Inspector", icon: Search },
  { key: "tests", label: "Test Series", icon: FileText },
  { key: "students", label: "Students", icon: Users },
  { key: "mentors", label: "Mentors", icon: GraduationCap },
  { key: "announcements", label: "Announcements", icon: Megaphone },
];

function AdminDashboardPage() {
  const { adminUser, isAdmin, loading } = useAdminClaim();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<ModuleKey>("overview");

  useEffect(() => {
    if (loading) return;
    if (!adminUser || !isAdmin) {
      navigate({ to: "/admin/auth" });
    }
  }, [loading, adminUser, isAdmin, navigate]);

  async function handleSignOut() {
    await signOutUser();
    navigate({ to: "/admin/auth" });
  }

  if (loading || !adminUser || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-40 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--mint-soft)] opacity-30 blur-3xl" />
      </div>

      {/* ── Sticky sidebar ─────────────────────────────────────────────── */}
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-2 border-r border-foreground/5 bg-background/70 py-5 backdrop-blur-md sm:w-56 sm:items-stretch sm:px-3">
        <div className="mb-4 flex items-center gap-2 px-1 sm:px-2">
          <div className="clay flex h-9 w-9 shrink-0 items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-foreground/70" />
          </div>
          <span className="hidden font-display text-sm font-bold tracking-tight text-foreground sm:inline">
            Admin Center
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const active = activeModule === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setActiveModule(m.key)}
                className={`flex items-center justify-center gap-3 rounded-2xl px-0 py-2.5 text-sm font-semibold transition-all sm:justify-start sm:px-3 ${
                  active ? "clay-btn text-white" : "text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center justify-center gap-3 rounded-2xl px-0 py-2.5 text-sm font-semibold text-foreground/60 transition hover:bg-foreground/5 sm:justify-start sm:px-3"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </aside>

      {/* ── Content canvas ─────────────────────────────────────────────── */}
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {activeModule === "overview" && <OverviewModule adminUser={adminUser} />}
          {activeModule === "bundles" && <BundleCreationModule adminUser={adminUser} />}
          {activeModule === "bundleManage" && <BundleManagementModule adminUser={adminUser} />}
          {activeModule === "testCore" && <TestCoreModule adminUser={adminUser} />}
          {activeModule === "questions" && <QuestionIngestionModule adminUser={adminUser} />}
          {activeModule === "inspector" && <BundleInspectorModule adminUser={adminUser} />}
          {activeModule === "tests" && <TestSeriesModule adminUser={adminUser} />}
          {activeModule === "students" && <StudentsModule adminUser={adminUser} />}
          {activeModule === "mentors" && <MentorHubModule adminUser={adminUser} />}
          {activeModule === "announcements" && <AnnouncementsModule adminUser={adminUser} />}
        </div>
      </main>
    </div>
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

// ─── Module 1: Executive Analytics ──────────────────────────────────────────
function OverviewModule({ adminUser }: { adminUser: { getIdToken: () => Promise<string> } }) {
  const [analytics, setAnalytics] = useState<{
    totalStudents: number;
    activeMentorshipSessions: number | null;
    monthlyRevenue: number | null;
    mockTestsTaken: number | null;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const token = await adminUser.getIdToken();
      const data = await getAdminAnalytics({ data: { token } });
      setAnalytics(data);
    })();
  }, [adminUser]);

  const cards = [
    {
      label: "Total Registered Students",
      value: analytics?.totalStudents ?? null,
      icon: Users2,
      accent: "sky" as const,
    },
    {
      label: "Active Live Mentorship Sessions",
      value: analytics?.activeMentorshipSessions ?? null,
      icon: CalendarClock,
      accent: "teal" as const,
      comingSoon: true,
    },
    {
      label: "Current Month Revenue",
      value: analytics?.monthlyRevenue ?? null,
      icon: IndianRupee,
      accent: "mint" as const,
      comingSoon: true,
    },
    {
      label: "Total Mock Tests Taken",
      value: analytics?.mockTestsTaken ?? null,
      icon: ClipboardCheck,
      accent: "coral" as const,
      comingSoon: true,
    },
  ];

  return (
    <div>
      <ModuleHeader title="Executive Analytics" subtitle="Platform-wide numbers at a glance." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <MetricCard key={c.label} {...c} />
        ))}
      </div>
      <p className="mt-4 text-xs text-foreground/40">
        Mentorship sessions, revenue, and mock test counts are pending their respective data
        sources (live session tracking, Razorpay sync, and test attempt logging) — shown as "—"
        until those are wired up, rather than invented numbers.
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  comingSoon,
}: {
  label: string;
  value: number | null;
  icon: typeof Users2;
  accent: "sky" | "teal" | "mint" | "coral";
  comingSoon?: boolean;
}) {
  const accentVar = {
    sky: "var(--sky-soft)",
    teal: "var(--teal-soft)",
    mint: "var(--mint-soft)",
    coral: "var(--coral-soft)",
  }[accent];

  return (
    <div className="clay p-5">
      <div
        className="clay-inset mb-3 flex h-10 w-10 items-center justify-center rounded-2xl"
        style={{ background: accentVar }}
      >
        <Icon className="h-5 w-5 text-foreground/60" />
      </div>
      <p className="font-display text-2xl font-bold tracking-tight text-foreground">
        {value === null ? "—" : value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs font-medium text-foreground/60">{label}</p>
      {comingSoon && (
        <span className="mt-2 inline-block rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
          Coming soon
        </span>
      )}
    </div>
  );
}

// ─── Module 2: Test Series & Content Manager ────────────────────────────────
type TestSeriesRow = {
  id: string;
  title: string;
  subject: string;
  totalMarks: number;
  timeLimitMinutes: number;
  track: string;
  cbtEngineSynced: boolean;
  createdAt: string | null;
};

function TestSeriesModule({ adminUser }: { adminUser: { getIdToken: () => Promise<string> } }) {
  const [rows, setRows] = useState<TestSeriesRow[] | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<"Physics" | "Chemistry" | "Biology" | "Full-Length Mock">("Physics");
  const [totalMarks, setTotalMarks] = useState("180");
  const [timeLimit, setTimeLimit] = useState("180");
  const [track, setTrack] = useState<"Dropper" | "11th" | "12th" | "All">("All");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const token = await adminUser.getIdToken();
    const { testSeries } = await listTestSeriesAdmin({ data: { token } });
    setRows(testSeries as TestSeriesRow[]);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Enter a test title.");
    const marks = Number(totalMarks);
    const minutes = Number(timeLimit);
    if (!marks || marks <= 0) return setError("Enter valid total marks.");
    if (!minutes || minutes <= 0) return setError("Enter a valid time limit.");

    setSaving(true);
    try {
      const token = await adminUser.getIdToken();
      await createTestSeries({
        data: { token, testSeries: { title, subject, totalMarks: marks, timeLimitMinutes: minutes, track } },
      });
      setTitle("");
      setTotalMarks("180");
      setTimeLimit("180");
      await refresh();
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ModuleHeader title="Test Series & Content Manager" subtitle="Upload and manage NEET test series." />

      <div className="clay mb-6 p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Upload a new test
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <AdminInput placeholder="Test title (e.g. Full Syllabus Mock #12)" value={title} onChange={setTitle} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AdminSelect
              value={subject}
              onChange={(v) => setSubject(v as typeof subject)}
              options={["Physics", "Chemistry", "Biology", "Full-Length Mock"]}
            />
            <AdminInput placeholder="Total marks" value={totalMarks} onChange={setTotalMarks} inputMode="numeric" />
            <AdminInput
              placeholder="Time limit (minutes)"
              value={timeLimit}
              onChange={setTimeLimit}
              inputMode="numeric"
            />
          </div>
          <AdminSelect
            value={track}
            onChange={(v) => setTrack(v as typeof track)}
            options={["All", "Dropper", "11th", "12th"]}
            label="Batch / track"
          />

          {error && (
            <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload test"}
          </button>
        </form>
      </div>

      <div className="clay mb-6 p-5 sm:p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          CBT Engine Sync
        </h2>
        <p className="text-sm text-foreground/60">
          The 1:1 NTA replica test engine isn't built yet, so there's nothing to sync tests into
          for real. Every uploaded test above is stored with a <code>cbtEngineSynced: false</code>{" "}
          flag so a future sync job can pick up exactly which tests still need mapping onto the
          engine's grid layout once it exists.
        </p>
      </div>

      <div className="clay p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Uploaded tests
        </h2>
        {rows === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-foreground/60">No tests uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="clay-inset flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <p className="text-xs text-foreground/50">
                    {r.subject} · {r.totalMarks} marks · {r.timeLimitMinutes} min · {r.track}
                  </p>
                </div>
                <span className="rounded-full bg-foreground/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
                  {r.cbtEngineSynced ? "Synced" : "Not synced"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Module 3: Student Directory ─────────────────────────────────────────────
type StudentRow = {
  uid: string;
  fullName: string;
  email: string | null;
  track: string;
  targetExam: string;
  deviceCount: number;
};

function StudentsModule({ adminUser }: { adminUser: { getIdToken: () => Promise<string> } }) {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [deviceModalUid, setDeviceModalUid] = useState<string | null>(null);
  const [devices, setDevices] = useState<{ deviceId: string; deviceLabel: string; ip: string; lastSeenAt: string | null }[] | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const token = await adminUser.getIdToken();
      const { students: rows } = await listStudents({ data: { token } });
      setStudents(rows as StudentRow[]);
    })();
  }, [adminUser]);

  async function openDevices(uid: string) {
    setDeviceModalUid(uid);
    setDevices(null);
    const token = await adminUser.getIdToken();
    const { sessions } = await adminListDevicesForUser({ data: { token, uid } });
    setDevices(sessions);
  }

  return (
    <div>
      <ModuleHeader title="Student Directory" subtitle="All onboarded students across every track." />

      <div className="clay overflow-x-auto p-5 sm:p-6">
        {students === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-foreground/60">No students yet.</p>
        ) : (
          <table className="w-full min-w-[560px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">
                <th className="px-3 pb-1">Name</th>
                <th className="px-3 pb-1">Track</th>
                <th className="px-3 pb-1">Target</th>
                <th className="px-3 pb-1">Devices</th>
                <th className="px-3 pb-1" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.uid} className="clay-inset">
                  <td className="rounded-l-2xl px-3 py-3">
                    <p className="font-medium text-foreground">{s.fullName || "—"}</p>
                    <p className="text-xs text-foreground/50">{s.email}</p>
                  </td>
                  <td className="px-3 py-3 text-foreground/80">{s.track || "—"}</td>
                  <td className="px-3 py-3 text-foreground/80">{s.targetExam || "—"}</td>
                  <td className="px-3 py-3 text-foreground/80">{s.deviceCount}</td>
                  <td className="rounded-r-2xl px-3 py-3 text-right">
                    <button
                      onClick={() => openDevices(s.uid)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sky-deep)] hover:underline"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      View devices
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deviceModalUid && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setDeviceModalUid(null)}
        >
          <div className="clay w-full max-w-md p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
                Logged-in devices
              </h3>
              <button onClick={() => setDeviceModalUid(null)} className="text-foreground/40 hover:text-foreground/70">
                <X className="h-4 w-4" />
              </button>
            </div>
            {devices === null ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
              </div>
            ) : devices.length === 0 ? (
              <p className="text-sm text-foreground/60">No devices found.</p>
            ) : (
              <ul className="space-y-2">
                {devices.map((d) => (
                  <li key={d.deviceId} className="clay-inset px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{d.deviceLabel}</p>
                    <p className="text-xs text-foreground/50">
                      {d.ip} · {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : "unknown"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module 4: Mentor Allocation & Schedule Hub ─────────────────────────────
// (Replaced by MentorHubModule in @/components/mentor-hub-module — mentor
// onboarding, profile editing, and mentorship batches are now real.)

// ─── Module 5: Announcement Broadcast ───────────────────────────────────────
type AnnouncementRow = {
  id: string;
  message: string;
  track: string;
  createdAt: string | null;
};

function AnnouncementsModule({ adminUser }: { adminUser: { getIdToken: () => Promise<string> } }) {
  const [rows, setRows] = useState<AnnouncementRow[] | null>(null);
  const [message, setMessage] = useState("");
  const [track, setTrack] = useState<"All" | "Dropper" | "11th" | "12th">("All");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const token = await adminUser.getIdToken();
    const { announcements } = await listAnnouncements({ data: { token } });
    setRows(announcements as AnnouncementRow[]);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser]);

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) return setError("Write a message first.");
    setPosting(true);
    try {
      const token = await adminUser.getIdToken();
      await postAnnouncement({ data: { token, message, track } });
      setMessage("");
      await refresh();
    } catch {
      setError("Could not post. Try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      <ModuleHeader title="Announcement Broadcast" subtitle="Post notices to the student dashboard feed." />

      <div className="clay mb-6 p-5 sm:p-6">
        <form onSubmit={handlePost} className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement…"
            rows={3}
            className="clay-inset w-full rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
          <AdminSelect
            value={track}
            onChange={(v) => setTrack(v as typeof track)}
            options={["All", "Dropper", "11th", "12th"]}
            label="Send to"
          />
          {error && (
            <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
              {error}
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
      </div>

      <div className="clay p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
          Recent announcements
        </h2>
        {rows === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-foreground/60">Nothing posted yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((a) => (
              <li key={a.id} className="clay-inset px-4 py-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[var(--sky-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                    {a.track}
                  </span>
                  <span className="text-xs text-foreground/40">
                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                  </span>
                </div>
                <p className="text-sm text-foreground">{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-foreground/40">
        This posts to the <code>announcements</code> collection. The Student Dashboard doesn't
        read from it yet — that's the natural next step to wire up once you're ready.
      </p>
    </div>
  );
}

// ─── Shared small inputs ─────────────────────────────────────────────────────
function AdminInput({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputMode?: "text" | "numeric";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="clay-inset w-full rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
    />
  );
}

function AdminSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label?: string;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="clay-inset w-full appearance-none rounded-2xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}