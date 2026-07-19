// Two distinct identities are authenticated in this file:
//
// 1. Mentors — NOT Firebase users. They were onboarded directly into
//    MongoDB (Module 6 of the admin portal) with a hashed password, so
//    mentor login can't use Firebase Auth at all. It uses its own
//    credential check and a signed, stateless HMAC session token.
//
// 2. Super Admin — the existing Firebase Auth + `admin: true` custom claim
//    used everywhere in admin.ts. updateMentorLockedInfo below reuses that
//    exact same check, because writing AIIMS/IIT Rank, Enrolled College, or
//    Pursued Course is strictly a Super Admin action, never a mentor one.
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/lib/mongo";
import { adminAuth } from "@/lib/firebase-admin";
import { scryptSync, createHmac, timingSafeEqual } from "node:crypto";
import type {
  MentorProfileExtended,
  MentorProfileUpdateInput,
  MentorLockedInfoInput,
  YearOfStudy,
} from "@/lib/admin-types";

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function getSessionSecret(): string {
  const secret = process.env.MENTOR_SESSION_SECRET;
  if (!secret) {
    throw new Error("Server misconfigured: MENTOR_SESSION_SECRET is not set");
  }
  return secret;
}

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function signMentorToken(mentorId: string): string {
  const secret = getSessionSecret();
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = `${mentorId}.${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifyMentorToken(token: string): { mentorId: string } | null {
  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [mentorId, expiresAtStr, signature] = parts;

  const expectedSignature = createHmac("sha256", secret)
    .update(`${mentorId}.${expiresAtStr}`)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expectedSignature, "hex");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  if (Date.now() > Number(expiresAtStr)) return null;

  return { mentorId };
}

// Shared by every mentor-session-authenticated function below. Verifies the
// signed HMAC token and returns the mentor's Mongo _id as a string — throws
// the same "session expired" error whether the token is malformed, tampered
// with, or genuinely expired, so nothing leaks about why it failed.
async function requireMentor(token: string): Promise<string> {
  const verified = verifyMentorToken(token);
  if (!verified) throw new Error("Session expired. Please sign in again.");
  return verified.mentorId;
}

// Mirrors requireAdmin from admin.ts exactly — same Firebase ID token +
// `admin: true` custom claim check. Duplicated rather than imported to keep
// mentor-auth.ts fully independent of admin.ts (different identity systems
// living in the same file already; no need to couple the modules further).
async function requireSuperAdmin(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  if (decoded.admin !== true) {
    throw new Error("Forbidden: admin access required");
  }
  return decoded;
}

// ─── Mentor login & session ─────────────────────────────────────────────────

export const mentorLogin = createServerFn({ method: "POST" })
  .validator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const db = await getDb();
    const mentor = await db.collection("mentors").findOne({ username: data.username });

    // Same error message whether the username doesn't exist or the
    // password is wrong — don't leak which one it was.
    if (!mentor || !verifyPassword(data.password, mentor.passwordHash as string, mentor.passwordSalt as string)) {
      throw new Error("Incorrect username or password.");
    }

    const token = signMentorToken(String(mentor._id));
    return {
      ok: true,
      token,
      mentor: {
        id: String(mentor._id),
        name: mentor.name as string,
        username: mentor.username as string,
        profilePictureUrl: (mentor.profilePictureUrl as string | null) ?? null,
      },
    };
  });

// Called by the mentor dashboard shell to confirm a stored session token is
// still valid and to fetch the mentor's current (lightweight) identity —
// distinct from getMentorProfile below, which returns the full extended
// profile object used by the Profile Control page.
export const getMentorSession = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const mentor = await db.collection("mentors").findOne({ _id: new ObjectId(mentorId) });
    if (!mentor) throw new Error("Mentor account not found.");

    return {
      mentor: {
        id: String(mentor._id),
        name: mentor.name as string,
        username: mentor.username as string,
        profilePictureUrl: (mentor.profilePictureUrl as string | null) ?? null,
      },
    };
  });

// ─── Module 6b: Mentor Portal — Profile Control ─────────────────────────────

// Fetches the full extended profile (editable + locked fields together) for
// the Profile Control page. Locked fields are read-only here — they're
// still returned so the UI can display them, just never accepted as input
// by updateMyMentorProfile below. Fields not yet set (e.g. a mentor
// onboarded before this module existed) default to empty string rather
// than throwing, so older mentor documents render cleanly as "Not set yet"
// in the LockedInfoPanel instead of crashing the page.
export const getMentorProfile = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const m = await db.collection("mentors").findOne({ _id: new ObjectId(mentorId) });
    if (!m) throw new Error("Mentor account not found.");

    const profile: MentorProfileExtended = {
      id: String(m._id),
      username: m.username as string,
      name: m.name as string,
      profilePictureUrl: (m.profilePictureUrl as string | null) ?? null,
      secretCode: (m.secretCode as string) ?? "",
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : null,
      aboutText: (m.aboutText as string) ?? "",
      yearOfStudy: ((m.yearOfStudy as YearOfStudy) ?? "") as YearOfStudy | "",
      introVideoUrl: (m.introVideoUrl as string | null) ?? null,
      aiimsIitRank: (m.aiimsIitRank as string) ?? "",
      enrolledCollege: (m.enrolledCollege as string) ?? "",
      pursuedCourse: (m.pursuedCourse as string) ?? "",
    };

    return { profile };
  });

// Mentor-facing self-service update. The validator's input type is
// MentorProfileUpdateInput, which structurally excludes aiimsIitRank,
// enrolledCollege, and pursuedCourse — those three keys are never read from
// `data.profile` here, so even a hand-crafted request body can't smuggle a
// locked-field change through this endpoint. Locked-field writes only ever
// happen via updateMentorLockedInfo below, gated by requireSuperAdmin.
export const updateMyMentorProfile = createServerFn({ method: "POST" })
  .validator((data: { token: string; profile: MentorProfileUpdateInput }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const { name, profilePictureUrl, aboutText, yearOfStudy, introVideoUrl } = data.profile;

    if (!name.trim()) throw new Error("Name cannot be empty.");
    if (!aboutText.trim()) throw new Error("About text cannot be empty.");

    await db.collection("mentors").updateOne(
      { _id: new ObjectId(mentorId) },
      {
        $set: {
          name: name.trim(),
          profilePictureUrl,
          aboutText: aboutText.trim(),
          yearOfStudy,
          introVideoUrl,
        },
      },
    );

    return { ok: true };
  });

// ─── Super Admin — Locked Field Injection ───────────────────────────────────

// The ONLY place aiimsIitRank / enrolledCollege / pursuedCourse can ever be
// written. Gated by requireSuperAdmin (Firebase ID token + `admin: true`
// claim), the exact same check used throughout admin.ts — a mentor's own
// session token is never accepted here, and mentor-side code never calls
// this function. Intended to be wired into a "locked fields" sub-panel in
// mentor-hub-module.tsx (the admin-side mentor editor), alongside the
// existing updateMentorProfile (name/profilePictureUrl/trackingIndex).
export const updateMentorLockedInfo = createServerFn({ method: "POST" })
  .validator((data: { token: string; mentorId: string; lockedInfo: MentorLockedInfoInput }) => data)
  .handler(async ({ data }) => {
    await requireSuperAdmin(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const { aiimsIitRank, enrolledCollege, pursuedCourse } = data.lockedInfo;

    const result = await db.collection("mentors").updateOne(
      { _id: new ObjectId(data.mentorId) },
      {
        $set: {
          aiimsIitRank: aiimsIitRank.trim(),
          enrolledCollege: enrolledCollege.trim(),
          pursuedCourse: pursuedCourse.trim(),
        },
      },
    );

    if (result.matchedCount === 0) {
      throw new Error("Mentor not found.");
    }

    return { ok: true };
  });