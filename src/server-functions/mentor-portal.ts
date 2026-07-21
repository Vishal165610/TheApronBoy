// Server functions for the mentor-facing portal's communication tools.
// Distinct from mentor-auth.ts (identity/session/profile) — this file
// covers targeted batch announcements with an email broadcast hook. Live
// session scheduling (Tracks A/B/C), chat, and support tickets will follow
// in this same file as later modules, once we get to those steps.
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/lib/mongo";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { MentorAnnouncement, MentorAnnouncementInput } from "@/lib/admin-types";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";


async function watermarkPdf(sourceUrl: string): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error("Could not fetch the PDF from that URL. Make sure it's publicly accessible.");
  }
  const originalBytes = await response.arrayBuffer();

  const pdfDoc = await PDFDocument.load(originalBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const text = "EDURACK";
    const fontSize = Math.min(width, height) / 6;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    // One large diagonal watermark centered on the page, low-opacity so it
    // sits behind the readable content rather than obscuring it.
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.18,
      rotate: degrees(45),
    });

    // A second, smaller repeating pass in the corners so cropping out the
    // center watermark doesn't remove all traces of it.
    const smallSize = fontSize / 3;
    const smallWidth = font.widthOfTextAtSize(text, smallSize);
    const corners: [number, number][] = [
      [smallWidth / 2 + 20, height - 30],
      [width - smallWidth / 2 - 20, 30],
    ];
    for (const [x, y] of corners) {
      page.drawText(text, {
        x: x - smallWidth / 2,
        y,
        size: smallSize,
        font,
        color: rgb(0.55, 0.55, 0.55),
        opacity: 0.25,
        rotate: degrees(45),
      });
    }
  }

  const watermarkedBytes = await pdfDoc.save();
  const base64 = Buffer.from(watermarkedBytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

export const uploadMentorNote = createServerFn({ method: "POST" })
  .validator(
    (data: { token: string; batchId: string; fileName: string; fileUrl: string; copyrightAcknowledged: boolean }) =>
      data,
  )
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    if (!data.copyrightAcknowledged) {
      throw new Error("You must acknowledge the copyright safety toggle before uploading.");
    }
    if (!data.fileUrl.trim() || !data.fileName.trim()) {
      throw new Error("Provide the uploaded file's name and URL.");
    }

    const watermarkedDataUri = await watermarkPdf(data.fileUrl.trim());

    const db = await getDb();
    const result = await db.collection("mentorNotes").insertOne({
      mentorId,
      batchId: data.batchId,
      fileName: data.fileName.trim(),
      originalFileUrl: data.fileUrl.trim(),
      fileUrl: watermarkedDataUri,
      copyrightAcknowledged: true,
      watermarkApplied: true,
      createdAt: new Date(),
    });
    return { ok: true, id: String(result.insertedId) };
  });
