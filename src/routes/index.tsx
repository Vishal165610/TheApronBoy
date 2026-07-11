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
  { label: "CBT Simulator", href: "#simulator" },
  { label: "Features", href: "#features" },
  { label: "AIIMS Mentors", href: "#features" },
  { label: "Test Series", href: "#" },
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
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white font-bold font-display text-lg shadow-sm">
            E
          </span>
          <span className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
            EDURACK
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
          <Sparkles className="h-4 w-4 animate-pulse" />
          NEET 2027 CBT Transition Update
        </div>
        <h1 className="fluid-h1 mt-6 font-display font-extrabold tracking-tight text-slate-900">
          NEET is shifting to{" "}
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-br from-sky-600 to-teal-500 bg-clip-text text-transparent">
              Computer Based Testing
            </span>
          </span>
          . Master the screen early.
        </h1>
        <p className="fluid-body mx-auto mt-6 max-w-2xl text-slate-600">
          Don't let the sudden shift to digital layout break your focus. EDURACK provides a 
          <b className="text-slate-800"> 1:1 pixel-exact NTA replica</b> test simulator paired with elite 
          mentorship from top AIIMS rankers.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth" className="clay-btn group inline-flex items-center gap-2 px-7 py-4 text-base font-bold sm:text-lg">
            Start Free CBT Mock Test
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#simulator" className="clay-btn-ghost px-6 py-4 text-sm font-semibold sm:text-base">
            Explore Simulator
          </a>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3 sm:mx-auto sm:max-w-xl">
          {[
            { k: "1:1", v: "CBT Interface" },
            { k: "100%", v: "AIIMS Mentors" },
            { k: "2027", v: "Format Ready" },
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
          THE EDURACK TESTING ENGINE
        </div>
        <h2 className="fluid-h2 mx-auto mt-4 max-w-3xl font-display font-extrabold text-slate-900">
          Train your muscle memory for the digital shift.
        </h2>
        <p className="fluid-body mx-auto mt-3 max-w-2xl text-slate-600">
          Same right-side question palette, identical navigation flags, and exact section indicators. 
          Eliminate digital exam anxiety months before you step into the test center.
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
    title: "1:1 NTA CBT Engine",
    desc: "Every shortcut, color state, and layout design precisely mirrors the upcoming digital format.",
    color: "text-sky-600",
    bg: "bg-sky-100",
  },
  {
    icon: LayoutDashboard,
    title: "Syllabus-Driven Trackers",
    desc: "Tailored structures for Class 11, 12, and Droppers to pace out high-weightage topics.",
    color: "text-teal-600",
    bg: "bg-teal-100",
  },
  {
    icon: CalendarCheck,
    title: "Elite AIIMS Mentorship",
    desc: "Direct 50-50 revenue split model brings you raw strategies from students who actually conquered the paper.",
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  {
    icon: LineChart,
    title: "Screen Analytics",
    desc: "Tracks your speed per question, subject-wise accuracy, and projected multi-shift normalized percentile.",
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
            THE EDURACK ADVANTAGE
          </div>
          <h2 className="fluid-h2 mt-4 font-display font-extrabold text-slate-900">
            Built for serious aspirants tackling the new pattern.
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
              Launch your first CBT mock right now.
            </h3>
            <p className="mt-2 text-slate-600">Get ahead of the curve before the official 2027 transition hits.</p>
          </div>
          <Link to="/auth" className="clay-btn inline-flex items-center gap-2 px-7 py-4 text-base font-bold justify-self-start md:justify-self-end">
            Try Free Mock Test <ArrowRight className="h-5 w-5" />
          </Link>
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
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-sky-600 to-teal-500 text-white font-bold font-display text-xs">
                E
              </span>
              <span className="font-display text-lg font-bold">EDURACK</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">The next-gen CBT testing and mentorship platform.</p>
          </div>
          <FooterCol title="Product" items={["CBT Simulator", "Syllabus Trackers", "Analytics", "Mentors"]} />
          <FooterCol title="Aspirants" items={["NEET Hub", "JEE Hub (Coming Soon)", "Free Papers", "Success Stories"]} />
          <FooterCol title="Legal" items={["Terms", "Privacy", "Refund", "Contact"]} />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-5 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} EDURACK. All rights reserved.</span>
          <span>Engineered for the NEET 2027 CBT Shift.</span>
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