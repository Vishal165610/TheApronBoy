import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Loader2,
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
  Megaphone,
  LifeBuoy,
  Lock,
  PlayCircle,
  FileText,
  ChevronDown,
  PhoneCall,
  X,
  Users2,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import {
  getPublicBundleDetail,
  getPublicMentorshipDetail,
  listPublicTestsForBundle,
  listPublicBundleAnnouncements,
  hasPurchased,
  requestCallback,
  submitSupportTicket,
} from "@/server-functions/batch-hub";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/server-functions/payments";

// Razorpay's checkout.js attaches window.Razorpay — declared here since it's
// loaded dynamically rather than imported as a module.
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout script")));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });
}

export const Route = createFileRoute("/course/$kind/$id")({
  component: CourseHubPage,
});

type Kind = "bundle" | "mentorship";
type TabKey = "overview" | "tests" | "assets" | "announcements" | "help";

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "tests", label: "Tests", icon: ClipboardList },
  { key: "assets", label: "Assets", icon: FolderOpen },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "help", label: "Help", icon: LifeBuoy },
];

type BundleDetail = {
  id: string;
  title: string;
  track: string;
  features: string[];
  sellingPrice: number;
  crossedPrice: number;
  discountPercent: number;
  expiryDate: string;
  thumbnailUrl: string | null;
  syllabusPdfUrls: string[];
  plannerUrls: string[];
};

type MentorshipDetail = {
  id: string;
  name: string;
  track: string;
  highlights: string[];
  sellingPrice: number;
  crossedPrice: number;
  discountPercent: number;
  thumbnailUrl: string | null;
  mentor: { name: string; profilePictureUrl: string | null } | null;
};

type TestRow = {
  id: string;
  name: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  liveStart: string;
  liveEnd: string;
};

type AnnouncementRow = {
  id: string;
  message: string | null;
  thumbnailUrl: string | null;
  createdAt: string | null;
};