// ─── Mentor session verification (mirrors mentor-auth.ts) ───────────────────
// Duplicated rather than imported to keep this file's only dependency on
// mentor-auth.ts being the shared token format, not a function coupling.
function getSessionSecret(): string {
  const secret = process.env.MENTOR_SESSION_SECRET;
  if (!secret) {
    throw new Error("Server misconfigured: MENTOR_SESSION_SECRET is not set");
  }
  return secret;
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

async function requireMentor(token: string): Promise<string> {
  const verified = verifyMentorToken(token);
  if (!verified) throw new Error("Session expired. Please sign in again.");
  return verified.mentorId;
}

// Confirms the mentorId making the request actually owns/is assigned to the
// batch they're posting into — prevents a mentor from broadcasting into a
// batch that isn't theirs even if they know its id.
async function requireOwnsBatch(mentorId: string, batchId: string) {
  const db = await getDb();
  const { ObjectId } = await import("mongodb");
  const batch = await db.collection("mentorshipBatches").findOne({ _id: new ObjectId(batchId) });
  if (!batch) throw new Error("Batch not found.");
  if (batch.assignedMentorId !== mentorId) {
    throw new Error("You are not the assigned mentor for this batch.");
  }
  return batch;
}

// ─── Email broadcast (mirrors the server-side EmailJS pattern used for OTP
// delivery — private-key call from the server, never the client) ───────────
async function sendAnnouncementEmail(params: {
  toEmails: string[];
  batchName: string;
  title: string;
  message: string;
}): Promise<boolean> {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID_ANNOUNCEMENT;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    // Same "flag as pending, don't fabricate success" pattern used for
    // cbtEngineSynced — if EmailJS isn't configured, callers see
    // emailStatus: "failed" rather than a false "sent".
    return false;
  }

  try {
    // EmailJS's REST API sends one email per call; batch students are
    // looped here server-side. For large batches this should move to a
    // queued job rather than a synchronous loop — flagged for follow-up,
    // not blocking for now since mentorship batches are small cohorts.
    const results = await Promise.allSettled(
      params.toEmails.map((toEmail) =>
        fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            accessToken: privateKey,
            template_params: {
              to_email: toEmail,
              batch_name: params.batchName,
              announcement_title: params.title,
              announcement_message: params.message,
            },
          }),
        }),
      ),
    );
    return results.every((r) => r.status === "fulfilled");
  } catch {
    return false;
  }
}

// ─── Targeted Batch Announcement Engine ─────────────────────────────────────

export const postMentorAnnouncement = createServerFn({ method: "POST" })
  .validator((data: { token: string; announcement: MentorAnnouncementInput }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const batch = await requireOwnsBatch(mentorId, data.announcement.batchId);

    const { title, message, triggerEmail } = data.announcement;
    if (!title.trim()) throw new Error("Enter an announcement title.");
    if (!message.trim()) throw new Error("Write the announcement message.");

    const db = await getDb();

    // Resolve recipients now — real purchase-confirmed students for this
    // batch, same `purchases` collection referenced elsewhere as
    // real-but-currently-empty pending Razorpay integration (see
    // student-data.ts / catalog.ts). Once checkout writes real rows here,
    // this resolves correctly with no further changes needed.
    const purchaseRows = await db
      .collection("purchases")
      .find({ itemType: "mentorship", itemId: data.announcement.batchId })
      .toArray();
    const recipientUids = purchaseRows.map((p) => p.uid as string);

    let emailStatus: MentorAnnouncement["emailStatus"] = "not_requested";
    let emailSentAt: string | null = null;

    if (triggerEmail) {
      if (recipientUids.length === 0) {
        emailStatus = "failed";
      } else {
        const profiles = await db
          .collection("profiles")
          .find({ uid: { $in: recipientUids } }, { projection: { email: 1 } })
          .toArray();
        const emails = profiles.map((p) => p.email as string).filter(Boolean);

        const sent = await sendAnnouncementEmail({
          toEmails: emails,
          batchName: batch.name as string,
          title: title.trim(),
          message: message.trim(),
        });
        emailStatus = sent ? "sent" : "failed";
        emailSentAt = sent ? new Date().toISOString() : null;
      }
    }

    // Maps into the student dashboard feed collection — mirrors
    // bundleAnnouncements' shape/purpose but scoped to mentorshipBatches so
    // the existing listPublicBundleAnnouncements-style reader can be
    // extended for mentorship batches without touching this write path.
    const result = await db.collection("mentorshipBatchAnnouncements").insertOne({
      mentorId,
      batchId: data.announcement.batchId,
      title: title.trim(),
      message: message.trim(),
      emailTriggered: triggerEmail,
      emailStatus,
      emailSentAt,
      recipientCount: recipientUids.length,
      createdAt: new Date(),
    });

    return { ok: true, id: String(result.insertedId), emailStatus, recipientCount: recipientUids.length };
  });

