import { createServerFn } from "@tanstack/react-start";
import { adminAuth } from "@/lib/firebase-admin";
import { getDb } from "@/lib/mongo";
import { scryptSync, randomBytes } from "node:crypto";

// ─── Authorization helper ────────────────────────────────────────────────
// Every admin-only server function below calls this first. It verifies the
// Firebase ID token AND checks for the `admin: true` custom claim baked into
// that token. Claims only appear in tokens minted/refreshed after promotion,
// so the client must force-refresh (getIdToken(true)) right after being
// granted admin access.
async function requireAdmin(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  if (decoded.admin !== true) {
    throw new Error("Forbidden: admin access required");
  }
  return decoded;
}

// ─── Admin auth / claim bootstrap ────────────────────────────────────────
// Called after every admin sign-in or sign-up. Checks the shared passkey
// (ADMIN_PASSKEY env var) as a second factor. If the passkey is correct and
// the user isn't already an admin, this is what actually grants the
// `admin: true` custom claim for the first time — i.e. this IS the
// "become an admin" moment, gated entirely by knowing the passkey.
export const verifyAdminAccess = createServerFn({ method: "POST" })
  .validator((data: { token: string; passkey: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSKEY;
    if (!expected) {
      throw new Error("Server misconfigured: ADMIN_PASSKEY is not set");
    }
    if (data.passkey !== expected) {
      throw new Error("Invalid passkey");
    }

    const decoded = await adminAuth.verifyIdToken(data.token);
    if (decoded.admin === true) {
      return { ok: true, alreadyAdmin: true };
    }

    await adminAuth.setCustomUserClaims(decoded.uid, { admin: true });
    return { ok: true, promoted: true };
  });

// ─── Module 1: Executive Analytics ───────────────────────────────────────
export const getAdminAnalytics = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();

    const totalStudents = await db.collection("profiles").countDocuments();

    // These three don't have a real data source wired up yet — no
    // testAttempts / mentorshipSlots / purchases collections exist, and
    // there's no Razorpay sync. Returning null (rendered as "—" in the UI)
    // rather than a fabricated number.
    return {
      totalStudents,
      activeMentorshipSessions: null as number | null,
      monthlyRevenue: null as number | null,
      mockTestsTaken: null as number | null,
    };
  });