function CourseHubPage() {
  const { kind, id } = Route.useParams() as { kind: Kind; id: string };
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [bundle, setBundle] = useState<BundleDetail | null>(null);
  const [mentorship, setMentorship] = useState<MentorshipDetail | null>(null);
  const [tests, setTests] = useState<TestRow[] | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[] | null>(null);
  const [isPurchased, setIsPurchased] = useState<boolean | null>(null);
  const [pdfModalUrl, setPdfModalUrl] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const purchase = await hasPurchased({ data: { token, itemType: kind, itemId: id } });
      setIsPurchased(purchase.isPurchased);

      if (kind === "bundle") {
        const [{ bundle: b }, { tests: t }, { announcements: a }] = await Promise.all([
          getPublicBundleDetail({ data: { token, bundleId: id } }),
          listPublicTestsForBundle({ data: { token, bundleId: id } }),
          listPublicBundleAnnouncements({ data: { token, bundleId: id } }),
        ]);
        setBundle(b as BundleDetail | null);
        setTests(t as TestRow[]);
        setAnnouncements(a as AnnouncementRow[]);
      } else {
        const { batch } = await getPublicMentorshipDetail({ data: { token, batchId: id } });
        setMentorship(batch as MentorshipDetail | null);
        setTests([]);
        setAnnouncements([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, kind, id]);

  if (loading || !user || isPurchased === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  const title = kind === "bundle" ? bundle?.title : mentorship?.name;
  const sellingPrice = kind === "bundle" ? bundle?.sellingPrice : mentorship?.sellingPrice;
  const crossedPrice = kind === "bundle" ? bundle?.crossedPrice : mentorship?.crossedPrice;
  const discountPercent = kind === "bundle" ? bundle?.discountPercent : mentorship?.discountPercent;

  async function handlePurchase() {
    if (!user) return;
    setPurchaseError(null);
    setPurchasing(true);
    try {
      const token = await user.getIdToken();
      const order = await createRazorpayOrder({ data: { token, itemType: kind, itemId: id } });
      await loadRazorpayScript();

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "The Apron Boy",
        description: order.itemTitle,
        prefill: { email: user.email ?? undefined },
        theme: { color: "#0284c7" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const freshToken = await user.getIdToken();
            await verifyRazorpayPayment({
              data: {
                token: freshToken,
                itemType: kind,
                itemId: id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            // Unlock immediately — no page reload needed.
            setIsPurchased(true);
          } catch {
            setPurchaseError("Payment succeeded but verification failed. Contact support with your payment ID.");
          } finally {
            setPurchasing(false);
          }
        },
        modal: {
          ondismiss: () => setPurchasing(false),
        },
      });
      razorpay.open();
    } catch {
      setPurchaseError("Could not start checkout. Please try again.");
      setPurchasing(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-60 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--teal-soft)] opacity-60 blur-3xl" />
      </div>

      <AppHeader user={user} />

      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-28 pt-6 sm:px-6 md:pb-8">
        <aside className="sticky top-20 hidden h-fit w-52 shrink-0 flex-col gap-1 md:flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  active ? "clay-btn text-white" : "text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </aside>

        <main className="min-w-0 flex-1">
          <div className="clay mb-6 flex items-center gap-4 p-5 sm:p-6">
            <div className="clay-inset flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--sky-soft)]">
              {kind === "bundle" ? (
                <BookOpen className="h-6 w-6 text-foreground/40" />
              ) : (
                <Users2 className="h-6 w-6 text-foreground/40" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                {kind === "bundle" ? "Test Series" : "Mentorship"}
              </p>
              <h1 className="truncate font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {title ?? "…"}
              </h1>
            </div>
          </div>

          {activeTab === "overview" && (
            <OverviewTab
              kind={kind}
              bundle={bundle}
              mentorship={mentorship}
              isPurchased={isPurchased}
              user={user}
              itemId={id}
            />
          )}
          {activeTab === "tests" && <TestsTab tests={tests} isPurchased={isPurchased} navigate={navigate} />}
          {activeTab === "assets" && (
            <AssetsTab bundle={bundle} isPurchased={isPurchased} onOpenPdf={setPdfModalUrl} />
          )}
          {activeTab === "announcements" && (
            <AnnouncementsTab announcements={announcements} isPurchased={isPurchased} />
          )}
          {activeTab === "help" && <HelpTab isPurchased={isPurchased} user={user} kind={kind} itemId={id} />}
        </main>
      </div>

      <nav className="clay fixed inset-x-3 bottom-3 z-30 flex items-center justify-around gap-1 rounded-3xl p-2 md:hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-semibold transition-all ${
                active ? "clay-btn text-white" : "text-foreground/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {!isPurchased && sellingPrice !== undefined && (
        <div className="fixed inset-x-0 bottom-16 z-20 px-3 md:bottom-4">
          <div className="clay mx-auto flex max-w-xl items-center justify-between gap-3 p-4 sm:p-5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-lg font-bold text-foreground">
                  ₹{sellingPrice.toLocaleString()}
                </span>
                {crossedPrice && crossedPrice > sellingPrice && (
                  <span className="text-sm text-foreground/40 line-through">
                    ₹{crossedPrice.toLocaleString()}
                  </span>
                )}
                {discountPercent ? (
                  <span className="text-xs font-semibold text-[var(--sky-deep)]">{discountPercent}% OFF</span>
                ) : null}
              </div>
              <p className="text-xs text-foreground/50">Purchase Batch to Unlock Everything</p>
            </div>
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="clay-btn flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-70"
            >
              {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase Batch"}
            </button>
          </div>
          {purchaseError && (
            <div className="clay-inset mx-auto mt-2 max-w-xl rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-center text-xs font-medium text-foreground">
              {purchaseError}
            </div>
          )}
        </div>
      )}

      {pdfModalUrl && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPdfModalUrl(null)}
        >
          <div
            className="clay flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-sm font-semibold text-foreground">Document preview</p>
              <button onClick={() => setPdfModalUrl(null)} className="text-foreground/40 hover:text-foreground/70">
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              title="Document preview"
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfModalUrl)}&embedded=true`}
              className="clay-inset h-full w-full flex-1 rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LockGate({ locked, children }: { locked: boolean; children: ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="clay-inset flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 backdrop-blur-sm">
          <Lock className="h-3.5 w-3.5 text-foreground/50" />
          <span className="text-xs font-semibold text-foreground/60">Purchase to unlock</span>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  kind,
  bundle,
  mentorship,
  isPurchased,
  user,
  itemId,
}: {
  kind: Kind;
  bundle: BundleDetail | null;
  mentorship: MentorshipDetail | null;
  isPurchased: boolean;
  user: { getIdToken: () => Promise<string> };
  itemId: string;
}) {
  const [showCallbackForm, setShowCallbackForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How long do I get access for?",
      a: "Access runs until the batch's listed expiry date, shown on the checkout banner and pricing details.",
    },
    {
      q: "Can I switch tracks after purchasing?",
      a: "Reach out via the Help tab and our team can help with track changes on a case-by-case basis.",
    },
    { q: "Is this refundable?", a: "Refund policy details will be shown at checkout once payments are live." },
  ];

  async function handleCallbackSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSending(true);
    try {
      const token = await user.getIdToken();
      await requestCallback({ data: { token, itemType: kind, itemId, name, phone, message } });
      setSent(true);
      setShowCallbackForm(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {kind === "mentorship" && mentorship?.mentor && (
        <div className="clay p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="clay-inset flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full">
              {mentorship.mentor.profilePictureUrl ? (
                <img src={mentorship.mentor.profilePictureUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-xl font-bold text-foreground/50">
                  {mentorship.mentor.name.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Your Mentor</p>
              <p className="font-display text-lg font-bold text-foreground">{mentorship.mentor.name}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {mentorship.highlights.map((h, i) => (
              <p key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--sky-deep)]" />
                {h}
              </p>
            ))}
          </div>
        </div>
      )}

      {kind === "bundle" && bundle && (
        <div className="clay p-5 sm:p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">What's inside</p>
          <div className="space-y-1.5">
            {bundle.features.map((f, i) => (
              <p key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--sky-deep)]" />
                {f}
              </p>
            ))}
          </div>
          <p className="mt-3 text-xs text-foreground/50">
            Access until {new Date(bundle.expiryDate).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="clay p-5 sm:p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">FAQs</p>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className="clay-inset rounded-2xl px-4 py-3">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="text-sm font-semibold text-foreground">{f.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-foreground/40 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && <p className="mt-2 text-sm text-foreground/60">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="clay p-5 text-center sm:p-6">
        {sent ? (
          <p className="text-sm font-semibold text-foreground">Thanks — we'll call you back shortly.</p>
        ) : showCallbackForm ? (
          <form onSubmit={handleCallbackSubmit} className="space-y-3 text-left">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="clay-inset w-full rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="clay-inset w-full rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything specific you'd like to ask about? (optional)"
              rows={2}
              className="clay-inset w-full rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="clay-btn flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowCallbackForm(true)}
            className="clay-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            <PhoneCall className="h-4 w-4" />
            Request a Call Back
          </button>
        )}
      </div>
    </div>
  );
}

function TestsTab({
  tests,
  isPurchased,
  navigate,
}: {
  tests: TestRow[] | null;
  isPurchased: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (tests === null) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (tests.length === 0) {
    return <div className="clay p-8 text-center text-sm text-foreground/60">No tests added to this batch yet.</div>;
  }

  return (
    <div className="space-y-3">
      {tests.map((t) => {
        const now = Date.now();
        const start = new Date(t.liveStart).getTime();
        const end = new Date(t.liveEnd).getTime();
        const isLive = now >= start && now <= end;
        const isUpcoming = now < start;

        return (
          <LockGate key={t.id} locked={!isPurchased}>
            <div className="clay flex items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-foreground/50">
                  {t.totalQuestions} questions · {t.timeLimitMinutes} min
                </p>
                <p className="mt-1 text-xs font-semibold">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 text-[var(--coral-soft)]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> LIVE
                    </span>
                  ) : isUpcoming ? (
                    <span className="text-foreground/50">Starts {new Date(t.liveStart).toLocaleDateString()}</span>
                  ) : (
                    <span className="text-foreground/50">Held on: {new Date(t.liveStart).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
              <button
                disabled={!isPurchased}
                onClick={() => navigate({ to: "/" })}
                className="clay-btn flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-40"
              >
                <PlayCircle className="h-4 w-4" />
                Start Test
              </button>
            </div>
          </LockGate>
        );
      })}
      {isPurchased && (
        <p className="text-xs text-foreground/40">
          "Start Test" currently links back home — the 1:1 NTA replica engine it should redirect
          into hasn't been built yet.
        </p>
      )}
    </div>
  );
}

function AssetsTab({
  bundle,
  isPurchased,
  onOpenPdf,
}: {
  bundle: BundleDetail | null;
  isPurchased: boolean;
  onOpenPdf: (url: string) => void;
}) {
  if (!bundle) {
    return (
      <div className="clay p-8 text-center text-sm text-foreground/60">
        Assets aren't available for mentorship batches.
      </div>
    );
  }

  const assets = [
    ...bundle.syllabusPdfUrls.map((url) => ({ url, label: "Syllabus" })),
    ...bundle.plannerUrls.map((url) => ({ url, label: "Planner" })),
  ];

  if (assets.length === 0) {
    return <div className="clay p-8 text-center text-sm text-foreground/60">No assets uploaded yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {assets.map((a, i) => (
        <LockGate key={i} locked={!isPurchased}>
          <button
            disabled={!isPurchased}
            onClick={() => onOpenPdf(a.url)}
            className="clay flex w-full items-center gap-3 p-4 text-left disabled:cursor-not-allowed"
          >
            <div className="clay-inset flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <FileText className="h-4 w-4 text-foreground/50" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{a.label}</p>
              <p className="truncate text-xs text-foreground/40">{a.url}</p>
            </div>
          </button>
        </LockGate>
      ))}
    </div>
  );
}

function AnnouncementsTab({
  announcements,
  isPurchased,
}: {
  announcements: AnnouncementRow[] | null;
  isPurchased: boolean;
}) {
  if (announcements === null) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
      </div>
    );
  }
  if (announcements.length === 0) {
    return <div className="clay p-8 text-center text-sm text-foreground/60">No announcements yet.</div>;
  }

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <LockGate key={a.id} locked={!isPurchased}>
          <div className="clay flex gap-3 p-4">
            {a.thumbnailUrl && <img src={a.thumbnailUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
            <div>
              {a.message && <p className="text-sm text-foreground">{a.message}</p>}
              <p className="mt-1 text-xs text-foreground/40">
                {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
              </p>
            </div>
          </div>
        </LockGate>
      ))}
    </div>
  );
}

function HelpTab({
  isPurchased,
  user,
  kind,
  itemId,
}: {
  isPurchased: boolean;
  user: { getIdToken: () => Promise<string> };
  kind: Kind;
  itemId: string;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const token = await user.getIdToken();
      await submitSupportTicket({ data: { token, itemType: kind, itemId, subject, message } });
      setSent(true);
      setSubject("");
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  return (
    <LockGate locked={!isPurchased}>
      <div className="clay p-5 sm:p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Raise a ticket for this batch
        </p>
        {sent ? (
          <p className="text-sm font-semibold text-foreground">
            Ticket submitted — our team will follow up with you.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              disabled={!isPurchased}
              className="clay-inset w-full rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none disabled:opacity-50"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question…"
              rows={4}
              disabled={!isPurchased}
              className="clay-inset w-full rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isPurchased || sending}
              className="clay-btn flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit ticket"}
            </button>
          </form>
        )}
      </div>
    </LockGate>
  );
}