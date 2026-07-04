// SERVER-ONLY. Never import this from a component or client-side file.
import admin from "firebase-admin";

// Safely initialize or retrieve the running app instance
const app = admin.apps.length === 0
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  : admin.app();

// Explicitly export the auth context
export const adminAuth = admin.auth(app);