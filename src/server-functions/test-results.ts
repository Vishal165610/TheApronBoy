// Server functions backing the Test Result page: a private, detailed
// review of one specific attempt (only the owner can view it), and a
// public-to-purchasers leaderboard for that test.
import { createServerFn } from "@tanstack/react-start";
import { adminAuth } from "@/lib/firebase-admin";
import { getDb } from "@/lib/mongo";

async function requireSignedIn(token: string) {
  return adminAuth.verifyIdToken(token);
}

type OptionKey = "A" | "B" | "C" | "D";

// ─── Full attempt detail + question-by-question review ────────────────────
export const getTestAttempt = createServerFn({ method: "GET" })
  .validator((data: { token: string; attemptId: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const attempt = await db.collection("testAttempts").findOne({ _id: new ObjectId(data.attemptId) });
    if (!attempt) throw new Error("Attempt not found");

    // Only the student who took this attempt can view its detail — an
    // attemptId is guessable-ish (Mongo ObjectId), so this check matters.
    if (attempt.uid !== decoded.uid) {
      throw new Error("You don't have access to this attempt.");
    }

    const questionResults = (attempt.questionResults ?? []) as {
      questionId: string;
      questionNo: number;
      subject: string;
      selectedOption: OptionKey | null;
      correctOption: OptionKey;
      isCorrect: boolean;
      marksAwarded: number;
    }[];

    // questionResults only stored the graded outcome, not the actual
    // question text/options/solution — fetch those now (safe to show in
    // full, including the solution, since the test is already submitted).
    const { ObjectId: OID } = await import("mongodb");
    const questionDocs = await db
      .collection("questions")
      .find({ _id: { $in: questionResults.map((q) => new OID(q.questionId)) } })
      .toArray();
    const questionById = new Map(questionDocs.map((q) => [String(q._id), q]));

    const review = questionResults
      .map((r) => {
        const doc = questionById.get(r.questionId);
        if (!doc) return null;
        return {
          questionNo: r.questionNo,
          subject: r.subject,
          body: doc.body as string,
          options: doc.options as Record<OptionKey, string>,
          solution: doc.solution as string,
          selectedOption: r.selectedOption,
          correctOption: r.correctOption,
          isCorrect: r.isCorrect,
          marksAwarded: r.marksAwarded,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (a.subject === b.subject ? a.questionNo - b.questionNo : a.subject.localeCompare(b.subject)));

    return {
      attempt: {
        id: String(attempt._id),
        testId: attempt.testId as string,
        testName: attempt.testName as string,
        attemptNumber: attempt.attemptNumber as number,
        score: attempt.score as number,
        totalMarks: attempt.totalMarks as number,
        correctCount: attempt.correctCount as number,
        incorrectCount: attempt.incorrectCount as number,
        unansweredCount: attempt.unansweredCount as number,
        timeTakenMinutes: attempt.timeTakenMinutes as number,
        subjectBreakdown: (attempt.subjectBreakdown ?? []) as {
          subject: string;
          correct: number;
          incorrect: number;
          unanswered: number;
          marks: number;
        }[],
        submittedAt: attempt.submittedAt instanceof Date ? attempt.submittedAt.toISOString() : null,
      },
      review,
    };
  });

// ─── Leaderboard for a test (ranked by each student's BEST attempt) ────────
export const getLeaderboard = createServerFn({ method: "GET" })
  .validator((data: { token: string; testId: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const db = await getDb();

    // One row per student — their highest score on this test — so retrying
    // a test can't be used to flood the board with duplicate entries.
    const bestAttempts = await db
      .collection("testAttempts")
      .aggregate([
        { $match: { testId: data.testId } },
        { $sort: { score: -1, timeTakenMinutes: 1 } },
        { $group: { _id: "$uid", score: { $first: "$score" }, totalMarks: { $first: "$totalMarks" } } },
        { $sort: { score: -1 } },
      ])
      .toArray();

    const uids = bestAttempts.map((r) => r._id as string);
    const profiles = await db
      .collection("profiles")
      .find({ uid: { $in: uids } }, { projection: { uid: 1, fullName: 1 } })
      .toArray();
    const nameByUid = new Map(profiles.map((p) => [p.uid as string, (p.fullName as string) || "Student"]));

    const ranked = bestAttempts.map((r, i) => ({
      rank: i + 1,
      uid: r._id as string,
      name: nameByUid.get(r._id as string) ?? "Student",
      score: r.score as number,
      totalMarks: r.totalMarks as number,
      isYou: r._id === decoded.uid,
    }));

    const yourEntry = ranked.find((r) => r.isYou) ?? null;

    return {
      top: ranked.slice(0, 20),
      yourRank: yourEntry ? { rank: yourEntry.rank, score: yourEntry.score, totalMarks: yourEntry.totalMarks } : null,
      totalParticipants: ranked.length,
    };
  });