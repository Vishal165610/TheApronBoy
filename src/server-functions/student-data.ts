// Server functions for the student's own account-wide views: real purchase
// history (Transaction History + My Purchases page), per-batch performance
// aggregation (Profile page), and platform-level support tickets (Help page,
// as opposed to the per-batch tickets in batch-hub.ts).
import { createServerFn } from "@tanstack/react-start";
import { adminAuth } from "@/lib/firebase-admin";
import { getDb } from "@/lib/mongo";

async function requireSignedIn(token: string) {
  return adminAuth.verifyIdToken(token);
}

// ─── Purchase history (used by both Profile's Transaction History section
// and the dedicated "My Purchases" page) ────────────────────────────────────
export const getMyPurchases = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const purchases = await db
      .collection("purchases")
      .find({ uid: decoded.uid })
      .sort({ purchasedAt: -1 })
      .toArray();

    const bundleIds = purchases.filter((p) => p.itemType === "bundle").map((p) => new ObjectId(p.itemId as string));
    const mentorshipIds = purchases
      .filter((p) => p.itemType === "mentorship")
      .map((p) => new ObjectId(p.itemId as string));

    const [bundles, mentorshipBatches] = await Promise.all([
      bundleIds.length > 0 ? db.collection("bundles").find({ _id: { $in: bundleIds } }).toArray() : [],
      mentorshipIds.length > 0
        ? db.collection("mentorshipBatches").find({ _id: { $in: mentorshipIds } }).toArray()
        : [],
    ]);
    const bundleById = new Map(bundles.map((b) => [String(b._id), b]));
    const mentorshipById = new Map(mentorshipBatches.map((b) => [String(b._id), b]));

    return {
      purchases: purchases.map((p) => {
        const item =
          p.itemType === "bundle" ? bundleById.get(p.itemId as string) : mentorshipById.get(p.itemId as string);
        return {
          itemType: p.itemType as "bundle" | "mentorship",
          itemId: p.itemId as string,
          title: item ? ((p.itemType === "bundle" ? item.title : item.name) as string) : "Item no longer available",
          track: (item?.track as string) ?? null,
          thumbnailUrl: (item?.thumbnailUrl as string | null) ?? null,
          amount: p.amount as number,
          razorpayPaymentId: p.razorpayPaymentId as string,
          purchasedAt: p.purchasedAt instanceof Date ? p.purchasedAt.toISOString() : null,
        };
      }),
    };
  });

// ─── Per-batch performance summary (Profile page) ──────────────────────────
export const getMyBatchPerformance = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    const purchasedBundles = await db
      .collection("purchases")
      .find({ uid: decoded.uid, itemType: "bundle" })
      .toArray();
    if (purchasedBundles.length === 0) return { batches: [] };

    const bundleIds = purchasedBundles.map((p) => p.itemId as string);
    const bundles = await db
      .collection("bundles")
      .find({ _id: { $in: bundleIds.map((id) => new ObjectId(id)) } })
      .toArray();
    const bundleTitleById = new Map(bundles.map((b) => [String(b._id), b.title as string]));

    const attempts = await db
      .collection("testAttempts")
      .find({ uid: decoded.uid, bundleId: { $in: bundleIds } })
      .toArray();

    const byBundleId = new Map<
      string,
      { testIds: Set<string>; attemptCount: number; totalPercent: number; bestPercent: number }
    >();

    for (const a of attempts) {
      const bundleId = a.bundleId as string;
      const entry = byBundleId.get(bundleId) ?? {
        testIds: new Set<string>(),
        attemptCount: 0,
        totalPercent: 0,
        bestPercent: 0,
      };
      entry.testIds.add(a.testId as string);
      entry.attemptCount += 1;
      const percent = a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0;
      entry.totalPercent += percent;
      entry.bestPercent = Math.max(entry.bestPercent, percent);
      byBundleId.set(bundleId, entry);
    }

    return {
      batches: bundleIds.map((bundleId) => {
        const stats = byBundleId.get(bundleId);
        return {
          bundleId,
          bundleTitle: bundleTitleById.get(bundleId) ?? "Bundle",
          testsAttempted: stats?.testIds.size ?? 0,
          totalAttempts: stats?.attemptCount ?? 0,
          averagePercent: stats ? Math.round(stats.totalPercent / stats.attemptCount) : 0,
          bestPercent: stats ? Math.round(stats.bestPercent) : 0,
        };
      }),
    };
  });

// ─── Platform-level Help tickets (general queries, not tied to a batch) ────
export const submitPlatformTicket = createServerFn({ method: "POST" })
  .validator((data: { token: string; subject: string; message: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const db = await getDb();
    await db.collection("supportTickets").insertOne({
      uid: decoded.uid,
      itemType: "platform",
      itemId: null,
      subject: data.subject,
      message: data.message,
      status: "open",
      createdAt: new Date(),
    });
    return { ok: true };
  });

export const listMyPlatformTickets = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await requireSignedIn(data.token);
    const db = await getDb();
    const rows = await db
      .collection("supportTickets")
      .find({ uid: decoded.uid, itemType: "platform" })
      .sort({ createdAt: -1 })
      .toArray();
    return {
      tickets: rows.map((r) => ({
        id: String(r._id),
        subject: r.subject as string,
        message: r.message as string,
        status: r.status as string,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : null,
      })),
    };
  });