export const listMentorAnnouncements = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    const rows = await db
      .collection("mentorshipBatchAnnouncements")
      .find({ mentorId, batchId: data.batchId })
      .sort({ createdAt: -1 })
      .toArray();

    const announcements: MentorAnnouncement[] = rows.map((r) => ({
      id: String(r._id),
      mentorId: r.mentorId as string,
      batchId: r.batchId as string,
      title: r.title as string,
      message: r.message as string,
      emailTriggered: Boolean(r.emailTriggered),
      emailStatus: r.emailStatus as MentorAnnouncement["emailStatus"],
      emailSentAt: (r.emailSentAt as string | null) ?? null,
      recipientCount: (r.recipientCount as number | null) ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      pinned: Boolean(r.pinned),
      editedAt: r.editedAt instanceof Date ? r.editedAt.toISOString() : null,
    }));

    return { announcements };
  });

// Lists the batches this mentor is actually assigned to — used to populate
// the batch-select dropdown in the announcement form, and to double-check
// ownership client-side before even attempting a post.
export const listMyAssignedBatches = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const db = await getDb();
    const rows = await db
      .collection("mentorshipBatches")
      .find({ assignedMentorId: mentorId })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      batches: rows.map((r) => ({
        id: String(r._id),
        name: r.name as string,
        track: r.track as string,
      })),
    };
  });
// ─── Module 9: Smart Live Session Scheduler (Tracks A / B / C) ──────────────
import type { SessionTrack, MentorshipSession, StudentSessionUsage, LectureComment } from "@/lib/admin-types";

const MAX_SESSIONS_PER_STUDENT = 20;
const MAX_DURATION_MINUTES = 180;

type CreateSessionInput = {
  batchId: string;
  track: SessionTrack;
  // Track A only
  studentUid?: string;
  durationMinutes?: number;
  // Track A & B
  meetingLink?: string;
  // Track C only
  lectureUrl?: string;
  lectureTitle?: string;
  scheduledAt: string;
};

// Resolves the students actually enrolled in a batch, via the same
// `purchases` collection referenced throughout (real query, currently empty
// until Razorpay checkout writes confirmed rows — same pattern as
// hasPurchased in student-data.ts). Returns [] rather than throwing when
// nothing has been purchased yet, so the UI can show an honest empty state.
export const listBatchStudents = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    const purchaseRows = await db
      .collection("purchases")
      .find({ itemType: "mentorship", itemId: data.batchId })
      .toArray();
    const uids = purchaseRows.map((p) => p.uid as string);
    if (uids.length === 0) return { students: [] };

    const profiles = await db
      .collection("profiles")
      .find({ uid: { $in: uids } }, { projection: { uid: 1, fullName: 1, email: 1 } })
      .toArray();

    return {
      students: profiles.map((p) => ({
        uid: p.uid as string,
        fullName: (p.fullName as string) || "Unnamed student",
        email: (p.email as string | null) ?? null,
      })),
    };
  });

// Derived usage counter for the <= 20 one-on-one session cap. Counts
// non-cancelled OneOnOne sessions for this mentor + student, scoped to the
// batch — a student who's part of two different batches with the same
// mentor gets a separate 20-session allowance per batch, since each batch
// is a distinct purchased product.
export const getStudentSessionUsage = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string; studentUid: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    const sessionsUsed = await db.collection("mentorshipSessions").countDocuments({
      mentorId,
      batchId: data.batchId,
      studentUid: data.studentUid,
      track: "OneOnOne",
      status: { $ne: "cancelled" },
    });

    const usage: StudentSessionUsage = {
      studentUid: data.studentUid,
      sessionsUsed,
      sessionsRemaining: Math.max(0, MAX_SESSIONS_PER_STUDENT - sessionsUsed),
    };
    return { usage };
  });

