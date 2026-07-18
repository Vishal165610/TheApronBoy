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
  Play,
  UserCheck,
  Cpu,
  TrendingUp,
} from "lucide-react";
import { CbtSimulator } from "@/components/landing/CbtSimulator";

export const Route = createFileRoute("/")({
  component: Index,
});

// Path to the platform's official logo asset. Update once the final
// exported .png is dropped into /public/assets/branding.
const LOGO_SRC = "/assets/branding/edurack-logo.png";

// ---------------------------------------------
// Navigation config
// ---------------------------------------------
// `anchor` items scroll within the landing page itself.
// `route` items navigate to a distinct TanStack Router route.

type NavLink =
  | { label: string; type: "anchor"; href: string }
  | { label: string; type: "route"; to: string };

const navLinks: NavLink[] = [
  { label: "CBT Simulator", type: "anchor", href: "#simulator" },
  { label: "Mentors", type: "anchor", href: "#mentors" },
  { label: "Features", type: "anchor", href: "#features" },
  { label: "Join as Mentor", type: "anchor", href: "#marketplace" },
  { label: "Contact", type: "route", to: "/contact" },
];

function Index() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <SimulatorSection />
        <MentorVideoShowcase />
        <FeaturesGrid />
        <MarketplaceBanner />
      </main>
      <Footer />
    </div>
  );
}

