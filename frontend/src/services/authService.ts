// SPEC-004: Auth service — Firebase signIn + backend session resolution
// firebase/auth functions are imported dynamically inside each async function
// so that importing this module does not statically pull in firebase/auth's
// Node.js bundle (which requires `fetch` at module-init time and would break
// SSR / jsdom tests that don't mock authService).
import type { User } from "firebase/auth";

import { env } from "@/config/env";
import { firebaseAuth } from "@/config/firebase";
import { Profile } from "@/domain/Profile";

export type SessionResponse = Profile;

export async function signInWithFirebase(
  email: string,
  password: string,
): Promise<User> {
  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    email,
    password,
  );
  return credential.user;
}

export async function signOutFromFirebase(): Promise<void> {
  const { signOut } = await import("firebase/auth");
  await signOut(firebaseAuth);
}

export async function resolveSession(
  idToken: string,
): Promise<SessionResponse> {
  const res = await fetch(`${env.API_BASE_URL}/auth/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      body?.message ?? `HTTP_ERROR: ${res.status}`,
    ) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}