// Single entry point for all three tracks — the track-specific shape
// requirements (studentUid+duration for A, meetingLink for A/B, lectureUrl+
// title for C) are validated here server-side, not just left to the UI, so
// a malformed request can never create a half-valid session document.
export const createMentorshipSession = createServerFn({ method: "POST" })
  .validator((data: { token: string; session: CreateSessionInput }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.session.batchId);

    const { track, batchId, scheduledAt } = data.session;
    if (!scheduledAt) throw new Error("Set a scheduled date/time for this session.");

    const db = await getDb();

    if (track === "OneOnOne") {
      const { studentUid, durationMinutes } = data.session;
      if (!studentUid) throw new Error("Select a student for a 1:1 session.");
      if (!durationMinutes || durationMinutes <= 0) throw new Error("Enter a valid session duration.");
      if (durationMinutes > MAX_DURATION_MINUTES) {
        throw new Error(`Session duration cannot exceed ${MAX_DURATION_MINUTES} minutes (3 hours).`);
      }
      if (!data.session.meetingLink?.trim()) throw new Error("Provide a meeting link for this 1:1 session.");

      const existingCount = await db.collection("mentorshipSessions").countDocuments({
        mentorId,
        batchId,
        studentUid,
        track: "OneOnOne",
        status: { $ne: "cancelled" },
      });
      if (existingCount >= MAX_SESSIONS_PER_STUDENT) {
        throw new Error(
          `This student has already used all ${MAX_SESSIONS_PER_STUDENT} allotted 1:1 sessions in this batch.`,
        );
      }

      const result = await db.collection("mentorshipSessions").insertOne({
        mentorId,
        batchId,
        track: "OneOnOne",
        studentUid,
        durationMinutes,
        meetingLink: data.session.meetingLink.trim(),
        lectureUrl: null,
        lectureTitle: null,
        scheduledAt,
        status: "scheduled",
        createdAt: new Date(),
      });
      return { ok: true, id: String(result.insertedId) };
    }

    if (track === "BatchMeet") {
      if (!data.session.meetingLink?.trim()) throw new Error("Provide a meeting link for the batch meet.");

      const result = await db.collection("mentorshipSessions").insertOne({
        mentorId,
        batchId,
        track: "BatchMeet",
        studentUid: null,
        durationMinutes: null,
        meetingLink: data.session.meetingLink.trim(),
        lectureUrl: null,
        lectureTitle: null,
        scheduledAt,
        status: "scheduled",
        createdAt: new Date(),
      });
      return { ok: true, id: String(result.insertedId) };
    }

    // track === "AsyncLecture"
    if (!data.session.lectureUrl?.trim()) throw new Error("Provide the Cloudflare Stream / Bunny.net lecture URL.");
    if (!data.session.lectureTitle?.trim()) throw new Error("Give this lecture a title.");

    const result = await db.collection("mentorshipSessions").insertOne({
      mentorId,
      batchId,
      track: "AsyncLecture",
      studentUid: null,
      durationMinutes: null,
      meetingLink: null,
      lectureUrl: data.session.lectureUrl.trim(),
      lectureTitle: data.session.lectureTitle.trim(),
      scheduledAt,
      status: "scheduled",
      createdAt: new Date(),
    });
    return { ok: true, id: String(result.insertedId) };
  });

export const listMentorshipSessions = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string; track?: SessionTrack }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    const filter: Record<string, unknown> = { mentorId, batchId: data.batchId };
    if (data.track) filter.track = data.track;

    const rows = await db
      .collection("mentorshipSessions")
      .find(filter)
      .sort({ scheduledAt: -1 })
      .toArray();

    const sessions: MentorshipSession[] = rows.map((r) => ({
      id: String(r._id),
      mentorId: r.mentorId as string,
      batchId: r.batchId as string,
      track: r.track as SessionTrack,
      studentUid: (r.studentUid as string | null) ?? null,
      durationMinutes: (r.durationMinutes as number | null) ?? null,
      meetingLink: (r.meetingLink as string | null) ?? null,
      lectureUrl: (r.lectureUrl as string | null) ?? null,
      lectureTitle: (r.lectureTitle as string | null) ?? null,
      scheduledAt: r.scheduledAt as string,
      status: r.status as MentorshipSession["status"],
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
    }));

    return { sessions };
  });

