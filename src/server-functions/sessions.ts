"use server"

import { createServerFn } from "@tanstack/react-start";
import { adminAuth } from "@/lib/firebase-admin";
import { getDb } from "@/lib/mongo";
import { getEvent } from "vinxi/http";

// Called after every successful login (email/password or Google) to record
// or refresh a "device" entry for this user. IP and user-agent are read
// server-side from the request headers rather than trusted from the client.
export const recordSession = createServerFn({ method: "POST" })
  .validator((data: { token: string; deviceId: string; deviceLabel: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await adminAuth.verifyIdToken(data.token);
    
    // Safely retrieve the request context directly from the underlying Nitro/Vinxi server event
    const event = getEvent();
    const headers = event?.node?.req?.headers;
    
    const userAgent = (headers?.["user-agent"] as string) ?? "unknown";
    
    // Parse IP from standardized headers
    const xForwardedFor = headers?.["x-forwarded-for"];
    const ip = 
      (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor?.split(",")[0]?.trim()) ??
      (headers?.["x-real-ip"] as string) ??
      "unknown";

    const db = await getDb();
    const now = new Date();

    await db.collection("sessions").updateOne(
      { uid: decoded.uid, deviceId: data.deviceId },
      {
        $set: {
          uid: decoded.uid,
          deviceId: data.deviceId,
          deviceLabel: data.deviceLabel,
          userAgent,
          ip,
          lastSeenAt: now,
        },
        $setOnInsert: { firstSeenAt: now },
      },
      { upsert: true },
    );

    return { ok: true };
  });

export const listSessions = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await adminAuth.verifyIdToken(data.token);
    const db = await getDb();
    const sessions = await db
      .collection("sessions")
      .find({ uid: decoded.uid })
      .sort({ lastSeenAt: -1 })
      .toArray();

    return {
      sessions: sessions.map((s) => ({
        deviceId: s.deviceId as string,
        deviceLabel: s.deviceLabel as string,
        ip: s.ip as string,
        firstSeenAt: s.firstSeenAt instanceof Date ? s.firstSeenAt.toISOString() : null,
        lastSeenAt: s.lastSeenAt instanceof Date ? s.lastSeenAt.toISOString() : null,
      })),
    };
  });

// Removes the tracking record for one device entry from the list. NOTE: this
// does NOT force that device to log out — Firebase ID tokens stay valid
// until they expire (~1 hour) or the user signs out there themselves.
// Firebase doesn't support revoking a single device's session; only ALL
// sessions at once (see revokeAllSessions below).
export const forgetDevice = createServerFn({ method: "POST" })
  .validator((data: { token: string; deviceId: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await adminAuth.verifyIdToken(data.token);
    const db = await getDb();
    await db.collection("sessions").deleteOne({ uid: decoded.uid, deviceId: data.deviceId });
    return { ok: true };
  });

// Signs the user out EVERYWHERE by revoking all of their refresh tokens.
// Every device (including the current one) will need to sign in again the
// next time its ID token expires or refreshes.
export const revokeAllSessions = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const decoded = await adminAuth.verifyIdToken(data.token);
    await adminAuth.revokeRefreshTokens(decoded.uid);
    const db = await getDb();
    await db.collection("sessions").deleteMany({ uid: decoded.uid });
    return { ok: true };
  });