"use client";

// SPEC-004: RoleGate — visual gating component for role-based access
import { ReactNode } from "react";

import { UserRole } from "@/domain/Profile";
import { useAuth } from "@/hooks/useAuth";

import styles from "./RoleGate.module.css";

interface RoleGateProps {
  roles: UserRole[];
  /** Optional fallback content when access is denied */
  fallback?: ReactNode;
  children: ReactNode;
}

export default function RoleGate({ roles, fallback, children }: RoleGateProps) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile || !roles.includes(profile.role)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div
        className={styles.blocked}
        role="alert"
        data-testid="role-gate-blocked"
      >
        <p className={styles.message}>
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
