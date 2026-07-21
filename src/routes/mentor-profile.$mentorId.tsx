import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, BadgeCheck, Trophy, Building2, BookMarked, Star, Layers3 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import { VideoPlayer } from "@/components/clay-video-player";
import { getPublicMentorFullProfile } from "@/server-functions/batch-hub";

export const Route = createFileRoute("/mentor-profile/$mentorId")({
  component: MentorProfilePage,
});

type Mentor = {
  id: string;
  name: string;
  profilePictureUrl: string | null;
  aboutText: string;
  yearOfStudy: string;
  introVideoUrl: string | null;
  aiimsIitRank: string;
  enrolledCollege: string;
  pursuedCourse: string;
  avgRating: number | null;
  reviewCount: number;
};

type Batch = { id: string; name: string; track: string; thumbnailUrl: string | null };

function MentorProfilePage() {
  const { mentorId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const { mentor: m, batches: b } = await getPublicMentorFullProfile({ data: { token, mentorId } });
      if (!m) {
        setNotFound(true);
        return;
      }
      setMentor(m);
      setBatches(b);
    })();
  }, [user, mentorId]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  const lockedItems = mentor
    ? [
        { icon: Trophy, label: "AIIMS / IIT Rank", value: mentor.aiimsIitRank },
        { icon: Building2, label: "College", value: mentor.enrolledCollege },
        { icon: BookMarked, label: "Course", value: mentor.pursuedCourse },
      ].filter((i) => i.value?.trim())
    : [];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-60 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--teal-soft)] opacity-60 blur-3xl" />
      </div>

      <AppHeader user={user} />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/60 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {notFound ? (
          <div className="clay p-8 text-center text-sm text-foreground/60">Mentor not found.</div>
        ) : !mentor ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="clay p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="clay-inset flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  {mentor.profilePictureUrl ? (
                    <img src={mentor.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-2xl font-bold text-foreground/50">
                      {mentor.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {mentor.name}
                    </h1>
                    <BadgeCheck className="h-5 w-5 shrink-0 fill-[var(--sky-deep)] text-white" />
                  </div>
                  {mentor.yearOfStudy && <p className="text-sm text-foreground/50">{mentor.yearOfStudy}</p>}
                  {mentor.avgRating !== null && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-[var(--sky-deep)] text-[var(--sky-deep)]" />
                      <span className="text-sm font-semibold text-foreground">{mentor.avgRating}</span>
                      <span className="text-xs text-foreground/40">({mentor.reviewCount} reviews)</span>
                    </div>
                  )}
                </div>
              </div>

              {mentor.aboutText && (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/70">
                  {mentor.aboutText}
                </p>
              )}

              {mentor.introVideoUrl && (
                <div className="mt-4">
                  <VideoPlayer src={mentor.introVideoUrl} />
                </div>
              )}

              {lockedItems.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {lockedItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="clay-inset px-3.5 py-3">
                        <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
                          <Icon className="h-3 w-3" />
                          {item.label}
                        </div>
                        <p className="truncate text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="clay p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-foreground/60" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/60">
                  Batches taught by {mentor.name}
                </h2>
              </div>
              {batches.length === 0 ? (
                <p className="text-sm text-foreground/60">Not currently assigned to any batch.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {batches.map((b) => (
                    <Link
                      key={b.id}
                      to="/course/$kind/$id"
                      params={{ kind: "mentorship", id: b.id }}
                      className="clay-inset flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-foreground/5"
                    >
                      <div className="clay flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                        {b.thumbnailUrl ? (
                          <img src={b.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Layers3 className="h-4 w-4 text-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                        <p className="text-xs text-foreground/50">{b.track}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}