import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  BookOpen,
  Users2,
  Calendar,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Star,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getProfile } from "@/server-functions/profile";
import { listPublicBundles, listPublicMentorshipBatches, listPublicMentors } from "@/server-functions/catalog";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type Track = "Dropper" | "11th" | "12th" | "";
type TrackFilter = "All" | "Dropper" | "11th" | "12th";

type StudentProfile = {
  fullName: string;
  targetExam: string;
  track: Track;
};

type Bundle = {
  id: string;
  title: string;
  track: string;
  features: string[];
  sellingPrice: number;
  crossedPrice: number;
  discountPercent: number;
  expiryDate: string;
  thumbnailUrl: string | null;
};

type MentorshipBatch = {
  id: string;
  name: string;
  track: string;
  highlights: string[];
  sellingPrice: number;
  crossedPrice: number;
  discountPercent: number;
  thumbnailUrl: string | null;
  mentorName: string | null;
};

type MentorDirectoryEntry = {
  id: string;
  name: string;
  profilePictureUrl: string | null;
  yearOfStudy: string;
  aboutText: string;
  avgRating: number | null;
  reviewCount: number;
  batches: { id: string; name: string; track: string }[];
  searchText: string;
};

// A normalized shape both bundles and mentorship batches map into, so a
// single card component and a single search/filter pass can handle both.
type Listing = {
  id: string;
  kind: "Test Series" | "Mentorship";
  title: string;
  track: string;
  thumbnailUrl: string | null;
  sellingPrice: number;
  crossedPrice: number;
  discountPercent: number;
  metaLines: { icon: typeof Calendar; text: string }[];
  searchText: string;
};

function bundleToListing(b: Bundle): Listing {
  return {
    id: b.id,
    kind: "Test Series",
    title: b.title,
    track: b.track,
    thumbnailUrl: b.thumbnailUrl,
    sellingPrice: b.sellingPrice,
    crossedPrice: b.crossedPrice,
    discountPercent: b.discountPercent,
    metaLines: [
      { icon: BookOpen, text: b.features[0] ?? "NEET test series" },
      { icon: Calendar, text: `Access until ${new Date(b.expiryDate).toLocaleDateString()}` },
    ],
    searchText: `${b.title} ${b.track} ${b.features.join(" ")}`.toLowerCase(),
  };
}

function batchToListing(b: MentorshipBatch): Listing {
  return {
    id: b.id,
    kind: "Mentorship",
    title: b.name,
    track: b.track,
    thumbnailUrl: b.thumbnailUrl,
    sellingPrice: b.sellingPrice,
    crossedPrice: b.crossedPrice,
    discountPercent: b.discountPercent,
    metaLines: [
      { icon: Users2, text: b.mentorName ? `Mentor: ${b.mentorName}` : "Mentor: unassigned" },
      { icon: BookOpen, text: b.highlights[0] ?? "1:1 mentorship" },
    ],
    searchText: `${b.name} ${b.track} ${b.highlights.join(" ")} ${b.mentorName ?? ""}`.toLowerCase(),
  };
}

