"use client";

// SPEC-004: useRoleGuard — resolves per-route role permissions and redirects
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { UserRole } from "@/domain/Profile";

import { useAuth } from "./useAuth";

export interface UseRoleGuardReturn {
  allowed: boolean;
  redirectTo: string;
}

export function useRoleGuard(allowedRoles: UserRole[]): UseRoleGuardReturn {
  const { profile, loading } = useAuth();
  const router = useRouter();

  const isAllowed =
    !loading && !!profile && allowedRoles.includes(profile.role);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
    }
  }, [loading, profile, router]);

  return {
    allowed: isAllowed,
    redirectTo: "/login",
  };
}