function NavItem({ link, onClick }: { link: NavLink; className?: string; onClick?: () => void }) {
  const className = "rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/60";

  if (link.type === "route") {
    return (
      <Link to={link.to} onClick={onClick} className={className}>
        {link.label}
      </Link>
    );
  }

  return (
    <a href={link.href} onClick={onClick} className={className}>
      {link.label}
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="clay-sm mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src={LOGO_SRC}
            alt="EDURACK"
            className="h-9 w-auto shrink-0"
            width={36}
            height={36}
          />
          <span className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
            EDURACK
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <NavItem key={l.label} link={l} />
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
              <NavItem
                key={l.label}
                link={l}
                onClick={() => setOpen(false)}
              />
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
          mentorship spaces created directly by top AIIMS rankers.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/simulator/live" className="clay-btn group inline-flex items-center gap-2 px-7 py-4 text-base font-bold sm:text-lg">
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
            { k: "Open", v: "Mentor Market" },
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

function MentorVideoShowcase() {
  // Replace placeholders with video player configurations or embed links as needed
  const sampleVideos = [
    { name: "Rahul Jha", rank: "AIR 14 · AIIMS Delhi", topic: "CBT Strategy" },
    { name: "Sneha Reddy", rank: "AIR 35 · AIIMS Rishikesh", topic: "Physics Screen Stamina" },
    { name: "Aman Verma", rank: "AIR 89 · AIIMS Bhopal", topic: "Organic Chemistry Hack" },
  ];

  return (
    <section id="mentors" className="px-4 py-16 sm:px-6 lg:py-24 bg-slate-50/50">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <div className="clay-chip inline-flex px-4 py-1.5 text-xs font-semibold text-orange-700">
            LEARN FROM THE BEST
          </div>
          <h2 className="fluid-h2 mt-4 font-display font-extrabold text-slate-900">
            Direct Guidance From Top AIIMS Rankers
          </h2>
          <p className="fluid-body mt-3 text-slate-600">
            Hear straight from the mentors who successfully navigated the competitive pressure. Watch their high-yield preparation tips below.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sampleVideos.map((v, i) => (
            <div key={i} className="clay overflow-hidden p-4 flex flex-col justify-between">
              {/* Video container container wrapper */}
              <div className="relative aspect-video w-full rounded-2xl bg-slate-900 grid place-items-center group cursor-pointer shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
                <button 
                  className="z-20 h-14 w-14 rounded-full bg-white/90 dynamic-blur grid place-items-center shadow-md transition-transform group-hover:scale-110"
                  aria-label={`Play strategy video by ${v.name}`}
                >
                  <Play className="h-6 w-6 text-sky-600 fill-sky-600 ml-0.5" />
                </button>
                <span className="absolute bottom-3 left-4 z-20 text-xs font-bold text-white tracking-wide uppercase bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-md">
                  {v.topic}
                </span>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-900">{v.name}</h3>
                  <p className="text-xs font-medium text-slate-500">{v.rank}</p>
                </div>
                <Link to="/auth" className="clay-btn-ghost px-4 py-2 text-xs font-bold">
                  View Space
                </Link>
              </div>
            </div>
          ))}
        </div>
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
    title: "Direct Mentor Marketplace",
    desc: "Browse premium batches listed directly by top-tier creators at their own customized rates.",
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
          <Link to="/simulator/live" className="clay-btn inline-flex items-center gap-2 px-7 py-4 text-base font-bold justify-self-start md:justify-self-end">
            Try Free Mock Test <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function MarketplaceBanner() {
  return (
    <section id="marketplace" className="px-4 pb-20 sm:px-6 lg:pb-28">
      <div className="mx-auto max-w-6xl clay bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 md:p-14 rounded-3xl relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-15 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold tracking-wide text-teal-300">
            <UserCheck className="h-3.5 w-3.5" />
            Are you an AIIMS Student or Med-Creator?
          </div>
          <h2 className="text-3xl font-display font-extrabold tracking-tight mt-4 sm:text-4xl text-white">
            Monetize your expertise. Run your own mentorship store on EDURACK.
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Stop dealing with unorganized tracking spreadsheets, structural setup barriers, or manual group entry confirmations. Set your fixed price tiers, deliver premium guidance schedules, and let our automated payment configuration process your withdrawals seamlessly.
          </p>
          
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/join-mentor" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-br from-sky-500 to-teal-400 text-slate-950 text-sm font-bold shadow-md hover:opacity-95 transition">
              Create Mentor Space <Cpu className="h-4 w-4" />
            </Link>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition">
              Follow Corporate Updates <TrendingUp className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------
// Footer
// ---------------------------------------------

type FooterLink =
  | { label: string; type: "route"; to: string }
  | { label: string; type: "external"; href: string };

const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "CBT Simulator", type: "route", to: "/simulator/live" },
      { label: "Syllabus Trackers", type: "route", to: "/dashboard" },
      { label: "Analytics", type: "route", to: "/dashboard" },
      { label: "Mentors", type: "route", to: "/join-mentor" },
    ],
  },
  {
    title: "Aspirants",
    links: [
      { label: "NEET Hub", type: "route", to: "/" },
      { label: "Free Papers", type: "route", to: "/simulator/live" },
      { label: "Contact Us", type: "route", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", type: "route", to: "/legal/terms" },
      { label: "Privacy", type: "route", to: "/legal/privacy" },
      { label: "Refund", type: "route", to: "/legal/refund" },
      { label: "Contact", type: "route", to: "/contact" },
    ],
  },
];

function Footer() {
  return (
    <footer className="px-4 pb-8 pt-10 sm:px-6">
      <div className="clay-sm mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img
                src={LOGO_SRC}
                alt="EDURACK"
                className="h-7 w-auto shrink-0"
                width={28}
                height={28}
              />
              <span className="font-display text-lg font-bold">EDURACK</span>
            </Link>
            <p className="mt-3 text-sm text-slate-600">The next-gen CBT testing and mentorship platform.</p>
          </div>
          {footerColumns.map((col) => (
            <FooterCol key={col.title} title={col.title} links={col.links} />
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-5 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} EDURACK. All rights reserved.</span>
          <span>Engineered for the NEET 2027 CBT Shift.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <div className="font-display text-sm font-bold text-slate-900">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {links.map((l) => (
          <li key={l.label}>
            {l.type === "route" ? (
              <Link to={l.to} className="hover:text-slate-900">{l.label}</Link>
            ) : (
              <a href={l.href} target="_blank" rel="noreferrer" className="hover:text-slate-900">{l.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}