const TRACK_FILTERS: TrackFilter[] = ["All", "Dropper", "11th", "12th"];

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [batches, setBatches] = useState<MentorshipBatch[] | null>(null);
  const [mentors, setMentors] = useState<MentorDirectoryEntry[] | null>(null);
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("All");
  const [mentorSearch, setMentorSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const [{ profile: p }, { bundles: bundleRows }, { batches: batchRows }, { mentors: mentorRows }] = await Promise.all([
        getProfile({ data: { token } }),
        listPublicBundles({ data: { token } }),
        listPublicMentorshipBatches({ data: { token } }),
        listPublicMentors({ data: { token } }),
      ]);
      if (p) {
        setProfile({
          fullName: p.fullName,
          targetExam: p.targetExam || "NEET",
          track: (p.track as Track) || "",
        });
      }
      setBundles(bundleRows as Bundle[]);
      setBatches(batchRows as MentorshipBatch[]);
      setMentors(mentorRows as MentorDirectoryEntry[]);
    })();
  }, [user]);

  const allListings = useMemo(() => {
    if (!bundles || !batches) return null;
    return [...bundles.map(bundleToListing), ...batches.map(batchToListing)];
  }, [bundles, batches]);

  const track = profile?.track ?? "";

  // "Recommended for you" always matches the student's own track and
  // ignores search/filter — it's the default, no-effort view.
  const recommended = useMemo(() => {
    if (!allListings || !track) return [];
    return allListings.filter((l) => l.track === track);
  }, [allListings, track]);

  // "Browse all batches" is the free-roam section — search and track filter
  // both apply here, so a Dropper curious about 11th/12th offerings (or
  // vice versa) can look around freely instead of being locked to their
  // own track.
  const browsed = useMemo(() => {
    if (!allListings) return [];
    const q = search.trim().toLowerCase();
    return allListings.filter((l) => {
      const matchesTrack = trackFilter === "All" || l.track === trackFilter;
      const matchesSearch = !q || l.searchText.includes(q);
      return matchesTrack && matchesSearch;
    });
  }, [allListings, search, trackFilter]);

  // Mentor search only filters when the student actually types something —
  // an empty query shows nothing rather than dumping the whole directory,
  // since this section is meant for "I'm looking for a specific mentor",
  // distinct from casually browsing batches below.
  const matchedMentors = useMemo(() => {
    if (!mentors) return [];
    const q = mentorSearch.trim().toLowerCase();
    if (!q) return [];
    return mentors.filter((m) => m.searchText.includes(q));
  }, [mentors, mentorSearch]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-70 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--teal-soft)] opacity-70 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-[var(--mint-soft)] opacity-60 blur-3xl" />
      </div>

      <AppHeader user={user} displayName={profile?.fullName} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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

        {track && (
          <section className="mb-12">
            <div className="mb-5">
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Recommended for {track}
              </h2>
              <p className="mt-1 text-sm text-foreground/60">
                Test series and mentorships matched to your category.
              </p>
            </div>

            {allListings === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
              </div>
            ) : recommended.length === 0 ? (
              <div className="clay p-6 text-center text-sm text-foreground/60">
                Nothing published for {track} yet — check "Browse all batches" below.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {recommended.map((l) => (
                  <ListingCard key={`${l.kind}-${l.id}`} listing={l} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mb-12">
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Search Mentors
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              Looking for a specific mentor? Search by name, batch, or what they teach.
            </p>
          </div>

          <div className="clay-inset mb-5 flex items-center gap-2 rounded-full px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-foreground/40" />
            <input
              value={mentorSearch}
              onChange={(e) => setMentorSearch(e.target.value)}
              placeholder="Search mentors by name…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
            />
          </div>

          {mentors === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
            </div>
          ) : !mentorSearch.trim() ? (
            <div className="clay-inset rounded-2xl p-6 text-center text-sm text-foreground/50">
              Start typing to find a mentor.
            </div>
          ) : matchedMentors.length === 0 ? (
            <div className="clay p-6 text-center text-sm text-foreground/60">
              No mentors match "{mentorSearch}".
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {matchedMentors.map((m) => (
                <MentorCard key={m.id} mentor={m} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Browse all batches
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              Curious what other tracks offer? Search or filter — nothing here is locked to your category.
            </p>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="clay-inset flex flex-1 items-center gap-2 rounded-full px-4 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-foreground/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search test series, mentorships, mentors…"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TRACK_FILTERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrackFilter(t)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    trackFilter === t ? "clay-btn text-white" : "clay-chip text-foreground/70"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {allListings === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
            </div>
          ) : browsed.length === 0 ? (
            <div className="clay p-8 text-center text-sm text-foreground/60">
              No batches match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {browsed.map((l) => (
                <ListingCard key={`${l.kind}-${l.id}`} listing={l} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MentorCard({ mentor }: { mentor: MentorDirectoryEntry }) {
  return (
    <Link to="/mentor-profile/$mentorId" params={{ mentorId: mentor.id }} className="clay flex gap-4 p-4 transition hover:bg-foreground/5">
      <div className="clay-inset flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full">
        {mentor.profilePictureUrl ? (
          <img src={mentor.profilePictureUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-lg font-bold text-foreground/50">{mentor.name.charAt(0)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display text-sm font-bold text-foreground">{mentor.name}</p>
          <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-[var(--sky-deep)] text-white" />
        </div>
        {mentor.yearOfStudy && <p className="text-xs text-foreground/50">{mentor.yearOfStudy}</p>}
        {mentor.avgRating !== null && (
          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3 w-3 fill-[var(--sky-deep)] text-[var(--sky-deep)]" />
            <span className="text-xs font-semibold text-foreground">{mentor.avgRating}</span>
            <span className="text-[10px] text-foreground/40">({mentor.reviewCount})</span>
          </div>
        )}
        {mentor.batches.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-foreground/60">
            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
            <span className="truncate">
              {mentor.batches.length === 1 ? mentor.batches[0].name : `${mentor.batches.length} batches`}
            </span>
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 self-center text-foreground/30" />
    </Link>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const navigate = useNavigate();
  const routeKind = listing.kind === "Test Series" ? "bundle" : "mentorship";

  function goToDetail() {
    navigate({ to: "/course/$kind/$id", params: { kind: routeKind, id: listing.id } });
  }

  return (
    <div className="clay flex flex-col overflow-hidden p-3">
      <div className="clay-inset relative flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-[var(--sky-soft)]">
        {listing.thumbnailUrl ? (
          <img src={listing.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : listing.kind === "Test Series" ? (
          <BookOpen className="h-10 w-10 text-foreground/40" strokeWidth={1.5} />
        ) : (
          <Users2 className="h-10 w-10 text-foreground/40" strokeWidth={1.5} />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground/70 shadow-sm">
          {listing.track || "All tracks"}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground/70 shadow-sm">
          {listing.kind}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3 pt-4">
        <h3 className="mb-2 font-display text-base font-bold tracking-tight text-foreground">
          {listing.title}
        </h3>

        <div className="mb-4 space-y-1.5">
          {listing.metaLines.map((line, i) => {
            const Icon = line.icon;
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/60">
                <Icon className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                <span className="truncate">{line.text}</span>
              </div>
            );
          })}
        </div>

        <div className="mb-3 flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-foreground">
            ₹{listing.sellingPrice.toLocaleString()}
          </span>
          {listing.crossedPrice > listing.sellingPrice && (
            <span className="text-sm text-foreground/40 line-through">
              ₹{listing.crossedPrice.toLocaleString()}
            </span>
          )}
          {listing.discountPercent > 0 && (
            <span className="text-xs font-semibold text-[var(--sky-deep)]">
              {listing.discountPercent}% OFF
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToDetail}
            className="clay-btn flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
          >
            <span>Buy Now</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="View details"
            onClick={goToDetail}
            className="clay-btn-ghost flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

