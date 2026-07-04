import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, BookOpen, ClipboardList, FlaskConical, Users2, MessageCircle, CalendarClock, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getProfile } from "@/server-functions/profile";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type Track = "Dropper" | "11th" | "12th" | "";

type StudentProfile = {
  fullName: string;
  targetExam: string;
  track: Track;
};

// ─── Track-aware content catalog ────────────────────────────────────────────
// Placeholder catalog data. Swap these arrays for a real server function
// (e.g. listTestSeries / listMentorships filtered by track) when ready.
type CatalogCard = {
  title: string;
  description: string;
  meta: string;
  icon: typeof BookOpen;
  accent: "sky" | "teal" | "mint" | "coral";
};

function getTestSeries(track: Track): CatalogCard[] {
  const base: CatalogCard[] = [
    {
      title: "Full Syllabus Mock Tests",
      description: "NTA-pattern full-length tests replicating the real NEET CBT interface.",
      meta: "45 tests",
      icon: ClipboardList,
      accent: "sky",
    },
    {
      title: "Chapter-wise Practice Sets",
      description: "Targeted question sets for every NCERT chapter, auto-scored.",
      meta: "180+ sets",
      icon: BookOpen,
      accent: "teal",
    },
    {
      title: "Previous Year Papers",
      description: "NEET papers from the last 15 years, timed and analyzed.",
      meta: "15 years",
      icon: FlaskConical,
      accent: "mint",
    },
  ];

  if (track === "Dropper") {
    return [
      {
        title: "Rank Booster Test Series",
        description: "High-difficulty tests calibrated for repeat aspirants targeting AIIMS-level ranks.",
        meta: "30 tests",
        icon: ClipboardList,
        accent: "coral",
      },
      ...base,
    ];
  }

  return base;
}

function getMentorships(track: Track): CatalogCard[] {
  const base: CatalogCard[] = [
    {
      title: "1:1 Doubt Solving",
      description: "Book a slot with a subject mentor whenever you're stuck on a concept.",
      meta: "On demand",
      icon: MessageCircle,
      accent: "sky",
    },
    {
      title: "Weekly Strategy Sessions",
      description: "Group sessions covering study planning, time management, and revision cycles.",
      meta: "Every Sunday",
      icon: CalendarClock,
      accent: "teal",
    },
  ];

  if (track === "Dropper") {
    return [
      {
        title: "Exam Temperament Coaching",
        description: "1:1 mentorship focused on pressure handling and consistency for repeat attempts.",
        meta: "Bi-weekly",
        icon: Users2,
        accent: "coral",
      },
      ...base,
    ];
  }

  if (track === "11th") {
    return [
      {
        title: "Foundation Building Circle",
        description: "Peer mentorship group focused on building strong Class 11 fundamentals early.",
        meta: "Weekly",
        icon: Users2,
        accent: "mint",
      },
      ...base,
    ];
  }

  return [
    {
      title: "Board + NEET Balance Mentorship",
      description: "Guidance on balancing board exam prep with NEET syllabus coverage.",
      meta: "Weekly",
      icon: Users2,
      accent: "mint",
    },
    ...base,
  ];
}

const accentVar: Record<CatalogCard["accent"], string> = {
  sky: "var(--sky-soft)",
  teal: "var(--teal-soft)",
  mint: "var(--mint-soft)",
  coral: "var(--coral-soft)",
};

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const { profile: p } = await getProfile({ data: { token } });
      if (p) {
        setProfile({
          fullName: p.fullName,
          targetExam: p.targetExam || "NEET",
          track: (p.track as Track) || "",
        });
      }
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  const track = profile?.track ?? "";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* soft ambient background blobs — consistent with the auth page */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-70 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--teal-soft)] opacity-70 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-[var(--mint-soft)] opacity-60 blur-3xl" />
      </div>

      <AppHeader user={user} displayName={profile?.fullName} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* ── Welcome + academic filter banner ──────────────────────────── */}
        <div className="mb-10">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome{profile?.fullName ? `, ${profile.fullName}` : user.displayName ? `, ${user.displayName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">{user.email}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="clay-chip inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
              Target Exam: {profile?.targetExam || "NEET"}
            </span>
            {track && (
              <span className="clay-chip inline-flex items-center gap-1.5 bg-[var(--sky-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                Category: {track}
              </span>
            )}
          </div>
        </div>

        {/* ── Section A: Online Test Series ─────────────────────────────── */}
        <CatalogSection
          title="Online Test Series"
          subtitle="Practice on NTA-pattern tests built for your track."
          cards={getTestSeries(track)}
          ctaLabel="Enter test series"
        />

        {/* ── Section B: Mentorship Programs ────────────────────────────── */}
        <CatalogSection
          title="Mentorship Programs"
          subtitle="Guidance and accountability, matched to your track."
          cards={getMentorships(track)}
          ctaLabel="Join mentorship"
        />
      </main>
    </div>
  );
}

function CatalogSection({
  title,
  subtitle,
  cards,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  cards: CatalogCard[];
  ctaLabel: string;
}) {
  return (
    <section className="mb-12">
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-foreground/60">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <BatchCard key={card.title} card={card} ctaLabel={ctaLabel} />
        ))}
      </div>
    </section>
  );
}

function BatchCard({ card, ctaLabel }: { card: CatalogCard; ctaLabel: string }) {
  const Icon = card.icon;
  return (
    <div className="clay flex flex-col overflow-hidden p-3">
      <div
        className="clay-inset flex h-32 items-center justify-center rounded-2xl"
        style={{ background: accentVar[card.accent] }}
      >
        <Icon className="h-10 w-10 text-foreground/50" strokeWidth={1.5} />
      </div>

      <div className="flex flex-1 flex-col p-3 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold tracking-tight text-foreground">
            {card.title}
          </h3>
          <span className="shrink-0 rounded-full bg-foreground/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/60">
            {card.meta}
          </span>
        </div>
        <p className="mb-4 flex-1 text-sm text-foreground/60">{card.description}</p>

        <button
          type="button"
          className="clay-btn flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
        >
          <span>{ctaLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}