// Server functions for the actual CBT test-taking engine. Two important
// security properties enforced here, not just in the UI:
//   1. Purchase is re-checked server-side before handing out questions —
//      the paywall isn't just a client-side visual lock.
//   2. Grading happens server-side. getTestForTaking deliberately never
//      sends `correctOption` or `solution` to the client — only after
//      submitTestAttempt runs does the score get computed and returned.
//      Sending correct answers to the browser during an active exam would
//      make them readable via dev tools/network tab.
import { createServerFn } from "@tanstack/react-start";
import { adminAuth } from "@/lib/firebase-admin";
import { getDb } from "@/lib/mongo";

async function requireSignedIn(token: string) {
  return adminAuth.verifyIdToken(token);
}

export const getTestForTaking = createServerFn({ method: "GET" })
  .validator((data: { token: string; testId: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const test = await db.collection("testCores").findOne({ _id: new ObjectId(data.testId) });
    if (!test) throw new Error("Test not found");

    // Re-verify purchase server-side — never trust a client-side isPurchased
    // flag alone to gate access to actual exam content.
    const purchase = await db.collection("purchases").findOne({
      uid: decoded.uid,
      itemType: "bundle",
      itemId: test.bundleId as string,
    });
    if (!purchase) throw new Error("This batch hasn't been purchased.");

    const questionDocs = await db
      .collection("questions")
      .find({ testId: data.testId })
      .sort({ subject: 1, questionNo: 1 })
      .toArray();

    return {
      test: {
        id: String(test._id),
        name: test.name as string,
        subjects: (test.subjects as string[]) ?? [],
        totalQuestions: test.totalQuestions as number,
        timeLimitMinutes: (test.timeLimitMinutes as number) ?? 180,
      },
      questions: questionDocs.map((q) => ({
        id: String(q._id),
        subject: q.subject as string,
        questionNo: q.questionNo as number,
        body: q.body as string,
        options: q.options as { A: string; B: string; C: string; D: string },
        // Deliberately omitted: correctOption, solution.
      })),
    };
  });

export const submitTestAttempt = createServerFn({ method: "POST" })
  .validator(
    (data: {
      token: string;
      testId: string;
      answers: Record<string, "A" | "B" | "C" | "D" | undefined>;
      timeTakenMinutes: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const test = await db.collection("testCores").findOne({ _id: new ObjectId(data.testId) });
    if (!test) throw new Error("Test not found");

    const purchase = await db.collection("purchases").findOne({
      uid: decoded.uid,
      itemType: "bundle",
      itemId: test.bundleId as string,
    });
    if (!purchase) throw new Error("This batch hasn't been purchased.");

    const questionDocs = await db.collection("questions").find({ testId: data.testId }).toArray();

    // Standard NEET marking scheme: +4 correct, -1 incorrect, 0 unanswered.
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    for (const q of questionDocs) {
      const given = data.answers[String(q._id)];
      if (!given) {
        unansweredCount++;
      } else if (given === q.correctOption) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    }

    const score = correctCount * 4 - incorrectCount * 1;
    const totalMarks = questionDocs.length * 4;

    await db.collection("testAttempts").insertOne({
      uid: decoded.uid,
      testId: data.testId,
      testName: test.name as string,
      bundleId: test.bundleId as string,
      score,
      totalMarks,
      correctCount,
      incorrectCount,
      unansweredCount,
      timeTakenMinutes: data.timeTakenMinutes,
      submittedAt: new Date(),
    });

    return { score, totalMarks, correctCount, incorrectCount, unansweredCount };
  });