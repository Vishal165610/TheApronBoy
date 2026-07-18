import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  GraduationCap,
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  BookOpen,
  Users,
  Tag,
  IndianRupee,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/join-mentor")({
  component: JoinMentorPage,
});

// Shared with the main site header/footer — keep in sync if the asset moves.
const LOGO_SRC = "/assets/branding/edurack-logo.png";

// ---------------------------------------------
// Types
// ---------------------------------------------

type StudentCategory = "Droppers" | "12th" | "11th";

interface CreatorApplicationForm {
  fullName: string;
  email: string;
  mobileNumber: string;
  city: string;
  institution: string;
  yearOfStudy: string;
  examRank: string;
  batchTitle: string;
  targetCategory: StudentCategory | "";
  pricingTier: string;
}

const initialFormState: CreatorApplicationForm = {
  fullName: "",
  email: "",
  mobileNumber: "",
  city: "",
  institution: "",
  yearOfStudy: "",
  examRank: "",
  batchTitle: "",
  targetCategory: "",
  pricingTier: "",
};

const categories: StudentCategory[] = ["Droppers", "12th", "11th"];

// ---------------------------------------------
// Page
// ---------------------------------------------

function JoinMentorPage() {
  const [form, setForm] = useState<CreatorApplicationForm>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CreatorApplicationForm, string>>>({});

  function updateField<K extends keyof CreatorApplicationForm>(
    field: K,
    value: CreatorApplicationForm[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof CreatorApplicationForm, string>> = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Enter a valid email.";
    if (!/^\d{10}$/.test(form.mobileNumber)) nextErrors.mobileNumber = "Enter a valid 10-digit mobile number.";
    if (!form.city.trim()) nextErrors.city = "City is required.";
    if (!form.institution.trim()) nextErrors.institution = "Institution is required.";
    if (!form.yearOfStudy.trim()) nextErrors.yearOfStudy = "Year of study is required.";
    if (!form.examRank.trim()) nextErrors.examRank = "Exam rank / AIR is required.";
    if (!form.batchTitle.trim()) nextErrors.batchTitle = "Batch title is required.";
    if (!form.targetCategory) nextErrors.targetCategory = "Select a target category.";
    if (!form.pricingTier.trim()) nextErrors.pricingTier = "Pricing tier is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    // NOTE: this payload shape is what will be handed to the
    // creator-applications MongoDB collection once the server
    // function (e.g. `submitCreatorApplication`) is wired up.
    const payload = {
      personal: {
        fullName: form.fullName,
        email: form.email,
        mobileNumber: form.mobileNumber,
        city: form.city,
      },
      credentials: {
        institution: form.institution,
        yearOfStudy: form.yearOfStudy,
        examRank: form.examRank,
      },
      mentorship: {
        batchTitle: form.batchTitle,
        targetCategory: form.targetCategory,
        pricingTier: form.pricingTier,
      },
      submittedAt: new Date().toISOString(),
    };

    try {
      // await submitCreatorApplication(payload);
      await new Promise((resolve) => setTimeout(resolve, 1400)); // simulated latency
      console.log("Creator application payload ready for MongoDB:", payload);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit creator application", err);
      setErrors({ fullName: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <SuccessState onReset={() => { setForm(initialFormState); setSubmitted(false); }} />;
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <BrandHeader />

        <div className="mt-8 text-center">
          <div className="clay-chip mx-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-orange-700 sm:text-sm">
            <Sparkles className="h-4 w-4" />
            Creator Application
          </div>
          <h1 className="fluid-h2 mt-4 font-display font-extrabold tracking-tight text-slate-900">
            Join EDURACK as a Mentor
          </h1>
          <p className="fluid-body mx-auto mt-3 max-w-xl text-slate-600">
            Tell us about your background and the batch you'd like to run. Our team
            reviews every application before your mentor space goes live.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="clay mt-10 p-6 sm:p-10">
          <FormSection
            icon={User}
            title="Personal Details"
            subtitle="How students and our team can reach you."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Full Name"
                icon={User}
                value={form.fullName}
                onChange={(v) => updateField("fullName", v)}
                placeholder="e.g. Rahul Jha"
                error={errors.fullName}
              />
              <TextField
                label="Email"
                icon={Mail}
                type="email"
                value={form.email}
                onChange={(v) => updateField("email", v)}
                placeholder="you@example.com"
                error={errors.email}
              />
              <TextField
                label="Mobile Number"
                icon={Phone}
                type="tel"
                value={form.mobileNumber}
                onChange={(v) => updateField("mobileNumber", v.replace(/[^\d]/g, "").slice(0, 10))}
                placeholder="10-digit number"
                error={errors.mobileNumber}
              />
              <TextField
                label="City"
                icon={MapPin}
                value={form.city}
                onChange={(v) => updateField("city", v)}
                placeholder="e.g. Ambarnath"
                error={errors.city}
              />
            </div>
          </FormSection>

          <Divider />

          <FormSection
            icon={GraduationCap}
            title="Academic Credentials"
            subtitle="The credentials that build student trust in your batch."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Elite College / Institution"
                icon={GraduationCap}
                value={form.institution}
                onChange={(v) => updateField("institution", v)}
                placeholder="e.g. AIIMS New Delhi"
                error={errors.institution}
                fullWidth
              />
              <TextField
                label="Year of Study"
                icon={BookOpen}
                value={form.yearOfStudy}
                onChange={(v) => updateField("yearOfStudy", v)}
                placeholder="e.g. 2nd Year MBBS"
                error={errors.yearOfStudy}
              />
              <TextField
                label="Exam Rank / AIR"
                icon={Award}
                value={form.examRank}
                onChange={(v) => updateField("examRank", v)}
                placeholder="e.g. AIR 89"
                error={errors.examRank}
              />
            </div>
          </FormSection>

          <Divider />

          <FormSection
            icon={Users}
            title="Mentorship Intentions"
            subtitle="What your mentorship batch will look like on EDURACK."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Expected Batch Title"
                icon={Tag}
                value={form.batchTitle}
                onChange={(v) => updateField("batchTitle", v)}
                placeholder="e.g. Organic Chemistry Mastery Batch"
                error={errors.batchTitle}
                fullWidth
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Target Student Category
                </label>
                <div className="clay-inset flex gap-1 p-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => updateField("targetCategory", cat)}
                      className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        form.targetCategory === cat
                          ? "clay-btn text-slate-900"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {errors.targetCategory && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.targetCategory}</p>
                )}
              </div>

              <TextField
                label="Settled Target Pricing Tier"
                icon={IndianRupee}
                value={form.pricingTier}
                onChange={(v) => updateField("pricingTier", v)}
                placeholder="e.g. ₹2,999 / month"
                error={errors.pricingTier}
              />
            </div>
          </FormSection>

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-slate-200/70 pt-6 sm:flex-row sm:justify-between">
            <p className="text-xs text-slate-500 sm:max-w-xs">
              By submitting, you agree to EDURACK's{" "}
              <Link to="/legal/terms" className="font-semibold text-slate-700 hover:underline">
                mentor guidelines
              </Link>{" "}
              and revenue-share terms.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="clay-btn inline-flex w-full items-center justify-center gap-2 px-8 py-4 text-base font-bold disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------
// Sub-components
// ---------------------------------------------

function BrandHeader() {
  return (
    <Link to="/" className="flex items-center justify-center">
      {/* Platform logo — sourced from the shared branding asset path */}
      <img
        src={LOGO_SRC}
        alt="EDURACK"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-xl object-contain"
      />
      <span className="ml-2.5 font-display text-xl font-bold tracking-tight text-slate-900">
        EDURACK
      </span>
    </Link>
  );
}

function FormSection({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100">
          <Icon className="h-5 w-5 text-sky-600" />
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
          <p className="text-xs text-slate-500 sm:text-sm">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Divider() {
  return <div className="my-8 h-px bg-slate-200/70" />;
}

function TextField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  fullWidth = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : undefined}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <div className="clay-inset flex items-center gap-2.5 px-4 py-3">
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="clay mx-auto max-w-md p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-100">
          <CheckCircle2 className="h-8 w-8 text-teal-600" />
        </div>
        <h2 className="mt-5 font-display text-xl font-bold text-slate-900">
          Application Received
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Thanks for applying to mentor on EDURACK. Our team will review your
          details and get back to you at the email you provided.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <button onClick={onReset} className="clay-btn-ghost px-6 py-3 text-sm font-semibold">
            Submit Another Application
          </button>
          <Link to="/" className="clay-btn px-6 py-3 text-sm font-semibold">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}