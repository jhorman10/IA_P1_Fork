"use client";

// SPEC-004: AuthProvider — single source of truth for auth state
// `signOut` is imported dynamically inside the error handler so that
// importing this file never statically pulls in firebase/auth's Node.js bundle
// (which requires `fetch` at module-init time and would break SSR / jsdom tests).
import type { User } from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { firebaseAuth } from "@/config/firebase";
import { Profile } from "@/domain/Profile";
import { resolveSession } from "@/services/authService";

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  token: null,
  loading: true,
  authError: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    token: null,
    loading: true,
    authError: null,
  });

  useEffect(() => {
    // firebaseAuth is null when Firebase env vars are absent (SSR / test env).
    // In that case resolve immediately to "not authenticated".
    if (!firebaseAuth) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (!user) {
        setState({
          user: null,
          profile: null,
          token: null,
          loading: false,
          authError: null,
        });
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));

      user
        .getIdToken()
        .then((idToken) =>
          resolveSession(idToken).then((profile) => ({ idToken, profile })),
        )
        .then(({ idToken, profile }) => {
          setState({
            user,
            profile,
            token: idToken,
            loading: false,
            authError: null,
          });
        })
        .catch(async (err) => {
          // Dynamic import keeps firebase/auth out of the module-eval critical
          // path — it is only loaded when an actual sign-out is needed.
          const { signOut } = await import("firebase/auth");
          await signOut(firebaseAuth).catch(() => {});
          const message =
            err instanceof Error
              ? err.message
              : "Error al verificar el perfil operativo";
          setState({
            user: null,
            profile: null,
            token: null,
            loading: false,
            authError: message,
          });
        });
    });

    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState {
  return useContext(AuthContext);
}
