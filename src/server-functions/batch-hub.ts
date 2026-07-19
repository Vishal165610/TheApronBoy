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

  // ─── Student-facing: Extended mentor profile for mentorship batches ────────
// Extends what getPublicMentorshipDetail already returns (name +
// profilePictureUrl) with the full public-facing profile a student should
// see: bio, year of study, intro video, and the locked verification fields
// (rank/college/course) — read-only here exactly as they are in the mentor
// portal, since students should see the same verified credentials a mentor
// cannot self-edit.
export const getPublicMentorProfile = createServerFn({ method: "GET" })
  .validator((data: { token: string; mentorId: string }) => data)
  .handler(async ({ data }) => {
    await requireSignedIn(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const m = await db.collection("mentors").findOne({ _id: new ObjectId(data.mentorId) });
    if (!m) return { mentor: null };

    return {
      mentor: {
        id: String(m._id),
        name: m.name as string,
        profilePictureUrl: (m.profilePictureUrl as string | null) ?? null,
        aboutText: (m.aboutText as string) ?? "",
        yearOfStudy: (m.yearOfStudy as string) ?? "",
        introVideoUrl: (m.introVideoUrl as string | null) ?? null,
        aiimsIitRank: (m.aiimsIitRank as string) ?? "",
        enrolledCollege: (m.enrolledCollege as string) ?? "",
        pursuedCourse: (m.pursuedCourse as string) ?? "",
      },
    };
  });

// ─── Student-facing: Live sessions for a mentorship batch ──────────────────
// Mirrors listMentorshipSessions in mentor-portal.ts, but scoped for a
// student rather than the mentor: BatchMeet and AsyncLecture sessions are
// visible to every student in the batch, while OneOnOne sessions are only
// visible if this specific student is the one booked into them — a student
// should never see another student's 1:1 slot.
export const listMentorshipSessionsForStudent = createServerFn({ method: "GET" })
  .validator((data: { token: string; batchId: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const db = await getDb();

    const rows = await db
      .collection("mentorshipSessions")
      .find({
        batchId: data.batchId,
        $or: [{ track: { $ne: "OneOnOne" } }, { track: "OneOnOne", studentUid: decoded.uid }],
      })
      .sort({ scheduledAt: 1 })
      .toArray();

    return {
      sessions: rows.map((r) => ({
        id: String(r._id),
        track: r.track as "OneOnOne" | "BatchMeet" | "AsyncLecture",
        meetingLink: (r.meetingLink as string | null) ?? null,
        lectureUrl: (r.lectureUrl as string | null) ?? null,
        lectureTitle: (r.lectureTitle as string | null) ?? null,
        durationMinutes: (r.durationMinutes as number | null) ?? null,
        scheduledAt: r.scheduledAt as string,
        status: r.status as "scheduled" | "completed" | "cancelled",
      })),
    };
  });

// ─── Student-facing: Mentorship batch announcements ─────────────────────────
// The mentorship-side equivalent of listPublicBundleAnnouncements. Reads
// from mentorshipBatchAnnouncements (written by postMentorAnnouncement in
// mentor-portal.ts) rather than bundleAnnouncements — these are two
// separate collections because mentorship announcements carry a title and
// email-trigger metadata that bundle announcements don't.
export const listPublicMentorshipAnnouncements = createServerFn({ method: "GET" })
  .validator((data: { token: string; batchId: string }) => data)
  .handler(async ({ data }) => {
    await requireSignedIn(data.token);
    const db = await getDb();
    const rows = await db
      .collection("mentorshipBatchAnnouncements")
      .find({ batchId: data.batchId })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      announcements: rows.map((r) => ({
        id: String(r._id),
        title: (r.title as string | null) ?? null,
        message: (r.message as string | null) ?? null,
        thumbnailUrl: null as string | null, // mentor announcements carry no thumbnail field
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });