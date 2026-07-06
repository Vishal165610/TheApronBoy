// Shared type system for the Super Admin Content Studio. These mirror the
// MongoDB document shapes we'll actually persist, so every module (built now
// or later) stays consistent with the same schema.

export type Track = "11th" | "12th" | "Dropper";

// ─── Module 1 & 2: Test Series Bundles ──────────────────────────────────────
export type TestSeriesBundle = {
  id: string;
  title: string;
  track: Track;
  features: string[]; // 2-3 marketing pointer strings
  sellingPrice: number;
  crossedPrice: number; // dummy "before discount" price
  uploadWindowStart: string; // ISO date string
  uploadWindowEnd: string;
  expiryDate: string;
  thumbnailUrl: string | null;
  syllabusPdfUrls: string[];
  plannerUrls: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type BundleAnnouncementPayload = {
  id: string;
  bundleId: string;
  message: string | null;
  thumbnailUrl: string | null;
  sendAt: string | null; // null = send immediately
  createdAt: string | null;
};

// ─── Module 3: Test Core (appended inside a bundle) ─────────────────────────
export type SubjectWeightage = {
  subject: string;
  questionCount: number;
};

export type TestCore = {
  id: string;
  bundleId: string;
  name: string;
  totalQuestions: number;
  subjects: string[];
  weightage: SubjectWeightage[];
  liveStart: string; // ISO datetime
  liveEnd: string;
  instructions: string;
  createdAt: string | null;
};

// ─── Module 4: Questions (LaTeX / image / text all share one shape) ─────────
// `body`, each option, and `solution` can each independently be plain text, an
// image URL, or a raw LaTeX string (wrapped in $ or $$) — the renderer decides
// which at display time, so storage is just `string` for all of them.
export type QuestionOptions = {
  A: string;
  B: string;
  C: string;
  D: string;
};

export type Question = {
  id: string;
  bundleId: string;
  testId: string;
  subject: string;
  questionNo: number;
  body: string;
  options: QuestionOptions;
  correctOption: "A" | "B" | "C" | "D";
  solution: string;
  difficulty: "Easy" | "Medium" | "Hard";
  isPYQ: boolean;
  pyqYear?: string;
  createdAt: string | null;
};

// ─── Module 6: Mentors & Mentorship Batches ──────────────────────────────────
export type Mentor = {
  id: string;
  username: string;
  name: string;
  profilePictureUrl: string | null;
  secretCode: string;
  createdAt: string | null;
};

export type MentorshipBatch = {
  id: string;
  thumbnailUrl: string | null;
  name: string;
  highlights: string[];
  track: Track;
  sellingPrice: number;
  crossedPrice: number;
  assignedMentorId: string | null;
  createdAt: string | null;
};

// ─── Module 7: Razorpay Transaction Ledger ──────────────────────────────────
export type Transaction = {
  id: string;
  studentName: string;
  productName: string;
  razorpayTransactionId: string;
  date: string;
  timestamp: string;
};

// ─── Module 8: Student 360 ───────────────────────────────────────────────────
export type StudentProfileSnapshot = {
  uid: string;
  fullName: string;
  email: string | null;
  mobile: string;
  city: string;
  board: string;
  track: string;
};

export type TestAttemptSummary = {
  testId: string;
  testName: string;
  score: number;
  totalMarks: number;
  timeTakenMinutes: number;
  submittedAt: string;
};

export type Student360 = {
  profile: StudentProfileSnapshot;
  purchasedBundles: { bundleId: string; bundleTitle: string; purchasedAt: string }[];
  purchasedMentorshipBatches: { batchId: string; batchName: string; purchasedAt: string }[];
  testAttempts: TestAttemptSummary[];
};