import { apps, initializeApp, credential, auth } from "firebase-admin";

// Safely initialize the application context using direct ESM bindings
const app = apps.length === 0
  ? initializeApp({
      credential: credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  : apps[0];

// Export the auth client directly
export const adminAuth = auth(app);