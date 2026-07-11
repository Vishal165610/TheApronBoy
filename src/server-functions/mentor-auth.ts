// Mentors are NOT Firebase users — they were onboarded directly into
// MongoDB (Module 6 of the admin portal) with a hashed password. So mentor
// login can't use Firebase Auth at all; it needs its own credential check
// and its own lightweight session mechanism. We use a signed, stateless
// token (HMAC-SHA256 over mentorId + expiry) rather than a database-backed
// session table — simple, and enough for an internal mentor login.
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/lib/mongo";
import { scryptSync, createHmac, timingSafeEqual } from "node:crypto";

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

// Called by the (future) mentor dashboard to confirm a stored session token
// is still valid and to fetch the mentor's current profile.
export const getMentorSession = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const verified = verifyMentorToken(data.token);
    if (!verified) throw new Error("Session expired. Please sign in again.");

    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const mentor = await db.collection("mentors").findOne({ _id: new ObjectId(verified.mentorId) });
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