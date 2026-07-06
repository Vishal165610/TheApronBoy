import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

type AdminClaimState = {
  adminUser: User | null;
  isAdmin: boolean;
  loading: boolean;
};

// Separate from the student `useAuth()` context on purpose: this checks the
// `admin` custom claim on the ID token, which is the actual authorization
// boundary between a student session and an admin session — not just "is
// someone logged in." A logged-in student will have adminUser set but
// isAdmin: false.
export function useAdminClaim(): AdminClaimState {
  const [state, setState] = useState<AdminClaimState>({
    adminUser: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ adminUser: null, isAdmin: false, loading: false });
        return;
      }
      const tokenResult = await user.getIdTokenResult();
      setState({ adminUser: user, isAdmin: tokenResult.claims.admin === true, loading: false });
    });
    return unsubscribe;
  }, []);

  return state;
}