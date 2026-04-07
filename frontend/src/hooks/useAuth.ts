"use client";

// SPEC-004: useAuth — single source of truth for auth consumption
import type { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useAuthContext } from "@/context/AuthProvider";
import { Profile } from "@/domain/Profile";
import {
  signInWithFirebase,
  signOutFromFirebase,
} from "@/services/authService";

export interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { user, profile, token, loading, authError } = useAuthContext();
  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    await signInWithFirebase(email, password);
    // onAuthStateChanged in AuthProvider handles profile resolution automatically
  }, []);

  const logout = useCallback(async () => {
    await signOutFromFirebase();
    router.push("/login");
  }, [router]);

  return { user, profile, token, loading, authError, login, logout };
}
