// Cache invalidation token: alpha-force-rebuild-3
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Prevent multiple initializations in serverless environments
const app = admin.apps.length === 0
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  : admin.apps[0];

export const adminAuth = admin.auth(app);