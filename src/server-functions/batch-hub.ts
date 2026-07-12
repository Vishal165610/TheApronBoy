// Server functions backing the student-facing Unified Batch/Course Hub.
// These require a valid signed-in Firebase token (any student), not admin —
// mirroring the pattern in catalog.ts.
import { createServerFn } from "@tanstack/react-start";
import { adminAuth } from "@/lib/firebase-admin";
import { getDb } from "@/lib/mongo";

async function requireSignedIn(token: string) {
  return adminAuth.verifyIdToken(token);
}

function discountPercent(selling: number, crossed: number): number {
  if (!crossed || crossed <= 0) return 0;
  return Math.round(((crossed - selling) / crossed) * 100);
}

// ─── Bundle detail (Test Series) ─────────────────────────────────────────
export const getPublicBundleDetail = createServerFn({ method: "GET" })
  .validator((data: { token: string; bundleId: string }) => data)
  .handler(async ({ data }) => {
    await requireSignedIn(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const r = await db.collection("bundles").findOne({ _id: new ObjectId(data.bundleId) });
    if (!r) return { bundle: null };

    return {
      bundle: {
        id: String(r._id),
        title: r.title as string,
        track: r.track as string,
        features: (r.features as string[]) ?? [],
        sellingPrice: r.sellingPrice as number,
        crossedPrice: r.crossedPrice as number,
        discountPercent: discountPercent(r.sellingPrice as number, r.crossedPrice as number),
        uploadWindowStart: r.uploadWindowStart as string,
        uploadWindowEnd: r.uploadWindowEnd as string,
        expiryDate: r.expiryDate as string,
        thumbnailUrl: (r.thumbnailUrl as string | null) ?? null,
        syllabusPdfUrls: (r.syllabusPdfUrls as string[]) ?? [],
        plannerUrls: (r.plannerUrls as string[]) ?? [],
      },
    };
  });

// ─── Mentorship batch detail ──────────────────────────────────────────────
export const getPublicMentorshipDetail = createServerFn({ method: "GET" })
  .validator((data: { token: string; batchId: string }) => data)
  .handler(async ({ data }) => {
    await requireSignedIn(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const r = await db.collection("mentorshipBatches").findOne({ _id: new ObjectId(data.batchId) });
    if (!r) return { batch: null };

    let mentor = null;
    if (r.assignedMentorId) {
      const m = await db.collection("mentors").findOne({ _id: new ObjectId(r.assignedMentorId as string) });
      if (m) {
        mentor = {
          name: m.name as string,
          profilePictureUrl: (m.profilePictureUrl as string | null) ?? null,
        };
      }
    }

    return {
      batch: {
        id: String(r._id),
        name: r.name as string,
        track: r.track as string,
        highlights: (r.highlights as string[]) ?? [],
        sellingPrice: r.sellingPrice as number,
        crossedPrice: r.crossedPrice as number,
        discountPercent: discountPercent(r.sellingPrice as number, r.crossedPrice as number),
        thumbnailUrl: (r.thumbnailUrl as string | null) ?? null,
        mentor,
      },
    };
  });

// ─── Tests inside a bundle (student-facing) ───────────────────────────────
export const listPublicTestsForBundle = createServerFn({ method: "GET" })
  .validator((data: { token: string; bundleId: string }) => data)
  .handler(async ({ data }) => {
    await requireSignedIn(data.token);
    const db = await getDb();
    const rows = await db
      .collection("testCores")
      .find({ bundleId: data.bundleId })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      tests: rows.map((r) => ({
        id: String(r._id),
        name: r.name as string,
        totalQuestions: r.totalQuestions as number,
        timeLimitMinutes: (r.timeLimitMinutes as number) ?? 180,
        subjects: (r.subjects as string[]) ?? [],
        liveStart: r.liveStart as string,
        liveEnd: r.liveEnd as string,
      })),
    };
  });

// ─── Announcements for a bundle (student-facing) ──────────────────────────
export const listPublicBundleAnnouncements = createServerFn({ method: "GET" })
  .validator((data: { token: string; bundleId: string }) => data)
  .handler(async ({ data }) => {
    await requireSignedIn(data.token);
    const db = await getDb();
    const rows = await db
      .collection("bundleAnnouncements")
      .find({ bundleId: data.bundleId })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      announcements: rows.map((r) => ({
        id: String(r._id),
        message: (r.message as string | null) ?? null,
        thumbnailUrl: (r.thumbnailUrl as string | null) ?? null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

// ─── Purchase check ────────────────────────────────────────────────────────
// Real query against a `purchases` collection — it just has no rows in it
// yet since there's no working checkout flow to write them. This means
// isPurchased will correctly report false for everyone until real Razorpay
// integration exists and starts writing confirmed orders here.
export const hasPurchased = createServerFn({ method: "GET" })
  .validator((data: { token: string; itemType: "bundle" | "mentorship"; itemId: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const db = await getDb();
    const existing = await db.collection("purchases").findOne({
      uid: decoded.uid,
      itemType: data.itemType,
      itemId: data.itemId,
    });
    return { isPurchased: Boolean(existing) };
  });

// ─── Request a Call Back ────────────────────────────────────────────────────
export const requestCallback = createServerFn({ method: "POST" })
  .validator(
    (data: {
      token: string;
      itemType: "bundle" | "mentorship";
      itemId: string;
      name: string;
      phone: string;
      message: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const db = await getDb();
    await db.collection("callbackRequests").insertOne({
      uid: decoded.uid,
      itemType: data.itemType,
      itemId: data.itemId,
      name: data.name,
      phone: data.phone,
      message: data.message,
      status: "open",
      createdAt: new Date(),
    });
    return { ok: true };
  });

// ─── Support ticket (per-batch help desk) ──────────────────────────────────
export const submitSupportTicket = createServerFn({ method: "POST" })
  .validator(
    (data: { token: string; itemType: "bundle" | "mentorship"; itemId: string; subject: string; message: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const db = await getDb();
    await db.collection("supportTickets").insertOne({
      uid: decoded.uid,
      itemType: data.itemType,
      itemId: data.itemId,
      subject: data.subject,
      message: data.message,
      status: "open",
      createdAt: new Date(),
    });
    return { ok: true };
  });