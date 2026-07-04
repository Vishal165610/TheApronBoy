// SERVER-ONLY. Never import this from a component or client-side file.
import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Safely initialize or retrieve the running app instance
const app = !getApps().length 
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  : getApp();

// Explicitly pass the app instance to getAuth to avoid SDK instantiation issues
export const adminAuth = getAuth(app);