// ─── Module 3: Student Directory ─────────────────────────────────────────
export const listStudents = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();

    const [students, deviceCounts] = await Promise.all([
      db
        .collection("profiles")
        .find({}, { projection: { uid: 1, fullName: 1, email: 1, track: 1, targetExam: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray(),
      db
        .collection("sessions")
        .aggregate([{ $group: { _id: "$uid", count: { $sum: 1 } } }])
        .toArray(),
    ]);

    const deviceCountByUid = new Map(deviceCounts.map((d) => [d._id as string, d.count as number]));

    return {
      students: students.map((s) => ({
        uid: s.uid as string,
        fullName: (s.fullName as string) || "",
        email: (s.email as string | null) ?? null,
        track: (s.track as string) || "",
        targetExam: (s.targetExam as string) || "",
        deviceCount: deviceCountByUid.get(s.uid as string) ?? 0,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : null,
      })),
    };
  });

// Admin-privileged lookup of another user's device sessions (for the
// "view logged-in devices" action in the Student Directory).
export const adminListDevicesForUser = createServerFn({ method: "POST" })
  .validator((data: { token: string; uid: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const sessions = await db
      .collection("sessions")
      .find({ uid: data.uid })
      .sort({ lastSeenAt: -1 })
      .toArray();

    return {
      sessions: sessions.map((s) => ({
        deviceId: s.deviceId as string,
        deviceLabel: s.deviceLabel as string,
        ip: s.ip as string,
        lastSeenAt: s.lastSeenAt instanceof Date ? s.lastSeenAt.toISOString() : null,
      })),
    };
  });

// ─── Module 2: Test Series Manager ───────────────────────────────────────
type TestSeriesInput = {
  title: string;
  subject: "Physics" | "Chemistry" | "Biology" | "Full-Length Mock";
  totalMarks: number;
  timeLimitMinutes: number;
  track: "Dropper" | "11th" | "12th" | "All";
};

export const createTestSeries = createServerFn({ method: "POST" })
  .validator((data: { token: string; testSeries: TestSeriesInput }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    await db.collection("testSeries").insertOne({
      ...data.testSeries,
      createdAt: new Date(),
      // CBT engine mapping is not built yet — this flag just records intent
      // so the future engine-sync job knows which rows still need mapping.
      cbtEngineSynced: false,
    });
    return { ok: true };
  });

export const listTestSeriesAdmin = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db.collection("testSeries").find({}).sort({ createdAt: -1 }).toArray();
    return {
      testSeries: rows.map((r) => ({
        id: String(r._id),
        title: r.title as string,
        subject: r.subject as string,
        totalMarks: r.totalMarks as number,
        timeLimitMinutes: r.timeLimitMinutes as number,
        track: r.track as string,
        cbtEngineSynced: Boolean(r.cbtEngineSynced),
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

// ─── Test Series Bundles ─────────────────────────────────────────────────
type BundleInput = {
  title: string;
  track: "11th" | "12th" | "Dropper";
  features: string[];
  sellingPrice: number;
  crossedPrice: number;
  uploadWindowStart: string;
  uploadWindowEnd: string;
  expiryDate: string;
  thumbnailUrl: string | null;
  syllabusPdfUrls: string[];
  plannerUrls: string[];
};

export const createBundle = createServerFn({ method: "POST" })
  .validator((data: { token: string; bundle: BundleInput }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const now = new Date();
    const result = await db.collection("bundles").insertOne({
      ...data.bundle,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, id: String(result.insertedId) };
  });

export const listBundles = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db.collection("bundles").find({}).sort({ createdAt: -1 }).toArray();
    return {
      bundles: rows.map((r) => ({
        id: String(r._id),
        title: r.title as string,
        track: r.track as string,
        features: (r.features as string[]) ?? [],
        sellingPrice: r.sellingPrice as number,
        crossedPrice: r.crossedPrice as number,
        uploadWindowStart: r.uploadWindowStart as string,
        uploadWindowEnd: r.uploadWindowEnd as string,
        expiryDate: r.expiryDate as string,
        thumbnailUrl: (r.thumbnailUrl as string | null) ?? null,
        syllabusPdfUrls: (r.syllabusPdfUrls as string[]) ?? [],
        plannerUrls: (r.plannerUrls as string[]) ?? [],
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : null,
      })),
    };
  });

export const updateBundle = createServerFn({ method: "POST" })
  .validator((data: { token: string; id: string; bundle: Partial<BundleInput> }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    await db.collection("bundles").updateOne(
      { _id: new ObjectId(data.id) },
      { $set: { ...data.bundle, updatedAt: new Date() } },
    );
    return { ok: true };
  });

// Targeted announcement tied to a specific bundle. NOTE: this stores the
// intent (send to buyers of this bundle) but doesn't yet actually filter
// recipients by purchase — there's no `purchases` collection with real
// Razorpay-confirmed orders wired up yet. Once that exists, a delivery job
// can read bundleId here and resolve it to actual recipient uids.
type BundleAnnouncementInput = {
  bundleId: string;
  message: string | null;
  thumbnailUrl: string | null;
  sendAt: string | null;
};

export const postBundleAnnouncement = createServerFn({ method: "POST" })
  .validator((data: { token: string; announcement: BundleAnnouncementInput }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    await db.collection("bundleAnnouncements").insertOne({
      ...data.announcement,
      createdAt: new Date(),
    });
    return { ok: true };
  });

export const listBundleAnnouncements = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db
      .collection("bundleAnnouncements")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return {
      announcements: rows.map((r) => ({
        id: String(r._id),
        bundleId: r.bundleId as string,
        message: (r.message as string | null) ?? null,
        thumbnailUrl: (r.thumbnailUrl as string | null) ?? null,
        sendAt: (r.sendAt as string | null) ?? null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

// ─── Module 3: Test Core (tests nested inside a bundle) ─────────────────────
type SubjectWeightageInput = { subject: string; questionCount: number };

type TestCoreInput = {
  bundleId: string;
  name: string;
  totalQuestions: number;
  subjects: string[];
  weightage: SubjectWeightageInput[];
  liveStart: string;
  liveEnd: string;
  instructions: string;
};

export const createTestCore = createServerFn({ method: "POST" })
  .validator((data: { token: string; testCore: TestCoreInput }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const result = await db.collection("testCores").insertOne({
      ...data.testCore,
      createdAt: new Date(),
    });
    return { ok: true, id: String(result.insertedId) };
  });

export const listTestCoresForBundle = createServerFn({ method: "GET" })
  .validator((data: { token: string; bundleId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db
      .collection("testCores")
      .find({ bundleId: data.bundleId })
      .sort({ createdAt: -1 })
      .toArray();
    return {
      testCores: rows.map((r) => ({
        id: String(r._id),
        bundleId: r.bundleId as string,
        name: r.name as string,
        totalQuestions: r.totalQuestions as number,
        subjects: (r.subjects as string[]) ?? [],
        weightage: (r.weightage as SubjectWeightageInput[]) ?? [],
        liveStart: r.liveStart as string,
        liveEnd: r.liveEnd as string,
        instructions: (r.instructions as string) ?? "",
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

export const updateTestCore = createServerFn({ method: "POST" })
  .validator((data: { token: string; id: string; testCore: Partial<TestCoreInput> }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    await db.collection("testCores").updateOne(
      { _id: new ObjectId(data.id) },
      { $set: { ...data.testCore } },
    );
    return { ok: true };
  });


export const listQuestions = createServerFn({ method: "GET" })
  .validator((data: { token: string; bundleId: string; testId: string; subject: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db
      .collection("questions")
      .find({ bundleId: data.bundleId, testId: data.testId, subject: data.subject })
      .sort({ questionNo: 1 })
      .toArray();
    return {
      questions: rows.map((r) => ({
        id: String(r._id),
        bundleId: r.bundleId as string,
        testId: r.testId as string,
        subject: r.subject as string,
        questionNo: r.questionNo as number,
        body: r.body as string,
        options: r.options as QuestionInput["options"],
        correctOption: r.correctOption as QuestionInput["correctOption"],
        solution: r.solution as string,
        difficulty: r.difficulty as QuestionInput["difficulty"],
        isPYQ: Boolean(r.isPYQ),
        pyqYear: (r.pyqYear as string) ?? undefined,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });



// ─── Module 4: Question Ingestion ───────────────────────────────────────────
type QuestionInput = {
  bundleId: string;
  testId: string;
  subject: string;
  questionNo: number;
  body: string;
  options: { A: string; B: string; C: string; D: string };
  correctOption: "A" | "B" | "C" | "D";
  solution: string;
  difficulty: "Easy" | "Medium" | "Hard";
  isPYQ: boolean;
  pyqYear?: string;
};

export const createQuestion = createServerFn({ method: "POST" })
  .validator((data: { token: string; question: QuestionInput }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const result = await db.collection("questions").insertOne({
      ...data.question,
      createdAt: new Date(),
    });
    return { ok: true, id: String(result.insertedId) };
  });

export const listQuestionsForTestSubject = createServerFn({ method: "GET" })
  .validator((data: { token: string; testId: string; subject: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db
      .collection("questions")
      .find({ testId: data.testId, subject: data.subject })
      .sort({ questionNo: 1 })
      .toArray();
    return {
      questions: rows.map((r) => ({
        id: String(r._id),
        bundleId: r.bundleId as string,
        testId: r.testId as string,
        subject: r.subject as string,
        questionNo: r.questionNo as number,
        body: r.body as string,
        options: r.options as { A: string; B: string; C: string; D: string },
        correctOption: r.correctOption as "A" | "B" | "C" | "D",
        solution: r.solution as string,
        difficulty: r.difficulty as "Easy" | "Medium" | "Hard",
        isPYQ: Boolean(r.isPYQ),
        pyqYear: (r.pyqYear as string) ?? undefined,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });


export const updateQuestion = createServerFn({ method: "POST" })
  .validator((data: { token: string; id: string; question: Partial<QuestionInput> }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    await db.collection("questions").updateOne(
      { _id: new ObjectId(data.id) },
      { $set: { ...data.question } },
    );
    return { ok: true };
  });

export const listQuestionsForTest = createServerFn({ method: "GET" })
  .validator((data: { token: string; testId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db
      .collection("questions")
      .find({ testId: data.testId })
      .sort({ subject: 1, questionNo: 1 })
      .toArray();
    return {
      questions: rows.map((r) => ({
        id: String(r._id),
        bundleId: r.bundleId as string,
        testId: r.testId as string,
        subject: r.subject as string,
        questionNo: r.questionNo as number,
        body: r.body as string,
        options: r.options as { A: string; B: string; C: string; D: string },
        correctOption: r.correctOption as "A" | "B" | "C" | "D",
        solution: r.solution as string,
        difficulty: r.difficulty as "Easy" | "Medium" | "Hard",
        isPYQ: Boolean(r.isPYQ),
        pyqYear: (r.pyqYear as string) ?? undefined,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });


export const deleteQuestion = createServerFn({ method: "POST" })
  .validator((data: { token: string; id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    await db.collection("questions").deleteOne({ _id: new ObjectId(data.id) });
    return { ok: true };
  });

// ─── Module 6: Mentor Allocation & Schedule Hub ─────────────────────────────

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

type MentorOnboardingInput = {
  username: string;
  password: string;
  secretCode: string;
  name: string;
};

export const createMentor = createServerFn({ method: "POST" })
  .validator((data: { token: string; mentor: MentorOnboardingInput }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();

    const existing = await db.collection("mentors").findOne({ username: data.mentor.username });
    if (existing) throw new Error("A mentor with this username already exists.");

    // Password is hashed here, never stored or returned in plain text — even
    // though there's no mentor login flow consuming it yet, storing
    // plaintext passwords is a bad habit to start regardless.
    const { hash, salt } = hashPassword(data.mentor.password);

    const result = await db.collection("mentors").insertOne({
      username: data.mentor.username,
      name: data.mentor.name,
      secretCode: data.mentor.secretCode,
      passwordHash: hash,
      passwordSalt: salt,
      profilePictureUrl: null,
      trackingIndex: "",
      // Mentor Portal (Module 6b) fields — seeded empty on creation so every
      // mentor document has a uniform shape from day one. aboutText /
      // yearOfStudy / introVideoUrl are mentor-editable (updateMyMentorProfile
      // in mentor-auth.ts); aiimsIitRank / enrolledCollege / pursuedCourse are
      // Super Admin-only (updateMentorLockedInfo in mentor-auth.ts).
      aboutText: "",
      yearOfStudy: "",
      introVideoUrl: null,
      aiimsIitRank: "",
      enrolledCollege: "",
      pursuedCourse: "",
      createdAt: new Date(),
    });
    return { ok: true, id: String(result.insertedId) };
  });

export const listMentors = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db.collection("mentors").find({}).sort({ createdAt: -1 }).toArray();
    return {
      // Deliberately excludes passwordHash/passwordSalt — never sent to the client.
      mentors: rows.map((r) => ({
        id: String(r._id),
        username: r.username as string,
        name: r.name as string,
        secretCode: r.secretCode as string,
        profilePictureUrl: (r.profilePictureUrl as string | null) ?? null,
        trackingIndex: (r.trackingIndex as string) ?? "",
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

export const updateMentorProfile = createServerFn({ method: "POST" })
  .validator(
    (data: { token: string; id: string; profile: { name: string; profilePictureUrl: string | null; trackingIndex: string } }) =>
      data,
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    await db.collection("mentors").updateOne({ _id: new ObjectId(data.id) }, { $set: data.profile });
    return { ok: true };
  });

type MentorshipBatchInput = {
  thumbnailUrl: string | null;
  name: string;
  highlights: string[];
  track: "11th" | "12th" | "Dropper";
  sellingPrice: number;
  crossedPrice: number;
  assignedMentorId: string | null;
};

export const createMentorshipBatch = createServerFn({ method: "POST" })
  .validator((data: { token: string; batch: MentorshipBatchInput }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const result = await db.collection("mentorshipBatches").insertOne({
      ...data.batch,
      createdAt: new Date(),
    });
    return { ok: true, id: String(result.insertedId) };
  });

export const listMentorshipBatches = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db.collection("mentorshipBatches").find({}).sort({ createdAt: -1 }).toArray();
    return {
      batches: rows.map((r) => ({
        id: String(r._id),
        thumbnailUrl: (r.thumbnailUrl as string | null) ?? null,
        name: r.name as string,
        highlights: (r.highlights as string[]) ?? [],
        track: r.track as string,
        sellingPrice: r.sellingPrice as number,
        crossedPrice: r.crossedPrice as number,
        assignedMentorId: (r.assignedMentorId as string | null) ?? null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

export const updateMentorshipBatch = createServerFn({ method: "POST" })
  .validator((data: { token: string; id: string; batch: Partial<MentorshipBatchInput> }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    await db.collection("mentorshipBatches").updateOne(
      { _id: new ObjectId(data.id) },
      { $set: { ...data.batch } },
    );
    return { ok: true };
  });

// ─── Global Announcement Broadcast (platform-wide, non-bundle-specific) ──
type AnnouncementTrack = "All" | "Dropper" | "11th" | "12th";

export const postAnnouncement = createServerFn({ method: "POST" })
  .validator((data: { token: string; message: string; track: AnnouncementTrack }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    await db.collection("announcements").insertOne({
      message: data.message,
      track: data.track,
      createdAt: new Date(),
    });
    return { ok: true };
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();
    const rows = await db.collection("announcements").find({}).sort({ createdAt: -1 }).limit(50).toArray();
    return {
      announcements: rows.map((r) => ({
        id: String(r._id),
        message: r.message as string,
        track: r.track as string,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

  // ─── Module 12: Mentor Support Ticket Management (Super Admin side) ─────────
export const listAllMentorTickets = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const db = await getDb();

    const rows = await db
      .collection("mentorSupportTickets")
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const mentorIds = [...new Set(rows.map((r) => r.mentorId as string))];
    const { ObjectId } = await import("mongodb");
    const mentors =
      mentorIds.length > 0
        ? await db
            .collection("mentors")
            .find({ _id: { $in: mentorIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } })
            .toArray()
        : [];
    const nameByMentorId = new Map(mentors.map((m) => [String(m._id), m.name as string]));

    return {
      tickets: rows.map((r) => ({
        id: String(r._id),
        mentorId: r.mentorId as string,
        mentorName: nameByMentorId.get(r.mentorId as string) ?? "Unknown mentor",
        category: r.category as string,
        message: r.message as string,
        status: r.status as string,
        adminResponse: (r.adminResponse as string | null) ?? null,
        respondedAt: r.respondedAt instanceof Date ? r.respondedAt.toISOString() : null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });

export const respondToMentorTicket = createServerFn({ method: "POST" })
  .validator(
    (data: { token: string; ticketId: string; adminResponse: string; status: "Open" | "In Progress" | "Resolved" }) =>
      data,
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const result = await db.collection("mentorSupportTickets").updateOne(
      { _id: new ObjectId(data.ticketId) },
      {
        $set: {
          adminResponse: data.adminResponse.trim() || null,
          status: data.status,
          respondedAt: new Date(),
        },
      },
    );
    if (result.matchedCount === 0) throw new Error("Ticket not found.");
    return { ok: true };
  });