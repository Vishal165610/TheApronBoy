import { createServerFn } from "@tanstack/react-start";
import { adminAuth } from "@/lib/firebase-admin";
import { getDb } from "@/lib/mongo";

type OnboardingProfileInput = {
  fullName: string;
  mobile: string;
  city: string;
  currentClass: string;
  board: string;
  targetExam: string;
  track: "Dropper" | "11th" | "12th" | "";
};

const EMPTY_ONBOARDING_FIELDS: OnboardingProfileInput = {
  fullName: "",
  mobile: "",
  city: "",
  currentClass: "",
  board: "",
  targetExam: "NEET",
  track: "",
};

// Called right after ANY successful sign-in or sign-up (email/password or
// Google) so a MongoDB document always exists for the user.
export const ensureUserRecord = createServerFn({ method: "POST" })
  // Widened type validation constraint to protect against provider payload string mismatches
  .validator((data: { token: string; provider: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data?.token) {
        throw new Error("Missing authentication token string parameter.");
      }

      const decoded = await adminAuth.verifyIdToken(data.token);
      const db = await getDb();
      const now = new Date();

      // Ensure provider string formatting is kept clean and normalized
      const normalizedProvider = data.provider === "google" ? "google.com" : data.provider;

      await db.collection("profiles").updateOne(
        { uid: decoded.uid },
        {
          $set: {
            uid: decoded.uid,
            email: decoded.email ?? null,
            provider: normalizedProvider,
            updatedAt: now,
            lastLoginAt: now,
          },
          $setOnInsert: {
            ...EMPTY_ONBOARDING_FIELDS,
            createdAt: now,
          },
        },
        { upsert: true },
      );

      return { ok: true };
    } catch (error: any) {
      console.error("CRITICAL EXCEPTION IN ensureUserRecord:", error);
      throw new Error(`Internal Server Error: ${error?.message || "Execution collapsed"}`);
    }
  });

export const saveProfile = createServerFn({ method: "POST" })
  .validator((data: { token: string; profile: OnboardingProfileInput }) => data)
  .handler(async ({ data }) => {
    try {
      const decoded = await adminAuth.verifyIdToken(data.token);
      const db = await getDb();
      await db.collection("profiles").updateOne(
        { uid: decoded.uid },
        {
          $set: {
            ...data.profile,
            uid: decoded.uid,
            email: decoded.email ?? null,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );

      return { ok: true };
    } catch (error: any) {
      console.error("CRITICAL EXCEPTION IN saveProfile:", error);
      throw new Error(`Internal Server Error: ${error?.message || "Execution collapsed"}`);
    }
  });

export const updateBasicInfo = createServerFn({ method: "POST" })
  .validator((data: { token: string; field: "fullName" | "mobile" | "city"; value: string }) => data)
  .handler(async ({ data }) => {
    try {
      const decoded = await adminAuth.verifyIdToken(data.token);
      const db = await getDb();
      await db.collection("profiles").updateOne(
        { uid: decoded.uid },
        { $set: { [data.field]: data.value, updatedAt: new Date() } },
        { upsert: true },
      );
      return { ok: true };
    } catch (error: any) {
      console.error("CRITICAL EXCEPTION IN updateBasicInfo:", error);
      throw new Error(`Internal Server Error: ${error?.message || "Execution collapsed"}`);
    }
  });

export const getProfile = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    try {
      const decoded = await adminAuth.verifyIdToken(data.token);
      const db = await getDb();
      const doc = await db.collection("profiles").findOne({ uid: decoded.uid });

      if (!doc) {
        return { profile: null };
      }

      const profile = {
        uid: doc.uid as string,
        email: (doc.email as string | null) ?? null,
        fullName: (doc.fullName as string) ?? "",
        mobile: (doc.mobile as string) ?? "",
        city: (doc.city as string) ?? "",
        currentClass: (doc.currentClass as string) ?? "",
        board: (doc.board as string) ?? "",
        targetExam: (doc.targetExam as string) ?? "",
        track: (doc.track as OnboardingProfileInput["track"]) ?? "",
        provider: (doc.provider as string) ?? null,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
        lastLoginAt: doc.lastLoginAt instanceof Date ? doc.lastLoginAt.toISOString() : null,
      };

      return { profile };
    } catch (error: any) {
      console.error("CRITICAL EXCEPTION IN getProfile:", error);
      return { profile: null };
    }
  });

export function needsOnboarding(profile: { fullName?: string } | null): boolean {
  return !profile?.fullName?.trim();
}