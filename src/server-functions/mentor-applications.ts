// Public-facing mentor onboarding form submission. Deliberately has no auth
// check — applicants are prospective mentors who don't have an account yet,
// unlike every other server function in this app which requires a signed-in
// user or admin. Writes to `creatorApplications` with status "pending" so
// an admin review screen (e.g. inside MentorHubModule) can list, approve,
// or reject applications later.
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/lib/mongo";

type StudentCategory = "Droppers" | "12th" | "11th";
type SocialPlatform = "YouTube" | "Instagram" | "LinkedIn" | "X (Twitter)" | "Telegram" | "Other";
type SocialLink = { platform: SocialPlatform; url: string };

type CreatorApplicationInput = {
  fullName: string;
  email: string;
  mobileNumber: string;
  city: string;
  institution: string;
  yearOfStudy: string;
  examRank: string;
  batchTitle: string;
  targetCategory: StudentCategory;
  pricingTier: string;
  socialLinks: SocialLink[];
};

export const submitCreatorApplication = createServerFn({ method: "POST" })
  .validator((data: CreatorApplicationInput) => data)
  .handler(async ({ data }) => {
    // Minimal server-side guard — the client already validates the full
    // form, but a public endpoint with no auth shouldn't trust that alone.
    if (!data.fullName?.trim()) throw new Error("Full name is required.");
    if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) throw new Error("A valid email is required.");
    if (!/^\d{10}$/.test(data.mobileNumber ?? "")) throw new Error("A valid 10-digit mobile number is required.");

    const db = await getDb();

    // Drop any link rows the applicant left empty rather than storing blanks.
    const socialLinks = (data.socialLinks ?? [])
      .filter((l) => l.url?.trim())
      .map((l) => ({ platform: l.platform, url: l.url.trim() }))
      .slice(0, 5);

    const result = await db.collection("creatorApplications").insertOne({
      personal: {
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        mobileNumber: data.mobileNumber.trim(),
        city: data.city.trim(),
      },
      credentials: {
        institution: data.institution.trim(),
        yearOfStudy: data.yearOfStudy.trim(),
        examRank: data.examRank.trim(),
      },
      mentorship: {
        batchTitle: data.batchTitle.trim(),
        targetCategory: data.targetCategory,
        pricingTier: data.pricingTier.trim(),
      },
      socialLinks,
      status: "pending",
      submittedAt: new Date(),
    });

    return { ok: true, applicationId: String(result.insertedId) };
  });