export const updateSessionStatus = createServerFn({ method: "POST" })
  .validator((data: { token: string; sessionId: string; status: "completed" | "cancelled" }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const session = await db.collection("mentorshipSessions").findOne({ _id: new ObjectId(data.sessionId) });
    if (!session) throw new Error("Session not found.");
    if (session.mentorId !== mentorId) throw new Error("You do not own this session.");

    await db
      .collection("mentorshipSessions")
      .updateOne({ _id: new ObjectId(data.sessionId) }, { $set: { status: data.status } });
    return { ok: true };
  });

// ─── Track C: Chat/Comment Auditor Canvas ───────────────────────────────────
// NOTE: this covers the mentor's read/moderate side only. The actual
// posting of a comment happens from the student-facing lecture player,
// which doesn't exist as a route yet — a companion `postLectureComment`
// server function belongs in student-data.ts or batch-hub.ts once that
// player UI is built. Flagging so it isn't mistaken for already wired up.
export const listLectureComments = createServerFn({ method: "POST" })
  .validator((data: { token: string; sessionId: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const session = await db.collection("mentorshipSessions").findOne({ _id: new ObjectId(data.sessionId) });
    if (!session) throw new Error("Lecture session not found.");
    if (session.mentorId !== mentorId) throw new Error("You do not own this lecture session.");

    const rows = await db
      .collection("lectureComments")
      .find({ sessionId: data.sessionId })
      .sort({ createdAt: -1 })
      .toArray();

    const comments: LectureComment[] = rows.map((r) => ({
      id: String(r._id),
      sessionId: r.sessionId as string,
      studentUid: r.studentUid as string,
      studentName: r.studentName as string,
      body: r.body as string,
      hidden: Boolean(r.hidden),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
    }));

    return { comments };
  });

export const setLectureCommentVisibility = createServerFn({ method: "POST" })
  .validator((data: { token: string; commentId: string; hidden: boolean }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const comment = await db.collection("lectureComments").findOne({ _id: new ObjectId(data.commentId) });
    if (!comment) throw new Error("Comment not found.");

    const session = await db
      .collection("mentorshipSessions")
      .findOne({ _id: new ObjectId(comment.sessionId as string) });
    if (!session || session.mentorId !== mentorId) {
      throw new Error("You do not have permission to moderate this comment.");
    }

    await db
      .collection("lectureComments")
      .updateOne({ _id: new ObjectId(data.commentId) }, { $set: { hidden: data.hidden } });
    return { ok: true };
  });

  // ─── Module 4: Intermittent Student Chat Desk & Anti-Piracy Document Gate ──
import type { } from "@/lib/admin-types"; // (no new types needed beyond what's added below in admin-types.ts)

// Chat messages are scoped to mentorId + studentUid + batchId — a mentor's
// DM thread with a given student is always batch-specific, matching how
// sessions and announcements are already scoped, rather than one global
// inbox per student.
export const listChatThreads = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    // One thread per distinct studentUid that has ANY message with this
    // mentor in this batch — aggregated rather than a separate "threads"
    // collection, so there's a single source of truth (chatMessages) and
    // no risk of a thread existing with zero messages or vice versa.
    const threads = await db
      .collection("chatMessages")
      .aggregate([
        { $match: { mentorId, batchId: data.batchId } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$studentUid",
            lastMessage: { $first: "$body" },
            lastMessageAt: { $first: "$createdAt" },
            lastSender: { $first: "$sender" },
          },
        },
        { $sort: { lastMessageAt: -1 } },
      ])
      .toArray();

    const studentUids = threads.map((t) => t._id as string);
    const profiles =
      studentUids.length > 0
        ? await db
            .collection("profiles")
            .find({ uid: { $in: studentUids } }, { projection: { uid: 1, fullName: 1 } })
            .toArray()
        : [];
    const nameByUid = new Map(profiles.map((p) => [p.uid as string, (p.fullName as string) || "Student"]));

    return {
      threads: threads.map((t) => ({
        studentUid: t._id as string,
        studentName: nameByUid.get(t._id as string) ?? "Student",
        lastMessage: t.lastMessage as string,
        lastMessageAt: t.lastMessageAt instanceof Date ? t.lastMessageAt.toISOString() : null,
        lastSender: t.lastSender as "mentor" | "student",
      })),
    };
  });

