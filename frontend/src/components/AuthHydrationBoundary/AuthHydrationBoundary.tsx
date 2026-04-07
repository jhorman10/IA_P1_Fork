"use client";

// SPEC-006: AuthHydrationBoundary — blocks render until auth state + profile resolve.
// Prevents flash of unauthenticated content on protected routes while
// onAuthStateChanged (Firebase) and profile resolution are in-flight.
import { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";

import styles from "./AuthHydrationBoundary.module.css";

interface AuthHydrationBoundaryProps {
  children: ReactNode;
  /** Optional custom UI rendered while auth is loading. */
  fallback?: ReactNode;
}

/**
 * Renders `children` only after auth state and profile have fully resolved.
 *
 * Place this component at the root of each protected section of the app
 * (e.g. admin layout, doctor layout) to prevent blank-then-content flashes.
 *
 * @example
 * ```tsx
 * <AuthHydrationBoundary>
 *   <AdminPages />
 * </AuthHydrationBoundary>
 * ```
 */
export default function AuthHydrationBoundary({
  children,
  fallback,
}: AuthHydrationBoundaryProps) {
  const { loading } = useAuth();

  if (loading) {
    if (fallback !== undefined) return <>{fallback}</>;

    return (
      <div className={styles.container} data-testid="auth-hydration-loading">
        <div className={styles.spinner} />
      </div>
    );
  }

  return <>{children}</>;
}
