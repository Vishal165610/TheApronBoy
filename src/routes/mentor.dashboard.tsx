import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  GraduationCap,
  User,
  Megaphone,
  CalendarClock,
  MessageSquare,
  LifeBuoy,
  LogOut,
} from "lucide-react";
import { getMentorSession } from "@/server-functions/mentor-auth";
import { MentorProfileModule } from "@/components/mentor-profile-module";
import { MentorAnnouncementModule } from "@/components/mentor-announcement-module";
import { MentorSchedulerModule } from "@/components/mentor-scheduler-module";
import { MentorChatModule } from "@/components/mentor-chat-module";
import { MentorSupportModule } from "@/components/mentor-support-module";
import { Library } from "lucide-react";
import { MentorLectureLibraryModule } from "@/components/mentor-lecture-library-module";

type ModuleKey = "profile" | "announcements" | "scheduler" | "chat" | "support" | "library";

const MODULES: { key: ModuleKey; label: string; icon: typeof User }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "scheduler", label: "Live Sessions", icon: CalendarClock },
  { key: "library", label: "Lecture Library", icon: Library },
  { key: "chat", label: "Chat Desk", icon: MessageSquare },
  { key: "support", label: "Help Desk", icon: LifeBuoy },
];

export const Route = createFileRoute("/mentor/dashboard")({
  head: () => ({
    meta: [
      { title: "Mentor Portal · Edurack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MentorDashboardPage,
});

const MENTOR_SESSION_KEY = "mentor_session_token";

type MentorIdentity = {
  id: string;
  name: string;
  username: string;
  profilePictureUrl: string | null;
};

function MentorDashboardPage() {
  const navigate = useNavigate();
  const [mentorToken, setMentorToken] = useState<string | null>(null);
  const [mentor, setMentor] = useState<MentorIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<ModuleKey>("profile");

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem(MENTOR_SESSION_KEY);
      if (!token) {
        navigate({ to: "/admin/auth" });
        return;
      }
      try {
        const { mentor: m } = await getMentorSession({ data: { token } });
        setMentor(m);
        setMentorToken(token);
      } catch {
        // Token expired, tampered with, or the mentor account no longer
        // exists — clear it and bounce back to sign-in rather than getting
        // stuck on a dashboard that can never load.
        localStorage.removeItem(MENTOR_SESSION_KEY);
        navigate({ to: "/admin/auth" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSignOut() {
    localStorage.removeItem(MENTOR_SESSION_KEY);
    navigate({ to: "/admin/auth" });
  }

  if (loading || !mentorToken || !mentor) {
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
        <div className="mb-2 flex items-center gap-2 px-1 sm:px-2">
          <div className="clay flex h-9 w-9 shrink-0 items-center justify-center">
            <GraduationCap className="h-4 w-4 text-foreground/70" />
          </div>
          <span className="hidden font-display text-sm font-bold tracking-tight text-foreground sm:inline">
            Mentor Portal
          </span>
        </div>

        <div className="mb-4 hidden items-center gap-2 rounded-2xl bg-foreground/5 px-2.5 py-2 sm:flex">
          <div className="clay-inset flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {mentor.profilePictureUrl ? (
              <img src={mentor.profilePictureUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-foreground/50">
                {mentor.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{mentor.name}</p>
            <p className="truncate text-[10px] text-foreground/50">@{mentor.username}</p>
          </div>
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
          {activeModule === "profile" && <MentorProfileModule mentorToken={mentorToken} />}
          {activeModule === "announcements" && <MentorAnnouncementModule mentorToken={mentorToken} />}
          {activeModule === "scheduler" && <MentorSchedulerModule mentorToken={mentorToken} />}
          {activeModule === "library" && <MentorLectureLibraryModule mentorToken={mentorToken} />}
          {activeModule === "chat" && <MentorChatModule mentorToken={mentorToken} />}
          {activeModule === "support" && <MentorSupportModule mentorToken={mentorToken} />}
        </div>
      </main>
    </div>
  );
}