export const listChatMessages = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string; studentUid: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    const rows = await db
      .collection("chatMessages")
      .find({ mentorId, batchId: data.batchId, studentUid: data.studentUid })
      .sort({ createdAt: 1 })
      .toArray();

    return {
      messages: rows.map((r) => ({
        id: String(r._id),
        sender: r.sender as "mentor" | "student",
        body: r.body as string,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

// Mentor-side send. Respects the daily lock window: if the mentor has
// locked messaging for this batch (see setChatLockWindow below), sending
// is blocked server-side — not just visually disabled in the UI — so a
// stale client can't bypass the lock.
export const sendChatMessage = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string; studentUid: string; body: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);
    if (!data.body.trim()) throw new Error("Message cannot be empty.");

    const db = await getDb();
    const lock = await db.collection("chatLockWindows").findOne({ mentorId, batchId: data.batchId });
    if (lock && isCurrentlyLocked(lock.lockedFrom as string, lock.lockedUntil as string)) {
      throw new Error("Messaging is currently locked for this batch. Unlock it to send messages.");
    }

    await db.collection("chatMessages").insertOne({
      mentorId,
      batchId: data.batchId,
      studentUid: data.studentUid,
      sender: "mentor",
      body: data.body.trim(),
      createdAt: new Date(),
    });
    return { ok: true };
  });

// Interval timer lock/unlock — daily recurring window expressed as two
// "HH:MM" strings rather than full datetimes, since the requirement is a
// repeating daily window ("lock messaging outside 6–8 PM every day"), not
// a one-off date range.
function isCurrentlyLocked(lockedFrom: string, lockedUntil: string): boolean {
  if (!lockedFrom || !lockedUntil) return false;
  const now = new Date();
  const [fromH, fromM] = lockedFrom.split(":").map(Number);
  const [untilH, untilM] = lockedUntil.split(":").map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const fromMinutes = fromH * 60 + fromM;
  const untilMinutes = untilH * 60 + untilM;
  // "Locked" window is the range OUTSIDE lockedFrom–lockedUntil (that pair
  // represents the ALLOWED open window); handles overnight wraparound too.
  if (fromMinutes <= untilMinutes) {
    return !(nowMinutes >= fromMinutes && nowMinutes < untilMinutes);
  }
  return !(nowMinutes >= fromMinutes || nowMinutes < untilMinutes);
}

export const setChatLockWindow = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string; enabled: boolean; openFrom: string; openUntil: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    if (!data.enabled) {
      await db.collection("chatLockWindows").deleteOne({ mentorId, batchId: data.batchId });
      return { ok: true };
    }

    await db.collection("chatLockWindows").updateOne(
      { mentorId, batchId: data.batchId },
      { $set: { mentorId, batchId: data.batchId, lockedFrom: data.openFrom, lockedUntil: data.openUntil } },
      { upsert: true },
    );
    return { ok: true };
  });

export const getChatLockWindow = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    const lock = await db.collection("chatLockWindows").findOne({ mentorId, batchId: data.batchId });
    if (!lock) return { window: null, isLockedNow: false };

    const openFrom = lock.lockedFrom as string;
    const openUntil = lock.lockedUntil as string;
    return {
      window: { openFrom, openUntil },
      isLockedNow: isCurrentlyLocked(openFrom, openUntil),
    };
  });

