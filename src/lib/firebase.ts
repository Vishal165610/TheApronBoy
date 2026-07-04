import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Guard against re-initializing during HMR
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Explicit local persistence: the user stays logged in across page reloads
// and browser restarts (until they sign out) rather than only for the tab
// session. This is the default for web already, but set explicitly so the
// behavior doesn't depend on Firebase's default changing.
if (typeof window !== "undefined") {
  void setPersistence(auth, browserLocalPersistence);
}

const googleProvider = new GoogleAuthProvider();

export async function firebaseSignIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return { uid: cred.user.uid, token: await cred.user.getIdToken() };
}

export async function firebaseSignUp(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return { uid: cred.user.uid, token: await cred.user.getIdToken() };
}

export async function googleAuth() {
  const cred = await signInWithPopup(auth, googleProvider);
  const isNew =
    cred.user.metadata.creationTime === cred.user.metadata.lastSignInTime;
  return { uid: cred.user.uid, token: await cred.user.getIdToken(), isNew };
}

export async function signOutUser() {
  await signOut(auth);
}