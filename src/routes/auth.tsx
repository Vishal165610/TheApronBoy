import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, Loader2, Mail, Lock, User, Phone, MapPin, GraduationCap, Target, Sparkles } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import { auth, firebaseSignIn, firebaseSignUp, googleAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getDeviceId, getDeviceLabel } from "@/lib/device";
import { ensureUserRecord, getProfile, needsOnboarding, saveProfile } from "@/server-functions/profile";
import { recordSession } from "@/server-functions/sessions";
import { sendEmailVerificationOtp, verifyEmailVerificationOtp } from "@/server-functions/email-verification";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Edurack" },
      { name: "description", content: "Sign in or create your Edurack account to access the NEET CBT engine, smart dashboards and mentor ecosystem." },
      { property: "og:title", content: "Sign in · Edurack" },
      { property: "og:description", content: "Access your NEET prep dashboard on Edurack." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Tab = "signin" | "signup";
type Stage = "auth" | "onboarding" | "checking" | "verify-email";

type OnboardingProfile = {
  fullName: string;
  mobile: string;
  city: string;
  currentClass: string;
  board: string;
  targetExam: string;
  track: "Dropper" | "11th" | "12th" | "";
};

// Runs after ANY successful sign-in or sign-up (email/password or Google):
// 1. Ensures a MongoDB profile document exists (with empty onboarding fields
//    if it's brand new).
// 2. Records/refreshes this browser as a logged-in device.
// 3. Reports back whether onboarding still needs to happen.
async function completeLogin(user: FirebaseUser, provider: "password" | "google.com") {
  const token = await user.getIdToken();

  await ensureUserRecord({ data: { token, provider } });
  await recordSession({
    data: { token, deviceId: getDeviceId(), deviceLabel: getDeviceLabel() },
  });

  const { profile } = await getProfile({ data: { token } });
  return { needsOnboarding: needsOnboarding(profile) };
}

function AuthPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");
  const [stage, setStage] = useState<Stage>("checking");
  const [pendingEmail, setPendingEmail] = useState("");
  const navigate = useNavigate();

  // Already-logged-in users shouldn't see the sign-in form at all. If it's a
  // password account that's never verified its email, send them to the
  // verification screen first — Google accounts skip this since Google
  // already verifies emails on its end.
  useEffect(() => {
    if (loading) return;

    if (!user) {
      setStage("auth");
      return;
    }

    let cancelled = false;
    (async () => {
      await user.reload();
      const isPasswordUser = user.providerData.some((p) => p.providerId === "password");

      if (isPasswordUser && !user.emailVerified) {
        if (cancelled) return;
        setPendingEmail(user.email ?? "");
        setStage("verify-email");
        return;
      }

      const { needsOnboarding: incomplete } = await completeLogin(user, "password");
      if (cancelled) return;
      if (incomplete) {
        setStage("onboarding");
      } else {
        navigate({ to: "/dashboard" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  async function handleVerified() {
    const current = auth.currentUser;
    if (!current) {
      setStage("auth");
      return;
    }
    await current.reload();
    const { needsOnboarding: incomplete } = await completeLogin(current, "password");
    if (incomplete) {
      setStage("onboarding");
    } else {
      navigate({ to: "/dashboard" });
    }
  }

  if (stage === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* soft ambient background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-70 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--teal-soft)] opacity-70 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-[var(--mint-soft)] opacity-60 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        {/* Back link */}
        <div className="mb-6 w-full max-w-xl">
          <Link
            to="/"
            className="clay-chip inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground/80 transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="clay flex h-16 w-16 items-center justify-center p-2">
            <img
              src="https://yt3.googleusercontent.com/qdo1xrlhfa82iLMS4yqWLJtgFt4-jizxXkvR_6HuYzYIv65nN0zg3-J3YDEwRK405xh_ASSgtQ=s160-c-k-c0x00ffffff-no-rj"
              alt="The Apron Boy"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            Edurack
          </p>
        </div>

        {/* Main card */}
        <div className="clay w-full max-w-xl p-5 sm:p-8">
          {stage === "auth" && (
            <AuthCard
              tab={tab}
              setTab={setTab}
              onSignedIn={() => navigate({ to: "/dashboard" })}
              onSignedUp={() => setStage("onboarding")}
              onNeedsVerification={(email) => {
                setPendingEmail(email);
                setStage("verify-email");
              }}
            />
          )}
          {stage === "verify-email" && (
            <EmailVerificationCard email={pendingEmail} onVerified={handleVerified} />
          )}
          {stage === "onboarding" && (
            <OnboardingCard onComplete={() => navigate({ to: "/dashboard" })} />
          )}
        </div>

        <p className="mt-6 max-w-md text-center text-xs text-foreground/60">
          By continuing you agree to our <span className="underline decoration-dotted underline-offset-2">Terms</span> and <span className="underline decoration-dotted underline-offset-2">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

// ─── Auth (Sign In / Sign Up) ────────────────────────────────────────────────
function AuthCard({
  tab,
  setTab,
  onSignedIn,
  onSignedUp,
  onNeedsVerification,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onSignedIn: () => void;
  onSignedUp: () => void;
  onNeedsVerification: (email: string) => void;
}) {
  return (
    <div>
      {/* Heading */}
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {tab === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {tab === "signin"
            ? "Log in to continue your NEET journey."
            : "Start with Google or an email in seconds."}
        </p>
      </div>

      {/* Tab toggle */}
      <div className="clay-inset mx-auto mb-6 grid max-w-sm grid-cols-2 gap-1 p-1">
        <TabButton active={tab === "signin"} onClick={() => setTab("signin")}>Sign In</TabButton>
        <TabButton active={tab === "signup"} onClick={() => setTab("signup")}>Create Account</TabButton>
      </div>

      {tab === "signin" ? (
        <SignInForm onSignedIn={onSignedIn} onSignedUp={onSignedUp} onNeedsVerification={onNeedsVerification} />
      ) : (
        <SignUpForm onSignedIn={onSignedIn} onSignedUp={onSignedUp} onNeedsVerification={onNeedsVerification} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full py-2.5 text-sm font-semibold transition-all " +
        (active
          ? "clay-btn text-white"
          : "text-foreground/70 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function GoogleButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="clay-btn-ghost group flex w-full items-center justify-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground disabled:opacity-70"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <GoogleIcon className="h-5 w-5" />
      )}
      <span>{label}</span>
    </button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.9 1.2 8 3l5.7-5.7C33.9 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.8 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.8 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-foreground/10" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">or</span>
      <div className="h-px flex-1 bg-foreground/10" />
    </div>
  );
}

function ClayInput({
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className="clay-inset flex items-center gap-3 px-4 py-3 transition focus-within:ring-2 focus-within:ring-[var(--sky-deep)]/40">
      {icon && <span className="text-foreground/50">{icon}</span>}
      <input
        {...props}
        className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
      />
    </div>
  );
}

function ClaySelect({
  icon,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { icon?: ReactNode }) {
  return (
    <div className="clay-inset flex items-center gap-3 px-4 py-3 focus-within:ring-2 focus-within:ring-[var(--sky-deep)]/40">
      {icon && <span className="text-foreground/50">{icon}</span>}
      <select
        {...props}
        className="w-full appearance-none bg-transparent text-sm text-foreground focus:outline-none"
      >
        {children}
      </select>
    </div>
  );
}

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 8 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a bit.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function SignInForm({
  onSignedIn,
  onSignedUp,
  onNeedsVerification,
}: {
  onSignedIn: () => void;
  onSignedUp: () => void;
  onNeedsVerification: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await firebaseSignIn(email, password);
      const user = auth.currentUser!;
      await user.reload();

      // Block unverified password accounts here — send a fresh code and
      // route to the verification screen instead of the dashboard.
      if (!user.emailVerified) {
        const token = await user.getIdToken();
        await sendEmailVerificationOtp({ data: { token } });
        onNeedsVerification(user.email ?? email);
        return;
      }

      const { needsOnboarding: incomplete } = await completeLogin(user, "password");
      incomplete ? onSignedUp() : onSignedIn();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await googleAuth();
      const user = auth.currentUser!;
      const { needsOnboarding: incomplete } = await completeLogin(user, "google.com");
      incomplete ? onSignedUp() : onSignedIn();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Sign in with Google" />
      <Divider />

      <div className="space-y-3">
        <ClayInput
          icon={<Mail className="h-4 w-4" />}
          type="email"
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="clay-inset flex items-center gap-3 px-4 py-3 focus-within:ring-2 focus-within:ring-[var(--sky-deep)]/40">
          <Lock className="h-4 w-4 text-foreground/50" />
          <input
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-foreground/50 hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-xs font-semibold text-[var(--sky-deep)] hover:underline">
          Forgot Password?
        </Link>
      </div>

      {error && (
        <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="clay-btn flex w-full items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Login to Dashboard</span><ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}

function SignUpForm({
  onSignedIn,
  onSignedUp,
  onNeedsVerification,
}: {
  onSignedIn: () => void;
  onSignedUp: () => void;
  onNeedsVerification: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await firebaseSignUp(email, password);
      const user = auth.currentUser!;
      const token = await user.getIdToken();

      // Create the Mongo profile placeholder now, but hold off on
      // recordSession/getProfile until after verification — that way we
      // don't register a "logged in device" for an account that can't
      // actually use the dashboard yet.
      await ensureUserRecord({ data: { token, provider: "password" } });
      await sendEmailVerificationOtp({ data: { token } });

      onNeedsVerification(email);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await googleAuth();
      const user = auth.currentUser!;
      const { needsOnboarding: incomplete } = await completeLogin(user, "google.com");
      incomplete ? onSignedUp() : onSignedIn();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Sign up with Google" />
      <Divider />

      <div className="space-y-3">
        <ClayInput
          icon={<Mail className="h-4 w-4" />}
          type="email"
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="clay-inset flex items-center gap-3 px-4 py-3 focus-within:ring-2 focus-within:ring-[var(--sky-deep)]/40">
          <Lock className="h-4 w-4 text-foreground/50" />
          <input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a password (min. 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-foreground/50 hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="clay-btn flex w-full items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}

// ─── Email Verification ──────────────────────────────────────────────────────
function EmailVerificationCard({ email, onVerified }: { email: string; onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code.");
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return setError("Your session expired. Please sign in again.");
      const token = await user.getIdToken();
      const res = await verifyEmailVerificationOtp({ data: { token, code } });
      if (!res.ok) return setError(res.error ?? "Incorrect code.");
      onVerified();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    setResending(true);
    try {
      const user = auth.currentUser;
      if (!user) return setError("Your session expired. Please sign in again.");
      const token = await user.getIdToken();
      await sendEmailVerificationOtp({ data: { token } });
      setCooldown(60);
    } catch {
      setError("Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="mb-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Verify your email
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          We sent a 6-digit code to {email}. Enter it below to activate your account.
        </p>
      </div>

      <div className="clay-inset flex items-center gap-3 px-4 py-3 focus-within:ring-2 focus-within:ring-[var(--sky-deep)]/40">
        <KeyRound className="h-4 w-4 text-foreground/50" />
        <input
          inputMode="numeric"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          required
          style={{ letterSpacing: "0.3em", fontWeight: 600, textAlign: "center" }}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="clay-btn flex w-full items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Verify & continue</span><ArrowRight className="h-4 w-4" /></>}
      </button>

      <div className="text-center text-xs text-foreground/60">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="font-semibold text-[var(--sky-deep)] hover:underline disabled:text-foreground/40 disabled:no-underline"
        >
          {resending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}

// ─── Onboarding ──────────────────────────────────────────────────────────────
function OnboardingCard({ onComplete }: { onComplete: () => void }) {
  const [profile, setProfile] = useState<OnboardingProfile>({
    fullName: "",
    mobile: "",
    city: "",
    currentClass: "",
    board: "",
    targetExam: "NEET",
    track: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof OnboardingProfile>(k: K, v: OnboardingProfile[K]) {
    setProfile((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profile.fullName.trim()) return setError("Please enter your full name.");
    if (!/^\d{10}$/.test(profile.mobile)) return setError("Enter a valid 10-digit mobile number.");
    if (!profile.city.trim()) return setError("Please enter your city or town.");
    if (!profile.currentClass) return setError("Select your current class.");
    if (!profile.board) return setError("Select your board.");
    if (!profile.track) return setError("Pick your track.");

    const user = auth.currentUser;
    if (!user) {
      setError("Your session expired. Please sign in again.");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      await saveProfile({ data: { token, profile } });
      onComplete();
    } catch {
      setError("Could not save your profile. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="text-center">
        <div className="clay-chip mx-auto mb-3 inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground/70">
          <Sparkles className="h-3.5 w-3.5 text-[var(--sky-deep)]" />
          Almost there
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Tell us about you
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          A few quick details so we can tailor your dashboard.
        </p>
      </div>

      {/* Personal coordinates */}
      <Section title="Personal">
        <ClayInput
          icon={<User className="h-4 w-4" />}
          placeholder="Full name"
          value={profile.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          autoComplete="name"
          required
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ClayInput
            icon={<Phone className="h-4 w-4" />}
            type="tel"
            inputMode="numeric"
            placeholder="Mobile (10 digits)"
            value={profile.mobile}
            onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
            required
          />
          <ClayInput
            icon={<MapPin className="h-4 w-4" />}
            placeholder="City / Town / Village"
            value={profile.city}
            onChange={(e) => set("city", e.target.value)}
            autoComplete="address-level2"
            required
          />
        </div>
      </Section>

      {/* Academic */}
      <Section title="Academic">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ClaySelect
            icon={<GraduationCap className="h-4 w-4" />}
            value={profile.currentClass}
            onChange={(e) => set("currentClass", e.target.value)}
            required
          >
            <option value="">Current class</option>
            <option>Class 11</option>
            <option>Class 12</option>
            <option>Dropper</option>
          </ClaySelect>
          <ClaySelect
            icon={<GraduationCap className="h-4 w-4" />}
            value={profile.board}
            onChange={(e) => set("board", e.target.value)}
            required
          >
            <option value="">Board / State board</option>
            <option>CBSE</option>
            <option>ICSE</option>
            <option>Maharashtra</option>
            <option>Karnataka</option>
            <option>Tamil Nadu</option>
            <option>Uttar Pradesh</option>
            <option>West Bengal</option>
            <option>Other</option>
          </ClaySelect>
        </div>
      </Section>

      {/* Target */}
      <Section title="Target">
        <ClaySelect
          icon={<Target className="h-4 w-4" />}
          value={profile.targetExam}
          onChange={(e) => set("targetExam", e.target.value)}
        >
          <option>NEET</option>
          <option>NEET + AIIMS</option>
          <option>NEET PG (future)</option>
        </ClaySelect>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-foreground/60">
            I am a
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(["Dropper", "11th", "12th"] as const).map((t) => (
              <TrackChip
                key={t}
                active={profile.track === t}
                onClick={() => set("track", t)}
                label={t}
              />
            ))}
          </div>
        </div>
      </Section>

      {error && (
        <p className="rounded-2xl bg-[var(--coral-soft)]/50 px-4 py-2 text-xs font-medium text-foreground">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="clay-btn flex w-full items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Finish & Enter Dashboard</span><ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TrackChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative flex items-center justify-center gap-2 rounded-full px-3 py-3 text-sm font-semibold transition-all " +
        (active ? "clay-btn text-white" : "clay-btn-ghost text-foreground/80")
      }
    >
      {active && <Check className="h-4 w-4" />}
      {label}
    </button>
  );
}