export const listMentorNotes = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    const rows = await db
      .collection("mentorNotes")
      .find({ mentorId, batchId: data.batchId })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      notes: rows.map((r) => ({
        id: String(r._id),
        fileName: r.fileName as string,
        fileUrl: r.fileUrl as string,
        watermarkApplied: Boolean(r.watermarkApplied),
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

  // ─── Module 5: Internal Operations Help Desk (mentor-facing) ────────────────
import type { TicketCategory, TicketStatus, MentorSupportTicket } from "@/lib/admin-types";

export const submitMentorTicket = createServerFn({ method: "POST" })
  .validator((data: { token: string; category: TicketCategory; message: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    if (!data.message.trim()) throw new Error("Describe the issue before submitting.");

    const db = await getDb();
    const result = await db.collection("mentorSupportTickets").insertOne({
      mentorId,
      category: data.category,
      message: data.message.trim(),
      status: "Open",
      adminResponse: null,
      respondedAt: null,
      createdAt: new Date(),
    });
    return { ok: true, id: String(result.insertedId) };
  });

export const listMyMentorTickets = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const db = await getDb();
    const rows = await db
      .collection("mentorSupportTickets")
      .find({ mentorId })
      .sort({ createdAt: -1 })
      .toArray();

    const tickets: MentorSupportTicket[] = rows.map((r) => ({
      id: String(r._id),
      mentorId: r.mentorId as string,
      category: r.category as TicketCategory,
      message: r.message as string,
      status: r.status as TicketStatus,
      adminResponse: (r.adminResponse as string | null) ?? null,
      respondedAt: r.respondedAt instanceof Date ? r.respondedAt.toISOString() : null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
    }));

    return { tickets };
  });

export const listMyLectureLibrary = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const db = await getDb();

    const lectures = await db
      .collection("mentorshipSessions")
      .find({ mentorId, track: "AsyncLecture" })
      .sort({ scheduledAt: -1 })
      .toArray();
    if (lectures.length === 0) return { lectures: [] };

    const sessionIds = lectures.map((l) => String(l._id));
    const batchIds = [...new Set(lectures.map((l) => l.batchId as string))];
    const { ObjectId } = await import("mongodb");

    const [batches, progressRows, commentRows, reviewRows] = await Promise.all([
      db.collection("mentorshipBatches").find({ _id: { $in: batchIds.map((id) => new ObjectId(id)) } }).toArray(),
      db.collection("lectureProgress").find({ sessionId: { $in: sessionIds } }).toArray(),
      db.collection("lectureComments").find({ sessionId: { $in: sessionIds }, hidden: { $ne: true } }).toArray(),
      db.collection("sessionReviews").find({ sessionId: { $in: sessionIds } }).toArray(),
    ]);

    const batchNameById = new Map(batches.map((b) => [String(b._id), b.name as string]));

    return {
      lectures: lectures.map((l) => {
        const sessionId = String(l._id);
        const progress = progressRows.filter((p) => p.sessionId === sessionId);
        const completedCount = progress.filter((p) => p.completed).length;
        const commentCount = commentRows.filter((c) => c.sessionId === sessionId).length;
        const reviews = reviewRows.filter((r) => r.sessionId === sessionId);
        const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.rating as number), 0) / reviews.length : null;

        return {
          id: sessionId,
          batchId: l.batchId as string,
          batchName: batchNameById.get(l.batchId as string) ?? "Batch",
          lectureTitle: l.lectureTitle as string,
          lectureUrl: l.lectureUrl as string,
          scheduledAt: l.scheduledAt as string,
          viewerCount: progress.length,
          completedCount,
          commentCount,
          avgRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
          reviewCount: reviews.length,
        };
      }),
    };
  });

  export const togglePinAnnouncement = createServerFn({ method: "POST" })
  .validator((data: { token: string; announcementId: string; pinned: boolean }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const row = await db.collection("mentorshipBatchAnnouncements").findOne({ _id: new ObjectId(data.announcementId) });
    if (!row || row.mentorId !== mentorId) throw new Error("Announcement not found.");
    await db.collection("mentorshipBatchAnnouncements").updateOne(
      { _id: new ObjectId(data.announcementId) },
      { $set: { pinned: data.pinned } },
    );
    return { ok: true };
  });

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export const editMentorAnnouncement = createServerFn({ method: "POST" })
  .validator((data: { token: string; announcementId: string; title: string; message: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const row = await db.collection("mentorshipBatchAnnouncements").findOne({ _id: new ObjectId(data.announcementId) });
    if (!row || row.mentorId !== mentorId) throw new Error("Announcement not found.");

    const age = Date.now() - (row.createdAt as Date).getTime();
    if (age > EDIT_WINDOW_MS) throw new Error("This announcement can no longer be edited (15-minute window has passed).");

    await db.collection("mentorshipBatchAnnouncements").updateOne(
      { _id: new ObjectId(data.announcementId) },
      { $set: { title: data.title.trim(), message: data.message.trim(), editedAt: new Date() } },
    );
    return { ok: true };
  });

export const deleteMentorAnnouncement = createServerFn({ method: "POST" })
  .validator((data: { token: string; announcementId: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const row = await db.collection("mentorshipBatchAnnouncements").findOne({ _id: new ObjectId(data.announcementId) });
    if (!row || row.mentorId !== mentorId) throw new Error("Announcement not found.");
    await db.collection("mentorshipBatchAnnouncements").deleteOne({ _id: new ObjectId(data.announcementId) });
    return { ok: true };
  });

  // Per-student 1:1 usage across the whole batch, for the visual usage bar —
// batches the per-student getStudentSessionUsage calls into one round trip.
export const listAllStudentSessionUsage = createServerFn({ method: "POST" })
  .validator((data: { token: string; batchId: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    await requireOwnsBatch(mentorId, data.batchId);

    const db = await getDb();
    const rows = await db
      .collection("mentorshipSessions")
      .aggregate([
        { $match: { mentorId, batchId: data.batchId, track: "OneOnOne", status: { $ne: "cancelled" } } },
        { $group: { _id: "$studentUid", count: { $sum: 1 } } },
      ])
      .toArray();

    return {
      usage: rows.map((r) => ({
        studentUid: r._id as string,
        sessionsUsed: r.count as number,
        sessionsRemaining: Math.max(0, 20 - (r.count as number)),
      })),
    };
  });

export const bulkCancelSessions = createServerFn({ method: "POST" })
  .validator((data: { token: string; sessionIds: string[]; reason: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const result = await db.collection("mentorshipSessions").updateMany(
      { _id: { $in: data.sessionIds.map((id) => new ObjectId(id)) }, mentorId, status: "scheduled" },
      { $set: { status: "cancelled", cancelReason: data.reason.trim() || null } },
    );
    return { ok: true, cancelledCount: result.modifiedCount };
  });

export const postMentorLectureComment = createServerFn({ method: "POST" })
  .validator((data: { token: string; sessionId: string; body: string }) => data)
  .handler(async ({ data }) => {
    const mentorId = await requireMentor(data.token);
    if (!data.body.trim()) throw new Error("Comment cannot be empty.");

    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const session = await db.collection("mentorshipSessions").findOne({ _id: new ObjectId(data.sessionId) });
    if (!session) throw new Error("Lecture not found.");
    if (session.mentorId !== mentorId) throw new Error("You do not own this lecture session.");

    const mentor = await db.collection("mentors").findOne({ _id: new ObjectId(mentorId) });

    await db.collection("lectureComments").insertOne({
      sessionId: data.sessionId,
      studentUid: null,
      studentName: null,
      isMentor: true,
      mentorId,
      mentorName: mentor?.name as string,
      mentorProfilePictureUrl: (mentor?.profilePictureUrl as string | null) ?? null,
      body: data.body.trim(),
      hidden: false,
      createdAt: new Date(),
    });

    return { ok: true };
  });