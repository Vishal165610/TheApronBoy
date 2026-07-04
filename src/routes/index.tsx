import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  X,
  MonitorPlay,
  LayoutDashboard,
  CalendarCheck,
  LineChart,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { CbtSimulator } from "@/components/landing/CbtSimulator";

export const Route = createFileRoute("/")({
  component: Index,
});

const navLinks = [
  { label: "Simulator", href: "#simulator" },
  { label: "Features", href: "#features" },
  { label: "Mentors", href: "#features" },
  { label: "Pricing", href: "#" },
];

function Index() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <SimulatorSection />
        <FeaturesGrid />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="clay-sm mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#" className="flex items-center gap-2 min-w-0">
          <img
            src="https://yt3.googleusercontent.com/qdo1xrlhfa82iLMS4yqWLJtgFt4-jizxXkvR_6HuYzYIv65nN0zg3-J3YDEwRK405xh_ASSgtQ=s160-c-k-c0x00ffffff-no-rj"
            alt="The Apron Boy"
            className="h-8 w-auto shrink-0"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.replaceWith(Object.assign(document.createElement("span"), { className: "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500 text-white font-bold", textContent: "A" }));
            }}
          />
          <span className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
            The Apron Boy
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/60"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/auth" className="clay-btn-ghost px-5 py-2 text-sm font-semibold">Login</Link>
          <Link to="/auth" className="clay-btn px-5 py-2 text-sm font-semibold">Sign Up</Link>
        </div>

        <button
          className="clay-btn-ghost grid h-10 w-10 place-items-center md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="clay-sm mx-auto mt-2 max-w-7xl p-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white/70"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/auth" onClick={() => setOpen(false)} className="clay-btn-ghost px-4 py-2.5 text-center text-sm font-semibold">Login</Link>
              <Link to="/auth" onClick={() => setOpen(false)} className="clay-btn px-4 py-2.5 text-center text-sm font-semibold">Sign Up</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pt-24">
      <div className="mx-auto max-w-5xl text-center">
        <div className="clay-chip mx-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-sky-700 sm:text-sm">
          <Sparkles className="h-4 w-4" />
          NEET 2026 CBT Alert
        </div>
        <h1 className="fluid-h1 mt-6 font-display font-extrabold tracking-tight text-slate-900">
          NEET is officially shifting to{" "}
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-br from-sky-600 to-teal-500 bg-clip-text text-transparent">
              Computer Based Testing
            </span>
          </span>
          . Are you ready for the screen?
        </h1>
        <p className="fluid-body mx-auto mt-6 max-w-2xl text-slate-600">
          Don't let the exam day layout shock you. The Apron Boy delivers an absolute
          <b className="text-slate-800"> 1:1 exact NTA replica</b> test engine interface so you
          practice in the real environment before the final day.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth" className="clay-btn group inline-flex items-center gap-2 px-7 py-4 text-base font-bold sm:text-lg">
            Try Free Mock Test
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#simulator" className="clay-btn-ghost px-6 py-4 text-sm font-semibold sm:text-base">
            See the engine
          </a>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3 sm:mx-auto sm:max-w-xl">
          {[
            { k: "1:1", v: "NTA Replica" },
            { k: "50k+", v: "Aspirants" },
            { k: "4.9★", v: "Rating" },
          ].map((s) => (
            <div key={s.k} className="clay-sm px-3 py-4">
              <div className="font-display text-xl font-bold text-slate-900 sm:text-2xl">{s.k}</div>
              <div className="text-xs text-slate-500 sm:text-sm">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SimulatorSection() {
  return (
    <section id="simulator" className="px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl text-center">
        <div className="clay-chip inline-flex px-4 py-1.5 text-xs font-semibold text-teal-700">
          THE NTA CBT ENGINE
        </div>
        <h2 className="fluid-h2 mx-auto mt-4 max-w-3xl font-display font-extrabold text-slate-900">
          Not a clone. A pixel-exact replica of the real exam.
        </h2>
        <p className="fluid-body mx-auto mt-3 max-w-2xl text-slate-600">
          Same header. Same orange subject bar. Same right-side palette. Same button behaviour.
          Muscle-memory built weeks before D-day.
        </p>
      </div>
      <div className="mt-10">
        <CbtSimulator />
      </div>
    </section>
  );
}

const features = [
  {
    icon: MonitorPlay,
    title: "1:1 NTA Replica Simulator",
    desc: "Every pixel, shortcut and status color mirrors the real NTA CBT interface.",
    color: "text-sky-600",
    bg: "bg-sky-100",
  },
  {
    icon: LayoutDashboard,
    title: "Smart Dashboards",
    desc: "Dedicated tracks for Droppers, Class 11 and Class 12 with syllabus-aware planning.",
    color: "text-teal-600",
    bg: "bg-teal-100",
  },
  {
    icon: CalendarCheck,
    title: "Dual Mentor Ecosystem",
    desc: "Book 1:1s directly via Google Calendar with auto-generated Google Meet links.",
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  {
    icon: LineChart,
    title: "Deep Performance Analytics",
    desc: "Chapter-level accuracy, time-per-question and rank projections after every test.",
    color: "text-purple-600",
    bg: "bg-purple-100",
  },
];

function FeaturesGrid() {
  return (
    <section id="features" className="px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="clay-chip inline-flex px-4 py-1.5 text-xs font-semibold text-sky-700">
            WHY THE APRON BOY
          </div>
          <h2 className="fluid-h2 mt-4 font-display font-extrabold text-slate-900">
            Everything a serious NEET aspirant actually needs.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="clay group p-6 transition-transform hover:-translate-y-1">
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ${f.bg}`}>
                <f.icon className={`h-7 w-7 ${f.color}`} />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="clay mt-16 grid grid-cols-1 items-center gap-6 p-8 md:grid-cols-[1fr_auto] md:p-12">
          <div>
            <h3 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Start your first mock in under 60 seconds.
            </h3>
            <p className="mt-2 text-slate-600">No credit card. No commitments. Just the real thing.</p>
          </div>
          <button className="clay-btn inline-flex items-center gap-2 px-7 py-4 text-base font-bold justify-self-start md:justify-self-end">
            Try Free Mock Test <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-4 pb-8 pt-10 sm:px-6">
      <div className="clay-sm mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <img src="https://yt3.googleusercontent.com/qdo1xrlhfa82iLMS4yqWLJtgFt4-jizxXkvR_6HuYzYIv65nN0zg3-J3YDEwRK405xh_ASSgtQ=s160-c-k-c0x00ffffff-no-rj" alt="" className="h-7 w-auto" onError={(e)=>((e.currentTarget as HTMLImageElement).style.display='none')} />
              <span className="font-display text-lg font-bold">The Apron Boy</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">Made by medicos, for medicos.</p>
          </div>
          <FooterCol title="Product" items={["Simulator", "Dashboards", "Analytics", "Mentors"]} />
          <FooterCol title="Company" items={["About", "Blog", "Careers", "Contact"]} />
          <FooterCol title="Legal" items={["Terms", "Privacy", "Refund", "Cookies"]} />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-5 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} The Apron Boy. All rights reserved.</span>
          <span>Built for NEET 2026 CBT aspirants.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="font-display text-sm font-bold text-slate-900">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map((i) => (
          <li key={i}>
            <a href="#" className="hover:text-slate-900">{i}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
